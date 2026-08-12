(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-booking-filters]');
  const form = document.querySelector('[data-booking-status-form]');
  const rows = document.querySelector('[data-booking-rows]');
  const empty = document.querySelector('[data-booking-empty]');
  const editor = document.querySelector('[data-booking-editor]');
  const selectedBadge = document.querySelector('[data-booking-selected-badge]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-booking-filters]');
  admin.setupValidation(filters);
  admin.setupValidation(form);
  let currentPage = 1;
  let selectedBooking;

  const setDetail = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(value || '—');
  };

  const setEditorOpen = (isOpen) => {
    admin.setPanelOpen(editor, isOpen);
  };

  const clearSelection = () => {
    selectedBooking = undefined;
    form.reset();
    admin.clearValidation(form);
    admin.feedback(form);
    setEditorOpen(false);
  };

  const selectBooking = (booking) => {
    selectedBooking = booking;
    form.elements.id.value = booking.id;
    form.elements.status.value = booking.status === 'CONFIRMED' ? 'COMPLETED' : 'CANCELLED';
    setDetail('[data-booking-detail-reference]', booking.reference);
    setDetail('[data-booking-detail-member]', booking.memberId);
    setDetail('[data-booking-detail-tour]', `Tour #${booking.tourId}`);
    setDetail('[data-booking-detail-departure]', booking.departureId);
    setDetail('[data-booking-detail-travelers]', String(booking.travelers ?? '—'));
    setDetail(
      '[data-booking-detail-total]',
      admin.formatMoney(booking.totalCents, booking.currency),
    );
    setDetail('[data-booking-detail-status]', String(booking.status ?? '').replaceAll('_', ' '));
    setDetail('[data-booking-detail-created]', admin.formatDate(booking.createdAt));
    if (selectedBadge instanceof HTMLElement) selectedBadge.textContent = booking.reference;
    admin.feedback(form);
    setEditorOpen(true);
    form.elements.status.focus();
  };

  const renderBooking = (booking) => {
    const row = document.createElement('tr');
    // The member and departure object ids are folded into the two lead cells
    // as muted detail lines; at full length they forced horizontal scroll.
    row.append(
      admin.cellStack(
        booking.reference,
        `Member ${admin.shortId(booking.memberId)}`,
        booking.memberId,
      ),
      admin.cellStack(
        `Tour #${booking.tourId}`,
        `Departure ${admin.shortId(booking.departureId)}`,
        booking.departureId,
      ),
      admin.cell(booking.travelers),
      admin.cell(admin.formatMoney(booking.totalCents, booking.currency)),
    );
    const status = admin.cell();
    status.append(admin.badge(booking.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Select', () => selectBooking(booking)));
    row.append(status, actions);
    return row;
  };

  const updateSummary = (data) => {
    document
      .querySelector('[data-booking-confirmed]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'CONFIRMED').length));
    document
      .querySelector('[data-booking-cancellations]')
      ?.replaceChildren(
        String(data.filter((item) => item.status === 'CANCELLATION_REQUESTED').length),
      );
    document
      .querySelector('[data-booking-pending]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'PENDING_PAYMENT').length));
  };

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/bookings', filters, page));
      const data = payload.data ?? [];
      admin.renderRows(rows, empty, data, renderBooking);
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

  document.querySelector('[data-booking-clear]')?.addEventListener('click', clearSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors = [];
    if (selectedBooking?.id === raw.id) {
      if (raw.status === 'COMPLETED' && selectedBooking.status !== 'CONFIRMED') {
        errors.push({ name: 'status', message: 'Only a confirmed booking can be completed.' });
      }
      if (raw.status === 'CANCELLED' && selectedBooking.status !== 'PENDING_PAYMENT') {
        errors.push({
          name: 'status',
          message: 'Only a pending-payment booking can be cancelled without a refund.',
        });
      }
    }
    if (!admin.validateForm(form, errors)) return;
    const confirmed = await admin.confirm({
      title: `Set this booking to ${raw.status}?`,
      text: 'The customer sees the new state immediately.',
      danger: raw.status === 'CANCELLED',
    });
    if (!confirmed) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/bookings/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Booking status updated.', 'success');
      admin.notify('Booking status updated.', 'success');
      await load(currentPage);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
