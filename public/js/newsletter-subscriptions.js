(() => {
  const admin = window.CavoraAdmin;
  const filters = document.querySelector('[data-newsletter-filters]');
  const form = document.querySelector('[data-newsletter-status-form]');
  const rows = document.querySelector('[data-newsletter-rows]');
  const empty = document.querySelector('[data-newsletter-empty]');
  if (
    !admin ||
    !(filters instanceof HTMLFormElement) ||
    !(form instanceof HTMLFormElement) ||
    !(rows instanceof HTMLElement)
  ) {
    return;
  }

  admin.setupFilterReset('[data-newsletter-filters]');
  admin.setupValidation(filters);
  admin.setupValidation(form);
  let currentPage = 1;

  const selectSubscription = (subscription) => {
    form.elements.id.value = subscription.id;
    form.elements.status.value = subscription.status;
    form.elements.status.focus();
  };

  const renderSubscription = (subscription) => {
    const row = document.createElement('tr');
    row.append(
      admin.cell(subscription.email),
      admin.cell(admin.formatDate(subscription.consentedAt)),
      admin.cell(admin.formatDate(subscription.confirmedAt ?? subscription.createdAt)),
    );
    const status = admin.cell();
    status.append(admin.badge(subscription.status));
    const actions = admin.cell();
    actions.append(admin.actionButton('Select', () => selectSubscription(subscription)));
    row.append(status, actions);
    return row;
  };

  const updateSummary = (data) => {
    document
      .querySelector('[data-newsletter-active]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'ACTIVE').length));
    document
      .querySelector('[data-newsletter-pending]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'PENDING').length));
    document
      .querySelector('[data-newsletter-inactive]')
      ?.replaceChildren(String(data.filter((item) => item.status === 'UNSUBSCRIBED').length));
  };

  const load = async (page = 1) => {
    currentPage = page;
    try {
      const payload = await admin.request(
        admin.listUrl('/cavora/admin/newsletter-subscriptions', filters, page),
      );
      const data = payload.data ?? [];
      admin.renderRows(rows, empty, data, renderSubscription);
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
    if (!window.confirm(`Set this subscription to ${raw.status}?`)) return;
    admin.setBusy(form, true);
    try {
      await admin.request(`/cavora/admin/newsletter-subscriptions/${raw.id}/status`, {
        method: 'PATCH',
        body: { status: raw.status },
      });
      admin.feedback(form, 'Subscription status updated.', 'success');
      admin.notify('Subscription status updated.', 'success');
      await load(currentPage);
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
