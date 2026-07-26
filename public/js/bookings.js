(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-booking-filters]');
  const form = document.querySelector('[data-booking-status-form]');
  const rows = document.querySelector('[data-booking-rows]');
  const empty = document.querySelector('[data-booking-empty]');
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

  const selectBooking = (booking) => {
    selectedBooking = booking;
    form.elements.id.value = booking.id;
    form.elements.status.value = booking.status === 'CONFIRMED' ? 'COMPLETED' : 'CANCELLED';
    form.elements.status.focus();
  };

  const renderBooking = (booking) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(booking.reference),
      admin.cell(booking.memberId),
      admin.cell(booking.tourId),
      admin.cell(booking.departureId),
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
    if (!window.confirm(`Set this booking to ${raw.status}?`)) return;
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
