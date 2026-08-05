(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-tour-form]');
  const filters = document.querySelector('[data-tour-filters]');
  const rows = document.querySelector('[data-tour-rows]');
  const empty = document.querySelector('[data-tour-empty]');
  const editor = document.querySelector('[data-tour-editor]');
  const editorToggle = document.querySelector('[data-tour-editor-toggle]');
  const tourImageInput = form?.querySelector('[data-tour-image-file]');
  const tourImagePreviewList = form?.querySelector('[data-tour-image-preview-list]');
  const tourImagePreviewGrid = form?.querySelector('[data-tour-image-preview-grid]');
  const tourImagePreviewCount = form?.querySelector('[data-tour-image-preview-count]');
  const itineraryList = form?.querySelector('[data-itinerary-list]');
  const itineraryAddButton = form?.querySelector('[data-itinerary-add]');
  if (
    !admin ||
    !(form instanceof HTMLFormElement) ||
    !(filters instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement) ||
    !(tourImageInput instanceof HTMLInputElement) ||
    !(tourImagePreviewList instanceof HTMLElement) ||
    !(tourImagePreviewGrid instanceof HTMLElement) ||
    !(tourImagePreviewCount instanceof HTMLElement) ||
    !(itineraryList instanceof HTMLElement) ||
    !(itineraryAddButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  admin.setupDisclosure('[data-tour-editor-toggle]', '[data-tour-editor]');
  admin.setupFilterReset('[data-tour-filters]');
  admin.setupValidation(form);
  admin.setupValidation(filters);

  const tourImageUpload = tourImageInput.closest('[data-image-upload]');
  const tourImageDropzone = tourImageUpload?.querySelector('[data-image-upload-dropzone]');
  const tourImageHelp = document.querySelector(`#${tourImageInput.id}-help`);
  const defaultTourImageHelp = tourImageHelp?.textContent?.trim() ?? '';
  let tourImagePreviewUrls = [];
  let existingTourImages = [];

  const releaseTourImagePreviews = () => {
    for (const url of tourImagePreviewUrls) window.URL.revokeObjectURL(url);
    tourImagePreviewUrls = [];
  };

  const formatImageSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const imageNameFromUrl = (url) => {
    const path = String(url ?? '').split(/[?#]/)[0];
    return path.split('/').filter(Boolean).pop() ?? 'Saved image';
  };

  const setTourImageCapacity = (existingCount) => {
    const remaining = Math.max(0, 4 - existingCount);
    tourImageInput.dataset.maxFiles = String(remaining);
    tourImageInput.disabled = remaining === 0;
    if (tourImageDropzone instanceof HTMLButtonElement) {
      tourImageDropzone.disabled = remaining === 0;
    }
    if (tourImageHelp instanceof HTMLElement) {
      tourImageHelp.textContent =
        remaining === 0
          ? 'This tour already has the maximum of 4 images.'
          : existingCount === 0
            ? defaultTourImageHelp
            : `You can add ${remaining} more image${remaining === 1 ? '' : 's'} to this tour.`;
    }
  };

  const renderTourImagePreviews = () => {
    const files = Array.from(tourImageInput.files ?? []);
    releaseTourImagePreviews();
    tourImagePreviewGrid.replaceChildren();
    const totalImages = existingTourImages.length + files.length;
    tourImagePreviewList.hidden = totalImages === 0;
    tourImagePreviewCount.textContent = `${totalImages} of 4 images (${existingTourImages.length} saved, ${files.length} new)`;
    const addButton = form.querySelector('[data-tour-images-change]');
    const maximumFiles = Math.max(0, Number(tourImageInput.dataset.maxFiles) || 0);
    if (addButton instanceof HTMLButtonElement) {
      addButton.disabled = maximumFiles === 0 || files.length >= maximumFiles;
    }

    for (const image of existingTourImages) {
      const card = document.createElement('article');
      card.className = 'tour-image-preview-card';
      const thumbnail = document.createElement('img');
      thumbnail.src = image.url;
      thumbnail.alt = `Saved tour image ${image.position + 1}`;
      const fileDetails = document.createElement('div');
      fileDetails.className = 'tour-image-preview-card__file';
      const fileName = document.createElement('strong');
      fileName.textContent = imageNameFromUrl(image.url);
      const fileStatus = document.createElement('small');
      fileStatus.textContent = 'Saved image';
      fileDetails.append(fileName, fileStatus);
      const position = document.createElement('span');
      position.className = 'tour-image-preview-card__position';
      position.textContent = String(image.position + 1);
      const removeButton = document.createElement('button');
      removeButton.className = 'button button--small tour-image-preview-card__remove';
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', async () => {
        const editId = form.dataset.editId;
        if (!editId || !window.confirm('Remove this saved tour image?')) return;
        removeButton.disabled = true;
        try {
          await admin.request(`/cavora/admin/tours/${editId}/images/${image.position}`, {
            method: 'DELETE',
          });
          existingTourImages = existingTourImages.filter(
            (savedImage) => savedImage.position !== image.position,
          );
          setTourImageCapacity(existingTourImages.length);
          renderTourImagePreviews();
          admin.notify('Tour image removed.', 'success');
        } catch (error) {
          admin.reportError(error, form);
          removeButton.disabled = false;
        }
      });
      card.append(thumbnail, fileDetails, position, removeButton);
      tourImagePreviewGrid.append(card);
    }

    files.forEach((file, index) => {
      const card = document.createElement('article');
      card.className = 'tour-image-preview-card';
      const thumbnail = document.createElement('img');
      const previewUrl = window.URL.createObjectURL(file);
      tourImagePreviewUrls.push(previewUrl);
      thumbnail.src = previewUrl;
      thumbnail.alt = `Preview of ${file.name}`;
      const fileDetails = document.createElement('div');
      fileDetails.className = 'tour-image-preview-card__file';
      const fileName = document.createElement('strong');
      fileName.textContent = file.name;
      const fileSize = document.createElement('small');
      fileSize.textContent = formatImageSize(file.size);
      fileDetails.append(fileName, fileSize);
      const position = document.createElement('span');
      position.className = 'tour-image-preview-card__position';
      position.textContent = String(existingTourImages.length + index + 1);
      const removeButton = document.createElement('button');
      removeButton.className = 'button button--small tour-image-preview-card__remove';
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        setTourImageFiles(files.filter((_selectedFile, fileIndex) => fileIndex !== index));
      });
      card.append(thumbnail, fileDetails, position, removeButton);
      tourImagePreviewGrid.append(card);
    });
  };

  const setTourImageFiles = (files) => {
    const transfer = new window.DataTransfer();
    for (const file of files) transfer.items.add(file);
    tourImageInput.files = transfer.files;
    tourImageInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  const tourImageFileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`;

  tourImageInput.addEventListener('change', renderTourImagePreviews);
  form.querySelector('[data-tour-images-change]')?.addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = tourImageInput.accept;
    picker.multiple = true;
    picker.addEventListener('change', () => {
      const currentFiles = Array.from(tourImageInput.files ?? []);
      const selectedFiles = Array.from(picker.files ?? []);
      const knownFiles = new Set(currentFiles.map(tourImageFileKey));
      const newFiles = selectedFiles.filter((file) => !knownFiles.has(tourImageFileKey(file)));
      const mergedFiles = [...currentFiles, ...newFiles];
      const maximumFiles = Math.max(0, Number(tourImageInput.dataset.maxFiles) || 0);
      if (mergedFiles.length > maximumFiles) {
        admin.notify(
          `You can select up to ${maximumFiles} image${maximumFiles === 1 ? '' : 's'}.`,
          'error',
        );
        return;
      }
      setTourImageFiles(mergedFiles);
    });
    picker.click();
  });
  form.querySelector('[data-tour-images-remove]')?.addEventListener('click', () => {
    setTourImageFiles([]);
  });

  const validateList = (raw, name, label) => {
    const result = admin.validationRules.lineList(raw[name]);
    return result.error ? { name, message: `${label}: ${result.error}` } : undefined;
  };

  let itineraryRowId = 0;

  const addItineraryRow = (item = {}) => {
    const existingRows = itineraryList.querySelectorAll('[data-itinerary-row]').length;
    if (existingRows >= 100) {
      admin.notify('An itinerary can contain up to 100 days.', 'error');
      return;
    }
    const rowId = itineraryRowId++;
    const row = document.createElement('article');
    row.className = 'itinerary-day';
    row.dataset.itineraryRow = String(rowId);

    const heading = document.createElement('div');
    heading.className = 'itinerary-day__heading';
    const title = document.createElement('strong');
    const defaultDay = existingRows + 1;
    title.textContent = `Day ${item.day ?? defaultDay}`;
    const removeButton = document.createElement('button');
    removeButton.className = 'button button--small';
    removeButton.type = 'button';
    removeButton.textContent = 'Remove day';
    removeButton.addEventListener('click', () => {
      row.remove();
      if (!itineraryList.querySelector('[data-itinerary-row]')) renderItinerary([]);
    });
    heading.append(title, removeButton);

    const fields = document.createElement('div');
    fields.className = 'itinerary-day__fields';

    const dayField = document.createElement('label');
    dayField.className = 'field itinerary-day__number';
    dayField.innerHTML = `<span>Day number</span><input type="number" name="itineraryDay-${rowId}" min="1" step="1" />`;
    const dayInput = dayField.querySelector('input');
    dayInput.value = item.day ?? defaultDay;
    dayInput.addEventListener('input', () => {
      title.textContent = dayInput.value ? `Day ${dayInput.value}` : 'Itinerary day';
    });

    const titleField = document.createElement('label');
    titleField.className = 'field';
    titleField.innerHTML = `<span>Title</span><input type="text" name="itineraryTitle-${rowId}" maxlength="160" placeholder="For example: Arrival and hotel check-in" />`;
    titleField.querySelector('input').value = item.title ?? '';

    const descriptionField = document.createElement('label');
    descriptionField.className = 'field itinerary-day__description';
    descriptionField.innerHTML = `<span>Description</span><textarea name="itineraryDescription-${rowId}" maxlength="5000" placeholder="Describe the activities planned for this day"></textarea>`;
    descriptionField.querySelector('textarea').value = item.description ?? '';

    fields.append(dayField, titleField, descriptionField);
    row.append(heading, fields);
    itineraryList.querySelector('[data-itinerary-empty]')?.remove();
    itineraryList.append(row);
  };

  const renderItinerary = (items) => {
    itineraryList.replaceChildren();
    for (const item of items) addItineraryRow(item);
    if (!items.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'itinerary-builder__empty';
      emptyMessage.dataset.itineraryEmpty = '';
      emptyMessage.textContent = 'No itinerary days added yet.';
      itineraryList.append(emptyMessage);
    }
  };

  const readItinerary = () => {
    const itinerary = [];
    const errors = [];
    const usedDays = new Set();
    for (const row of itineraryList.querySelectorAll('[data-itinerary-row]')) {
      const dayInput = row.querySelector('[name^="itineraryDay-"]');
      const titleInput = row.querySelector('[name^="itineraryTitle-"]');
      const descriptionInput = row.querySelector('[name^="itineraryDescription-"]');
      if (
        !(dayInput instanceof HTMLInputElement) ||
        !(titleInput instanceof HTMLInputElement) ||
        !(descriptionInput instanceof HTMLElement) ||
        !('value' in descriptionInput)
      ) {
        continue;
      }
      const day = Number(dayInput.value);
      const itemTitle = titleInput.value.trim();
      const description = descriptionInput.value.trim();
      if (!Number.isInteger(day) || day < 1) {
        errors.push({ name: dayInput.name, message: 'Enter a valid day number.' });
      } else if (usedDays.has(day)) {
        errors.push({ name: dayInput.name, message: 'Each day number must be unique.' });
      } else {
        usedDays.add(day);
      }
      if (!itemTitle)
        errors.push({ name: titleInput.name, message: 'Enter a title for this day.' });
      if (!description) {
        errors.push({
          name: descriptionInput.name,
          message: 'Describe the activities for this day.',
        });
      }
      itinerary.push({ day, title: itemTitle, description });
    }
    return { errors, itinerary };
  };

  itineraryAddButton.addEventListener('click', () => addItineraryRow());
  renderItinerary([]);

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
      renderItinerary(Array.isArray(tour.itinerary) ? tour.itinerary : []);
      const idField = form.elements.namedItem('id');
      if (idField instanceof HTMLInputElement) idField.disabled = true;
      existingTourImages = Array.isArray(tour.images) ? tour.images : [];
      tourImageInput.value = '';
      tourImageInput.dispatchEvent(new window.Event('change', { bubbles: true }));
      setTourImageCapacity(existingTourImages.length);
      renderTourImagePreviews();
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
    existingTourImages = [];
    const idField = form.elements.namedItem('id');
    if (idField instanceof HTMLInputElement) idField.disabled = false;
    setTourImageCapacity(0);
    admin.feedback(form);
    window.setTimeout(() => {
      renderTourImagePreviews();
      renderItinerary([]);
    }, 0);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const itineraryResult = readItinerary();
    const errors = [...itineraryResult.errors];
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
    const imageFiles = Array.from(tourImageInput.files ?? []);
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

      for (const [index, imageFile] of imageFiles.entries()) {
        const imageBody = new FormData();
        imageBody.append('image', imageFile);
        imageBody.append('altText', `${raw.title} image ${existingTourImages.length + index + 1}`);
        await admin.request(`/cavora/admin/tours/${editId ?? Number(raw.id)}/images`, {
          method: 'POST',
          body: imageBody,
        });
      }

      admin.notify(
        `${editId ? 'Tour updated' : 'Tour created'}${imageFiles.length ? ` with ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}` : ''}.`,
        'success',
      );
      form.reset();
      await load(1);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
