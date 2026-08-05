(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-user-filters]');
  const form = document.querySelector('[data-user-status-form]');
  const rows = document.querySelector('[data-user-rows]');
  const empty = document.querySelector('[data-user-empty]');
  const editor = document.querySelector('[data-user-editor]');
  const hint = document.querySelector('[data-user-hint]');
  const selectedBadge = document.querySelector('[data-user-selected-badge]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-user-filters]');
  admin.setupValidation(filters);
  admin.setupValidation(form);
  let currentPage = 1;

  const setDetail = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(value || '—');
  };

  const setEditorOpen = (isOpen) => {
    if (editor instanceof HTMLElement) editor.hidden = !isOpen;
    if (hint instanceof HTMLElement) hint.hidden = isOpen;
    if (selectedBadge instanceof HTMLElement) selectedBadge.hidden = !isOpen;
  };

  const clearSelection = () => {
    form.reset();
    admin.clearValidation(form);
    admin.feedback(form);
    setEditorOpen(false);
  };

  const selectMember = (member) => {
    form.elements.id.value = member.id;
    form.elements.status.value = member.status;
    setDetail('[data-user-detail-name]', `${member.firstName} ${member.lastName}`);
    setDetail('[data-user-detail-email]', member.email);
    setDetail('[data-user-detail-username]', member.username);
    setDetail('[data-user-detail-phone]', member.phone);
    setDetail('[data-user-detail-location]', member.location);
    setDetail('[data-user-detail-joined]', admin.formatDate(member.createdAt));
    if (selectedBadge instanceof HTMLElement) selectedBadge.textContent = member.username;
    admin.feedback(form);
    setEditorOpen(true);
    form.elements.status.focus();
  };

  const renderMember = (member) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(`${member.firstName} ${member.lastName}`),
      admin.cell(member.username),
      admin.cell(member.email),
    );
    const role = admin.cell();
    role.append(admin.badge(member.role));
    row.append(role);
    row.append(
      admin.cell(member.emailVerified ? 'Yes' : 'No'),
      admin.cell(admin.formatDate(member.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(member.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Select', () => selectMember(member)));
    row.append(status, actions);
    return row;
  };

  const updateSummary = (stats) => {
    const totals = stats ?? { total: 0, active: 0, blocked: 0, deleted: 0 };
    document.querySelector('[data-user-total]')?.replaceChildren(String(totals.total ?? 0));
    document.querySelector('[data-user-active]')?.replaceChildren(String(totals.active ?? 0));
    document.querySelector('[data-user-blocked]')?.replaceChildren(String(totals.blocked ?? 0));
    document.querySelector('[data-user-deleted]')?.replaceChildren(String(totals.deleted ?? 0));
  };

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/users', filters, page));
      admin.renderRows(rows, empty, payload.data ?? [], renderMember);
      admin.setPagination(payload.meta, load);
      updateSummary(payload.stats);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load(1);
  });

  document.querySelector('[data-user-clear]')?.addEventListener('click', clearSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const raw = admin.values(form);
    if (!window.confirm(`Set this member to ${raw.status}?`)) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/users/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Member access updated.', 'success');
      admin.notify('Member access updated.', 'success');
      await load(currentPage);
      clearSelection();
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
