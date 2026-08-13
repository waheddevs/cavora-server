(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-contact-filters]');
  const form = document.querySelector('[data-contact-status-form]');
  const rows = document.querySelector('[data-contact-rows]');
  const empty = document.querySelector('[data-contact-empty]');
  const editor = document.querySelector('[data-contact-editor]');
  const selectedBadge = document.querySelector('[data-contact-selected-badge]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-contact-filters]');
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

  const selectMessage = (message) => {
    setDetail('[data-contact-detail-from]', `${message.fullName} · ${message.email}`);
    setDetail('[data-contact-detail-subject]', message.subject);
    setDetail('[data-contact-detail-received]', admin.formatDate(message.createdAt));
    setDetail('[data-contact-detail-status]', String(message.status ?? '').replaceAll('_', ' '));
    setDetail('[data-contact-detail-message]', message.message);
    if (selectedBadge instanceof HTMLElement) selectedBadge.textContent = message.fullName;

    form.elements.id.value = message.id;
    form.elements.status.value = message.status;
    admin.feedback(form);
    setEditorOpen(true);
    form.elements.status.focus({ preventScroll: true });
  };

  const renderMessage = (message) => {
    const row = document.createElement('tr');
    row.append(
      admin.cellTruncate(`${message.fullName} · ${message.email}`),
      admin.cell(message.subject),
      admin.cellClamp(message.message),
      admin.cell(admin.formatDate(message.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(message.status));
    const actions = admin.actionsCell(
      admin.actionButton('Select', () => selectMessage(message)),
      admin.deleteButton({
        endpoint: `/cavora/admin/contact-messages/${message.id}`,
        notice: 'Message deleted.',
        onDone: load,
        text: 'The enquiry is removed permanently.',
        title: `Delete the enquiry from ${message.fullName}?`,
      }),
    );
    row.append(status, actions);
    return row;
  };

  const updateSummary = (data) => {
    const counts = {
      NEW: data.filter((item) => item.status === 'NEW').length,
      IN_PROGRESS: data.filter((item) => item.status === 'IN_PROGRESS').length,
      RESOLVED: data.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length,
    };
    document.querySelector('[data-contact-new]')?.replaceChildren(String(counts.NEW));
    document.querySelector('[data-contact-progress]')?.replaceChildren(String(counts.IN_PROGRESS));
    document.querySelector('[data-contact-resolved]')?.replaceChildren(String(counts.RESOLVED));
  };

  const load = async () => {
    try {
      const payload = await admin.request(admin.listUrl('/cavora/admin/contact-messages', filters));
      const data = payload.data ?? [];
      admin.renderRows(rows, empty, data, renderMessage);
      updateSummary(data);
    } catch (error) {
      admin.reportError(error);
    }
  };

  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!admin.validateForm(filters)) return;
    void load();
  });

  document.querySelector('[data-contact-clear]')?.addEventListener('click', clearSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const raw = admin.values(form);
    const confirmed = await admin.confirm({
      title: `Set this message to ${raw.status}?`,
      text: 'This records where the enquiry stands for the rest of the team.',
    });
    if (!confirmed) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/contact-messages/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Contact status updated.', 'success');
      admin.notify('Contact status updated.', 'success');
      await load();
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
