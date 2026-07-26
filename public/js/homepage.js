(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-homepage-form]');
  if (!(form instanceof HTMLFormElement) || !admin) return;

  admin.setupValidation(form);

  const parseIds = (value, name, label) => {
    const result = admin.validationRules.idList(value);
    return {
      errors: result.error ? [{ name, message: `${label}: ${result.error}` }] : [],
      ids: result.ids,
    };
  };

  const load = async () => {
    try {
      const data = (await admin.request('/cavora/admin/homepage/selections'))?.data ?? {};
      form.elements.featuredTourIds.value = (data.featuredTourIds ?? []).join(', ');
      form.elements.popularTourIds.value = (data.popularTourIds ?? []).join(', ');
      form.elements.spotlightTourId.value = data.spotlightTourId ?? '';
    } catch (error) {
      admin.reportError(error, form);
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const featured = parseIds(raw.featuredTourIds, 'featuredTourIds', 'Featured tours');
    const popular = parseIds(raw.popularTourIds, 'popularTourIds', 'Popular tours');
    if (!admin.validateForm(form, [...featured.errors, ...popular.errors])) return;
    const body = {
      featuredTourIds: featured.ids,
      popularTourIds: popular.ids,
      spotlightTourId: Number(raw.spotlightTourId),
    };
    admin.setBusy(form, true);
    admin.feedback(form);
    try {
      await admin.request('/cavora/admin/homepage/selections', { method: 'PUT', body });
      admin.feedback(form, 'Homepage selections saved.', 'success');
      admin.notify('Homepage selections saved.', 'success');
    } catch (error) {
      admin.reportError(error, form);
    } finally {
      admin.setBusy(form, false);
    }
  });

  void load();
})();
