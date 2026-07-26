(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-payment-filters]');
  const form = document.querySelector('[data-refund-form]');
  const rows = document.querySelector('[data-payment-rows]');
  const empty = document.querySelector('[data-payment-empty]');
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

  const selectPayment = (payment) => {
    selectedPayment = payment;
    form.elements.id.value = payment.id;
    form.elements.amountCents.value = '';
    form.elements.idempotencyKey.value = `refund-${payment.id}-${window.crypto.randomUUID()}`;
    form.elements.amountCents.focus();
  };

  const renderPayment = (payment) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(payment.id),
      admin.cell(payment.bookingId),
      admin.cell(payment.providerIntentId),
      admin.cell(admin.formatMoney(payment.amountCents, payment.currency)),
      admin.cell(admin.formatMoney(payment.refundedAmountCents, payment.currency)),
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
    if (!window.confirm(`Refund ${amountLabel}? This sends a request to Stripe.`)) return;
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
