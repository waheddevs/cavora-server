(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-comment-filters]');
  const form = document.querySelector('[data-comment-status-form]');
  const rows = document.querySelector('[data-comment-rows]');
  const empty = document.querySelector('[data-comment-empty]');
  const editor = document.querySelector('[data-comment-editor]');
  const selectedBadge = document.querySelector('[data-comment-selected-badge]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-comment-filters]');
  admin.setupValidation(filters);
  admin.setupValidation(form);
  let currentPage = 1;

  const setDetail = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(value || '—');
  };

  const setEditorOpen = (isOpen) => {
    admin.setPanelOpen(editor, isOpen);
  };

  const clearSelection = () => {
    form.reset();
    admin.clearValidation(form);
    admin.feedback(form);
    setEditorOpen(false);
  };

  const targetLabel = (comment) =>
    comment.postId ? `Post ${comment.postId}` : `Tour ${comment.tourId}`;

  const selectComment = (comment) => {
    setDetail('[data-comment-detail-author]', `${comment.name} · ${comment.email}`);
    setDetail('[data-comment-detail-target]', targetLabel(comment));
    setDetail('[data-comment-detail-submitted]', admin.formatDate(comment.createdAt));
    setDetail('[data-comment-detail-status]', String(comment.status ?? '').replaceAll('_', ' '));
    setDetail('[data-comment-detail-body]', comment.body);
    if (selectedBadge instanceof HTMLElement) selectedBadge.textContent = comment.name;

    form.elements.id.value = comment.id;
    form.elements.status.value = comment.status;
    admin.feedback(form);
    setEditorOpen(true);
    form.elements.status.focus();
  };

  const renderComment = (comment) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(`${comment.name} · ${comment.email}`),
      admin.cell(targetLabel(comment)),
      admin.cellClamp(comment.body),
      admin.cell(admin.formatDate(comment.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(comment.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Select', () => selectComment(comment)));
    row.append(status, actions);
    return row;
  };

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/comments', filters, page));
      admin.renderRows(rows, empty, payload.data ?? [], renderComment);
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

  document.querySelector('[data-comment-clear]')?.addEventListener('click', clearSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const raw = admin.values(form);
    const confirmed = await admin.confirm({
      title: `Set this comment to ${raw.status}?`,
      text: 'Moderation changes what visitors see on the public page.',
      danger: raw.status === 'REJECTED',
    });
    if (!confirmed) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/comments/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Comment status updated.', 'success');
      admin.notify('Comment status updated.', 'success');
      await load(currentPage);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
