(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-contact-filters]');
  const form = document.querySelector('[data-contact-status-form]');
  const rows = document.querySelector('[data-contact-rows]');
  const empty = document.querySelector('[data-contact-empty]');
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
  let currentPage = 1;

  const selectMessage = (message) => {
    form.elements.id.value = message.id;
    form.elements.status.value = message.status;
    form.elements.status.focus();
  };

  const renderMessage = (message) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(`${message.fullName} · ${message.email}`),
      admin.cell(message.subject),
      admin.cell(message.message),
      admin.cell(admin.formatDate(message.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(message.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Select', () => selectMessage(message)));
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

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(
        admin.listUrl('/cavora/admin/contact-messages', filters, page),
      );
      const data = payload.data ?? [];
      admin.renderRows(rows, empty, data, renderMessage);
      admin.setPagination(payload.meta, load);
      updateSummary(data);
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
    if (!window.confirm(`Set this message to ${raw.status}?`)) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/contact-messages/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Contact status updated.', 'success');
      admin.notify('Contact status updated.', 'success');
      await load(currentPage);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
