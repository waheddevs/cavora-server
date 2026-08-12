(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-login-form]');
  const passwordInput = document.querySelector('[data-password-input]');
  const passwordToggle = document.querySelector('[data-password-toggle]');

  if (passwordInput instanceof HTMLInputElement && passwordToggle instanceof HTMLButtonElement) {
    passwordToggle.addEventListener('click', () => {
      const shouldShow = passwordInput.type === 'password';
      passwordInput.type = shouldShow ? 'text' : 'password';
      passwordToggle.textContent = shouldShow ? 'Hide' : 'Show';
      passwordToggle.setAttribute('aria-pressed', String(shouldShow));
    });
  }

  if (!(form instanceof HTMLFormElement) || !admin) return;
  admin.setupValidation(form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(form)) return;
    const body = admin.values(form);
    admin.feedback(form);
    admin.setBusy(form, true);
    try {
      const member = (
        await admin.request('/cavora/auth/login', {
          method: 'POST',
          body,
          csrf: false,
        })
      )?.data;
      if (member?.role !== 'ADMIN') {
        await admin.request('/cavora/auth/logout', { method: 'POST' });
        throw new Error('This account does not have administrator access.');
      }
      window.location.assign('/admin/dashboard');
    } catch (error) {
      admin.reportError(error, form);
      admin.setBusy(form, false);
    }
  });
})();
