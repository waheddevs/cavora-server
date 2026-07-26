(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-comment-filters]');
  const form = document.querySelector('[data-comment-status-form]');
  const rows = document.querySelector('[data-comment-rows]');
  const empty = document.querySelector('[data-comment-empty]');
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

  const selectComment = (comment) => {
    form.elements.id.value = comment.id;
    form.elements.status.value = comment.status;
    form.elements.status.focus();
  };

  const renderComment = (comment) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(`${comment.name} · ${comment.email}`),
      admin.cell(comment.postId),
      admin.cell(comment.body),
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const raw = admin.values(form);
    if (!window.confirm(`Set this comment to ${raw.status}?`)) return;
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
