(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-post-form]');
  const filters = document.querySelector('[data-post-filters]');
  const rows = document.querySelector('[data-post-rows]');
  const empty = document.querySelector('[data-post-empty]');
  const editor = document.querySelector('[data-post-editor]');
  const editorToggle = document.querySelector('[data-post-editor-toggle]');
  if (
    !admin ||
    !(form instanceof HTMLFormElement) ||
    !(filters instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupDisclosure('[data-post-editor-toggle]', '[data-post-editor]');
  admin.setupFilterReset('[data-post-filters]');
  admin.setupValidation(form);
  admin.setupValidation(filters);

  const setField = (name, value) => {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) {
      field.value = value ?? '';
    }
  };

  const editPost = (post) => {
    form.dataset.editId = post.id;
    for (const name of [
      'title',
      'slug',
      'category',
      'authorName',
      'status',
      'imageUrl',
      'authorImageUrl',
      'excerpt',
    ]) {
      setField(name, post[name]);
    }
    setField('body', JSON.stringify(post.body, null, 2));
    admin.setImageUploadPreview(form.elements.namedItem('image'), post.imageUrl);
    if (
      editor instanceof HTMLElement &&
      editor.hidden &&
      editorToggle instanceof HTMLButtonElement
    ) {
      editorToggle.click();
    }
  };

  const renderPost = (post) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(post.title),
      admin.cell(post.category),
      admin.cell(post.authorName),
      admin.cell(admin.formatDate(post.publishedAt, true)),
    );
    const status = admin.cell();
    status.append(admin.badge(post.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Edit', () => editPost(post)));
    row.append(status, admin.cell(admin.formatDate(post.updatedAt)), actions);
    return row;
  };

  const load = async (page = 1) => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/posts', filters, page));
      admin.renderRows(rows, empty, payload.data ?? [], renderPost);
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
    admin.feedback(form);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors = [];
    const imageInput = form.querySelector('[data-blog-image-file]');
    const imageFile = imageInput instanceof HTMLInputElement ? imageInput.files?.[0] : undefined;
    let bodyDocument;
    try {
      bodyDocument = JSON.parse(raw.body);
    } catch {
      errors.push({ name: 'body', message: 'Body must contain valid JSON.' });
    }
    if (!imageFile && !raw.imageUrl) {
      errors.push({ name: 'image', message: 'Choose a featured image.' });
    }
    if (raw.authorImageUrl && !admin.validationRules.urlOrPath(raw.authorImageUrl)) {
      errors.push({
        name: 'authorImageUrl',
        message: 'Use a valid URL or a local path beginning with /.',
      });
    }
    if (!admin.validateForm(form, errors)) return;
    const body = new FormData();
    for (const name of ['title', 'slug', 'category', 'authorName', 'status', 'excerpt']) {
      body.append(name, raw[name]);
    }
    body.append('body', JSON.stringify(bodyDocument));
    if (imageFile) body.append('image', imageFile);
    if (raw.imageUrl) body.append('imageUrl', raw.imageUrl);
    if (raw.authorImageUrl) body.append('authorImageUrl', raw.authorImageUrl);
    admin.setBusy(form, true);
    try {
      const editId = form.dataset.editId;
      await admin.request(editId ? `/cavora/admin/posts/${editId}` : '/cavora/admin/posts', {
        method: editId ? 'PATCH' : 'POST',
        body,
      });
      admin.notify(editId ? 'Blog post updated.' : 'Blog post created.', 'success');
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
