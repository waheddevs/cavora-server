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

  /* The public blog renders `body` as an ordered list of blocks
     ({ type, text, author, items }), so the editor builds that list directly
     instead of asking an administrator to hand-write JSON. */
  const blockList = form.querySelector('[data-block-list]');
  const BLOCK_LABELS = {
    heading: 'Heading',
    list: 'List',
    paragraph: 'Paragraph',
    quote: 'Quote',
  };
  let blockSequence = 0;

  const buildField = (labelText, control, hint = '') => {
    const field = document.createElement('label');
    field.className = 'field';
    const label = document.createElement('span');
    label.textContent = labelText;
    field.append(label, control);
    if (hint) {
      const small = document.createElement('small');
      small.textContent = hint;
      field.append(small);
    }
    return field;
  };

  const syncBlockEmptyState = () => {
    if (!(blockList instanceof HTMLElement)) return;
    const hasRows = blockList.querySelector('[data-block-row]') !== null;
    let message = blockList.querySelector('[data-block-empty]');
    if (hasRows) {
      message?.remove();
      return;
    }
    if (message) return;
    message = document.createElement('p');
    message.className = 'content-builder__empty';
    message.dataset.blockEmpty = '';
    message.textContent = 'No content blocks yet. Add a paragraph to begin.';
    blockList.append(message);
  };

  const addBlockRow = (type, data = {}) => {
    if (!(blockList instanceof HTMLElement) || !BLOCK_LABELS[type]) return;
    blockSequence += 1;
    const index = blockSequence;

    const row = document.createElement('div');
    row.className = 'content-block';
    row.dataset.blockRow = '';
    row.dataset.blockType = type;

    const heading = document.createElement('div');
    heading.className = 'content-block__heading';
    const kind = document.createElement('strong');
    kind.textContent = BLOCK_LABELS[type];
    const controls = document.createElement('div');
    controls.className = 'content-block__controls';

    const move = (delta) => {
      const sibling = delta < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!(sibling instanceof HTMLElement) || !sibling.dataset.blockRow) return;
      if (delta < 0) sibling.before(row);
      else sibling.after(row);
    };
    const upButton = admin.actionButton('↑', () => move(-1));
    upButton.setAttribute('aria-label', 'Move block up');
    const downButton = admin.actionButton('↓', () => move(1));
    downButton.setAttribute('aria-label', 'Move block down');
    const removeButton = admin.actionButton('Remove', () => {
      row.remove();
      syncBlockEmptyState();
    });
    controls.append(upButton, downButton, removeButton);
    heading.append(kind, controls);

    const fields = document.createElement('div');
    fields.className = 'content-block__fields';

    if (type === 'heading') {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = `blockText-${index}`;
      input.maxLength = 240;
      input.value = data.text ?? '';
      fields.append(buildField('Heading text', input));
    } else if (type === 'list') {
      const textarea = document.createElement('textarea');
      textarea.name = `blockItems-${index}`;
      textarea.value = (data.items ?? []).join('\n');
      fields.append(buildField('List items', textarea, 'One item per line.'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.name = `blockText-${index}`;
      textarea.value = data.text ?? '';
      fields.append(buildField(type === 'quote' ? 'Quote' : 'Paragraph', textarea));
      if (type === 'quote') {
        const author = document.createElement('input');
        author.type = 'text';
        author.name = `blockAuthor-${index}`;
        author.maxLength = 160;
        author.value = data.author ?? '';
        fields.append(buildField('Attributed to', author));
      }
    }

    row.append(heading, fields);
    blockList.querySelector('[data-block-empty]')?.remove();
    blockList.append(row);
    syncBlockEmptyState();
  };

  const renderBlocks = (blocks) => {
    if (!(blockList instanceof HTMLElement)) return;
    blockList.replaceChildren();
    for (const block of Array.isArray(blocks) ? blocks : []) {
      addBlockRow(BLOCK_LABELS[block?.type] ? block.type : 'paragraph', block ?? {});
    }
    syncBlockEmptyState();
  };

  const readBlocks = () => {
    const blocks = [];
    const errors = [];
    if (!(blockList instanceof HTMLElement)) return { blocks, errors };

    for (const row of blockList.querySelectorAll('[data-block-row]')) {
      const type = row.dataset.blockType;
      if (type === 'list') {
        const control = row.querySelector('[name^="blockItems-"]');
        if (!(control instanceof HTMLElement) || !('value' in control)) continue;
        const items = String(control.value)
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean);
        if (!items.length) {
          errors.push({ name: control.name, message: 'Add at least one list item.' });
          continue;
        }
        blocks.push({ items, type: 'list' });
        continue;
      }

      const control = row.querySelector('[name^="blockText-"]');
      if (!(control instanceof HTMLElement) || !('value' in control)) continue;
      const text = String(control.value).trim();
      if (!text) {
        errors.push({ name: control.name, message: 'This block cannot be empty.' });
        continue;
      }
      if (type === 'quote') {
        const authorControl = row.querySelector('[name^="blockAuthor-"]');
        const author = authorControl instanceof HTMLInputElement ? authorControl.value.trim() : '';
        blocks.push(author ? { author, text, type } : { text, type });
        continue;
      }
      blocks.push({ text, type });
    }

    if (!blocks.length && !errors.length) {
      errors.push({ name: 'title', message: 'Add at least one content block.' });
    }
    return { blocks, errors };
  };

  for (const button of form.querySelectorAll('[data-block-add]')) {
    button.addEventListener('click', () => addBlockRow(button.dataset.blockAdd));
  }
  renderBlocks([]);

  const editPost = (post) => {
    form.dataset.editId = post.id;
    for (const name of [
      'title',
      'slug',
      'category',
      'authorName',
      'status',
      'imageUrl',
      'excerpt',
    ]) {
      setField(name, post[name]);
    }
    renderBlocks(post.body);
    admin.setImageUploadPreview(form.elements.namedItem('image'), post.imageUrl);
    if (editor instanceof HTMLElement) {
      if (editor.hidden && editorToggle instanceof HTMLButtonElement) editorToggle.click();
      admin.revealPanel(editor);
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
    const actions = admin.actionsCell(
      admin.actionButton('Edit', () => editPost(post)),
      admin.deleteButton({
        endpoint: `/cavora/admin/posts/${post.id}`,
        notice: 'Blog post deleted.',
        onDone: load,
        text: 'Every comment on the post is removed with it.',
        title: `Delete "${post.title}"?`,
      }),
    );
    row.append(status, admin.cell(admin.formatDate(post.updatedAt)), actions);
    return row;
  };

  const load = async () => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/posts', filters));
      admin.renderRows(rows, empty, payload.data ?? [], renderPost);
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
    renderBlocks([]);
    admin.feedback(form);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors = [];
    const imageInput = form.querySelector('[data-blog-image-file]');
    const imageFile = imageInput instanceof HTMLInputElement ? imageInput.files?.[0] : undefined;
    const { blocks, errors: blockErrors } = readBlocks();
    errors.push(...blockErrors);
    if (!imageFile && !raw.imageUrl) {
      errors.push({ name: 'image', message: 'Choose a featured image.' });
    }
    if (!admin.validateForm(form, errors)) return;
    const body = new FormData();
    for (const name of ['title', 'slug', 'category', 'authorName', 'status', 'excerpt']) {
      body.append(name, raw[name]);
    }
    body.append('body', JSON.stringify(blocks));
    if (imageFile) body.append('image', imageFile);
    if (raw.imageUrl) body.append('imageUrl', raw.imageUrl);
    admin.setBusy(form, true);
    try {
      const editId = form.dataset.editId;
      await admin.request(editId ? `/cavora/admin/posts/${editId}` : '/cavora/admin/posts', {
        method: editId ? 'PATCH' : 'POST',
        body,
      });
      admin.notify(editId ? 'Blog post updated.' : 'Blog post created.', 'success');
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
