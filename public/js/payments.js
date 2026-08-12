(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-payment-filters]');
  const form = document.querySelector('[data-refund-form]');
  const rows = document.querySelector('[data-payment-rows]');
  const empty = document.querySelector('[data-payment-empty]');
  const editor = document.querySelector('[data-payment-editor]');
  const selectedBadge = document.querySelector('[data-payment-selected-badge]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-payment-filters]');
  admin.setupValidation(filters);
  admin.setupValidation(form);
  let currentPage = 1;
  let selectedPayment;

  const setDetail = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(value || '—');
  };

  const setEditorOpen = (isOpen) => {
    admin.setPanelOpen(editor, isOpen);
  };

  const clearSelection = () => {
    selectedPayment = undefined;
    form.reset();
    admin.clearValidation(form);
    admin.feedback(form);
    setEditorOpen(false);
  };

  const selectPayment = (payment) => {
    selectedPayment = payment;
    form.elements.id.value = payment.id;
    form.elements.amountCents.value = '';
    form.elements.idempotencyKey.value = `refund-${payment.id}-${window.crypto.randomUUID()}`;

    const money = (cents) => admin.formatMoney(cents, payment.currency);
    const remaining = (payment.amountCents ?? 0) - (payment.refundedAmountCents ?? 0);
    setDetail('[data-payment-detail-id]', payment.id);
    setDetail('[data-payment-detail-booking]', payment.bookingId);
    setDetail('[data-payment-detail-provider]', payment.providerIntentId);
    setDetail('[data-payment-detail-amount]', money(payment.amountCents));
    setDetail('[data-payment-detail-refunded]', money(payment.refundedAmountCents));
    setDetail('[data-payment-detail-remaining]', money(Math.max(remaining, 0)));
    setDetail('[data-payment-detail-status]', String(payment.status ?? '').replaceAll('_', ' '));
    setDetail('[data-payment-detail-updated]', admin.formatDate(payment.updatedAt));
    if (selectedBadge instanceof HTMLElement) {
      selectedBadge.textContent = admin.shortId(payment.id);
    }

    admin.feedback(form);
    setEditorOpen(true);
    form.elements.amountCents.focus();
  };

  const renderPayment = (payment) => {
    const row = document.createElement('tr');
    // Payment/booking ids and the refunded total ride along as muted detail
    // lines; as their own columns they pushed the table into a side-scroll.
    const refunded = admin.formatMoney(payment.refundedAmountCents, payment.currency);
    const provider = admin.cell(admin.shortId(payment.providerIntentId));
    provider.title = payment.providerIntentId ?? '';
    row.append(
      admin.cellStack(
        `Payment ${admin.shortId(payment.id)}`,
        `Booking ${admin.shortId(payment.bookingId)}`,
        payment.bookingId,
      ),
      provider,
      admin.cellStack(
        admin.formatMoney(payment.amountCents, payment.currency),
        payment.refundedAmountCents ? `${refunded} refunded` : '',
      ),
    );
    const status = admin.cell();
    status.append(admin.badge(payment.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Refund', () => selectPayment(payment), 'danger'));
    row.append(status, admin.cell(admin.formatDate(payment.updatedAt)), actions);
    return row;
  };

  const updateSummary = (data) => {
    document
      .querySelector('[data-payment-succeeded]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'SUCCEEDED').length));
    document
      .querySelector('[data-payment-processing]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'PROCESSING').length));
    document
      .querySelector('[data-payment-refunds]')
      ?.replaceChildren(
        String(
          data.filter((item) =>
            ['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(item.status),
          ).length,
        ),
      );
  };

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/payments', filters, page));
      const data = payload.data ?? [];
      admin.renderRows(rows, empty, data, renderPayment);
      admin.setPagination(payload.meta, load);
      updateSummary(data);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load(1);
  });

  document.querySelector('[data-payment-clear]')?.addEventListener('click', clearSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors = [];
    if (selectedPayment?.id === raw.id) {
      const remaining =
        selectedPayment.amountCents -
        selectedPayment.refundedAmountCents -
        selectedPayment.pendingRefundAmountCents;
      if (!['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'].includes(selectedPayment.status)) {
        errors.push({ name: 'id', message: 'This payment status cannot be refunded.' });
      } else if (remaining <= 0) {
        errors.push({ name: 'amountCents', message: 'This payment has no refundable balance.' });
      } else if (raw.amountCents && Number(raw.amountCents) > remaining) {
        errors.push({
          name: 'amountCents',
          message: `The maximum remaining refund is ${remaining} minor units.`,
        });
      }
    }
    if (!admin.validateForm(form, errors)) return;
    const amountLabel = raw.amountCents ? `${raw.amountCents} minor units` : 'the full balance';
    const confirmed = await admin.confirm({
      title: `Refund ${amountLabel}?`,
      text: 'This sends a refund request to Stripe and cannot be undone here.',
      confirmText: 'Refund',
      danger: true,
    });
    if (!confirmed) return;
    const body = raw.amountCents ? { amountCents: Number(raw.amountCents) } : {};
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/payments/${raw.id}/refunds`, {
        method: 'POST',
        headers: { 'idempotency-key': raw.idempotencyKey },
        body,
      });
      admin.feedback(form, 'Refund request accepted.', 'success');
      admin.notify('Refund request accepted.', 'success');
      await load(currentPage);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
