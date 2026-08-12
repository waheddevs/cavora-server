(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-departure-form]');
  const filters = document.querySelector('[data-departure-filters]');
  const rows = document.querySelector('[data-departure-rows]');
  const empty = document.querySelector('[data-departure-empty]');
  const editor = document.querySelector('[data-departure-editor]');
  const editorToggle = document.querySelector('[data-departure-editor-toggle]');
  if (
    !admin ||
    !(form instanceof HTMLFormElement) ||
    !(filters instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupDisclosure('[data-departure-editor-toggle]', '[data-departure-editor]');
  admin.setupFilterReset('[data-departure-filters]');
  admin.setupValidation(form);
  admin.setupValidation(filters);
  let departures = [];
  let selectedDeparture;

  const setField = (name, value) => {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) {
      field.value = value ?? '';
    }
  };

  const editDeparture = (departure) => {
    selectedDeparture = departure;
    form.dataset.editId = departure.id;
    setField('tourId', departure.tourId);
    setField('startDate', String(departure.startDate).slice(0, 10));
    setField('status', departure.status);
    setField('capacity', departure.capacity);
    setField('priceCents', departure.priceCents);
    setField('currency', departure.currency);
    const tourId = form.elements.namedItem('tourId');
    if (tourId instanceof HTMLInputElement) tourId.disabled = true;
    if (editor instanceof HTMLElement) {
      if (editor.hidden && editorToggle instanceof HTMLButtonElement) editorToggle.click();
      admin.revealPanel(editor);
    }
  };

  const renderDeparture = (departure) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(departure.id),
      admin.cell(departure.tourId),
      admin.cell(admin.formatDate(departure.startDate, true)),
      admin.cell(departure.capacity),
      admin.cell(departure.reservedSeats),
      admin.cell(Math.max(departure.capacity - departure.reservedSeats, 0)),
      admin.cell(admin.formatMoney(departure.priceCents, departure.currency)),
    );
    const status = admin.cell();
    status.append(admin.badge(departure.status));
    const actions = admin.actionsCell(
      admin.actionButton('Edit', () => editDeparture(departure)),
      admin.deleteButton({
        endpoint: `/cavora/admin/departures/${departure.id}`,
        notice: 'Departure deleted.',
        onDone: load,
        text: 'Every booking on this departure, and its payments, are removed too.',
        title: 'Delete this departure?',
      }),
    );
    row.append(status, actions);
    return row;
  };

  const load = async () => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/departures', filters));
      departures = payload.data ?? [];
      admin.renderRows(rows, empty, departures, renderDeparture);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load();
  });

  form.addEventListener('reset', () => {
    delete form.dataset.editId;
    selectedDeparture = undefined;
    const tourId = form.elements.namedItem('tourId');
    if (tourId instanceof HTMLInputElement) tourId.disabled = false;
    admin.feedback(form);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors = [];
    if (selectedDeparture && Number(raw.capacity) < Number(selectedDeparture.reservedSeats)) {
      errors.push({
        name: 'capacity',
        message: `Capacity cannot be lower than ${selectedDeparture.reservedSeats} reserved seats.`,
      });
    }
    if (!admin.validateForm(form, errors)) return;
    const body = {
      startDate: raw.startDate,
      capacity: Number(raw.capacity),
      priceCents: Number(raw.priceCents),
      currency: String(raw.currency).toUpperCase(),
      status: raw.status,
    };
    admin.setBusy(form, true);
    try {
      const editId = form.dataset.editId;
      if (editId) {
        await admin.request(`/cavora/admin/departures/${editId}`, { method: 'PATCH', body });
      } else {
        await admin.request(`/cavora/admin/tours/${raw.tourId}/departures`, {
          method: 'POST',
          body,
        });
      }
      admin.notify(editId ? 'Departure updated.' : 'Departure created.', 'success');
      form.reset();
      await load();
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
