(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-faq-form]');
  const filters = document.querySelector('[data-faq-filters]');
  const rows = document.querySelector('[data-faq-rows]');
  const empty = document.querySelector('[data-faq-empty]');
  const editor = document.querySelector('[data-faq-editor]');
  const editorToggle = document.querySelector('[data-faq-editor-toggle]');
  const editorTitle = document.querySelector('[data-faq-editor-title]');
  const submitButton = document.querySelector('[data-faq-submit]');
  if (
    !admin ||
    !(form instanceof HTMLFormElement) ||
    !(filters instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupDisclosure('[data-faq-editor-toggle]', '[data-faq-editor]');
  admin.setupFilterReset('[data-faq-filters]');
  admin.setupValidation(form);
  admin.setupValidation(filters);

  const setField = (name, value) => {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) field.value = value ?? '';
  };

  const setEditorMode = (isEditing) => {
    if (editorTitle instanceof HTMLElement) {
      editorTitle.textContent = isEditing ? 'Edit FAQ' : 'FAQ editor';
    }
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.textContent = isEditing ? 'Update FAQ' : 'Save FAQ';
    }
  };

  const editFaq = (faq) => {
    form.dataset.editId = faq.id;
    for (const name of ['section', 'question', 'answer', 'position', 'status']) {
      setField(name, faq[name]);
    }
    setEditorMode(true);
    if (
      editor instanceof HTMLElement &&
      editor.hidden &&
      editorToggle instanceof HTMLButtonElement
    ) {
      editorToggle.click();
    }
    form.elements.namedItem('question')?.focus();
  };

  const renderFaq = (faq) => {
    const row = document.createElement('tr');
    const question = admin.cell();
    const title = document.createElement('strong');
    title.textContent = faq.question;
    const answer = document.createElement('small');
    answer.textContent = faq.answer;
    question.append(title, answer);
    const status = admin.cell();
    status.append(admin.badge(faq.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Edit', () => editFaq(faq)));
    row.append(
      question,
      admin.cell(faq.sectionTitle),
      admin.cell(String(faq.position)),
      status,
      admin.cell(admin.formatDate(faq.updatedAt)),
      actions,
    );
    return row;
  };

  const load = async (page = 1) => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/faqs', filters, page));
      admin.renderRows(rows, empty, payload.data ?? [], renderFaq);
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
    setEditorMode(false);
    admin.feedback(form);
    window.setTimeout(() => {
      setField('position', 1);
      setField('status', 'PUBLISHED');
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const raw = admin.values(form);
    const body = {
      section: raw.section,
      question: raw.question,
      answer: raw.answer,
      position: Number(raw.position),
      status: raw.status,
    };
    admin.setBusy(form, true);
    try {
      const editId = form.dataset.editId;
      await admin.request(editId ? `/cavora/admin/faqs/${editId}` : '/cavora/admin/faqs', {
        method: editId ? 'PATCH' : 'POST',
        body,
      });
      admin.notify(editId ? 'FAQ updated.' : 'FAQ created.', 'success');
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
