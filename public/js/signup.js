(() => {
  const admin = window.CavoraAdmin;
  const form = document.querySelector('[data-signup-form]');
  const passwordInputs = [...document.querySelectorAll('[data-password-input]')];
  const passwordToggle = document.querySelector('[data-password-toggle]');

  if (passwordToggle instanceof HTMLButtonElement && passwordInputs.length > 0) {
    passwordToggle.addEventListener('click', () => {
      const shouldShow = passwordInputs[0]?.type === 'password';
      for (const input of passwordInputs) {
        if (input instanceof HTMLInputElement) input.type = shouldShow ? 'text' : 'password';
      }
      passwordToggle.textContent = shouldShow ? 'Hide' : 'Show';
      passwordToggle.setAttribute('aria-pressed', String(shouldShow));
    });
  }

  if (!(form instanceof HTMLFormElement) || !admin) return;
  admin.setupValidation(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(form);
    const errors =
      raw.password === raw.confirmPassword
        ? []
        : [{ name: 'confirmPassword', message: 'Passwords must match.' }];
    if (!admin.validateForm(form, errors)) return;

    const body = {
      email: raw.email,
      username: raw.username,
      password: raw.password,
      firstName: raw.firstName,
      lastName: raw.lastName,
    };
    admin.setBusy(form, true);
    try {
      const member = (
        await admin.request('/cavora/auth/admin-register', {
          method: 'POST',
          body,
          csrf: false,
        })
      )?.data;
      if (member?.role !== 'ADMIN') {
        throw new Error('Administrator setup did not complete correctly.');
      }
      window.location.assign('/admin/dashboard');
    } catch (error) {
      admin.reportError(error, form);
      admin.setBusy(form, false);
    }
  });
})();
