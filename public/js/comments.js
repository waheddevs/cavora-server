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

  // A row only needs enough of the id to tell one target from another, and a
  // full ObjectId is wide enough to push the table into horizontal scroll. The
  // detail panel and the tooltip still carry it in full.
  const shortTargetLabel = (comment) =>
    comment.postId ? `Post ${admin.shortId(comment.postId)}` : `Tour ${comment.tourId}`;

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
    form.elements.status.focus({ preventScroll: true });
  };

  const renderComment = (comment) => {
    const row = document.createElement('tr');
    row.append(
      admin.cellTruncate(`${comment.name} · ${comment.email}`),
      admin.cellTruncate(shortTargetLabel(comment), targetLabel(comment)),
      admin.cellClamp(comment.body),
      admin.cell(admin.formatDate(comment.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(comment.status));
    const actions = admin.actionsCell(
      admin.actionButton('Select', () => selectComment(comment)),
      admin.deleteButton({
        endpoint: `/cavora/admin/comments/${comment.id}`,
        notice: 'Comment deleted.',
        onDone: load,
        text: 'This cannot be undone.',
        title: `Delete the comment by ${comment.name}?`,
      }),
    );
    row.append(status, actions);
    return row;
  };

  const load = async () => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/comments', filters));
      admin.renderRows(rows, empty, payload.data ?? [], renderComment);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load();
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
      await load();
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
