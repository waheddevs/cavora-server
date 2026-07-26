(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-tour-form]');
  const imageForm = document.querySelector('[data-tour-image-form]');
  const filters = document.querySelector('[data-tour-filters]');
  const rows = document.querySelector('[data-tour-rows]');
  const empty = document.querySelector('[data-tour-empty]');
  const editor = document.querySelector('[data-tour-editor]');
  const editorToggle = document.querySelector('[data-tour-editor-toggle]');
  if (
    !admin ||
    !(form instanceof HTMLFormElement) ||
    !(imageForm instanceof HTMLFormElement) ||
    !(filters instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupDisclosure('[data-tour-editor-toggle]', '[data-tour-editor]');
  admin.setupFilterReset('[data-tour-filters]');
  admin.setupValidation(form);
  admin.setupValidation(imageForm);
  admin.setupValidation(filters);

  const validateList = (raw, name, label) => {
    const result = admin.validationRules.lineList(raw[name]);
    return result.error ? { name, message: `${label}: ${result.error}` } : undefined;
  };

  const bodyFromForm = (raw, itinerary, lists) => {
    const body = {
      slug: raw.slug,
      country: raw.country,
      place: raw.place,
      title: raw.title,
      location: raw.location,
      type: raw.type,
      priceCents: Number(raw.priceCents),
      currency: String(raw.currency).toUpperCase(),
      ratingAverage: Number(raw.ratingAverage),
      reviewCount: Number(raw.reviewCount),
      durationDays: Number(raw.durationDays),
      maxGroupSize: Number(raw.maxGroupSize),
      overview: raw.overview,
      highlights: lists.highlights,
      itinerary,
      included: lists.included,
      notIncluded: lists.notIncluded,
      status: raw.status,
    };
    if (raw.oldPriceCents !== '') body.oldPriceCents = Number(raw.oldPriceCents);
    return body;
  };

  const setField = (name, value) => {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) {
      field.value = value ?? '';
    }
  };

  const openEditor = () => {
    if (
      editor instanceof HTMLElement &&
      editor.hidden &&
      editorToggle instanceof HTMLButtonElement
    ) {
      editorToggle.click();
    }
  };

  const editTour = async (id) => {
    try {
      const tour = (await admin.request(`/cavora/admin/tours/${id}`))?.data;
      if (!tour) return;
      form.dataset.editId = String(id);
      for (const name of [
        'slug',
        'country',
        'place',
        'title',
        'location',
        'type',
        'priceCents',
        'oldPriceCents',
        'currency',
        'ratingAverage',
        'reviewCount',
        'durationDays',
        'maxGroupSize',
        'overview',
        'status',
      ]) {
        setField(name, tour[name]);
      }
      setField('id', tour.id);
      setField('highlights', (tour.highlights ?? []).join('\n'));
      setField('included', (tour.included ?? []).join('\n'));
      setField('notIncluded', (tour.notIncluded ?? []).join('\n'));
      setField('itinerary', JSON.stringify(tour.itinerary ?? [], null, 2));
      const idField = form.elements.namedItem('id');
      if (idField instanceof HTMLInputElement) idField.disabled = true;
      const firstImage = tour.images?.[0];
      if (firstImage) {
        imageForm.elements.tourId.value = tour.id;
        imageForm.elements.position.value = firstImage.position;
        imageForm.elements.url.value = firstImage.url;
        imageForm.elements.altText.value = firstImage.altText;
      }
      openEditor();
      form.querySelector('[name="title"]')?.focus();
    } catch (error) {
      admin.reportError(error, form);
    }
  };

  const renderTour = (tour) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(tour.id),
      admin.cell(tour.title),
      admin.cell(`${tour.place}, ${tour.country}`),
      admin.cell(tour.type),
      admin.cell(`${tour.durationDays} days`),
      admin.cell(admin.formatMoney(tour.priceCents, tour.currency)),
    );
    const status = admin.cell();
    status.append(admin.badge(tour.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Edit', () => void editTour(tour.id)));
    row.append(status, actions);
    return row;
  };

  const load = async (page = 1) => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/tours', filters, page));
      admin.renderRows(rows, empty, payload.data ?? [], renderTour);
      admin.setPagination(payload.meta, load);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load(1);
  });

  form.addEventListener('reset', () => {
    delete form.dataset.editId;
    const idField = form.elements.namedItem('id');
    if (idField instanceof HTMLInputElement) idField.disabled = false;
    admin.feedback(form);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const itineraryResult = admin.validationRules.tourItinerary(raw.itinerary);
    const errors = itineraryResult.error
      ? [{ name: 'itinerary', message: itineraryResult.error }]
      : [];
    const lists = {};
    for (const [name, label] of [
      ['highlights', 'Highlights'],
      ['included', 'Included items'],
      ['notIncluded', 'Not-included items'],
    ]) {
      const error = validateList(raw, name, label);
      if (error) errors.push(error);
      lists[name] = admin.validationRules.lineList(raw[name]).items;
    }
    if (!admin.validateForm(form, errors)) return;
    const body = bodyFromForm(raw, itineraryResult.itinerary, lists);
    admin.setBusy(form, true);
    admin.feedback(form);
    try {
      const editId = form.dataset.editId;
      if (editId) {
        await admin.request(`/cavora/admin/tours/${editId}`, { method: 'PATCH', body });
      } else {
        await admin.request('/cavora/admin/tours', {
          method: 'POST',
          body: { id: Number(raw.id), ...body },
        });
      }
      admin.notify(editId ? 'Tour updated.' : 'Tour created.', 'success');
      form.reset();
      await load(1);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  imageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(imageForm);
    const errors = [];
    if (raw.url && !admin.validationRules.urlOrPath(raw.url)) {
      errors.push({ name: 'url', message: 'Use a valid URL or a local path beginning with /.' });
    }
    if (!admin.validateForm(imageForm, errors)) return;
    admin.setBusy(imageForm, true);
    try {
      await admin.request(`/cavora/admin/tours/${raw.tourId}/images/${raw.position}`, {
        method: 'PUT',
        body: { url: raw.url, altText: raw.altText },
      });
      admin.feedback(imageForm, 'Image saved.', 'success');
      admin.notify('Tour image saved.', 'success');
    } catch (error) {
      admin.reportError(error, imageForm);
    } finally {
      admin.setBusy(imageForm, false);
    }
  });

  imageForm.querySelector('[data-image-delete]')?.addEventListener('click', async () => {
    const raw = admin.values(imageForm);
    admin.clearValidation(imageForm);
    const tourIdValid = /^[1-9]\d*$/.test(String(raw.tourId));
    const positionValid = /^(0|[1-9]\d*)$/.test(String(raw.position));
    if (!tourIdValid) admin.setFieldError(imageForm, 'tourId', 'Enter a positive tour ID.');
    if (!positionValid) {
      admin.setFieldError(imageForm, 'position', 'Enter a non-negative image position.');
    }
    if (!tourIdValid || !positionValid) {
      admin.feedback(imageForm, 'Check the highlighted fields.', 'error');
      return;
    }
    if (!window.confirm('Delete this positioned image?')) return;
    admin.setBusy(imageForm, true);
    try {
      await admin.request(`/cavora/admin/tours/${raw.tourId}/images/${raw.position}`, {
        method: 'DELETE',
      });
      imageForm.reset();
      admin.notify('Tour image deleted.', 'success');
    } catch (error) {
      admin.reportError(error, imageForm);
    } finally {
      admin.setBusy(imageForm, false);
    }
  });

  void load();
})();
