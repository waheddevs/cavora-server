(() => {
  const admin = window.CavoraAdmin;
  const profileForm = document.querySelector('[data-profile-form]');
  const passwordForm = document.querySelector('[data-password-form]');
  const avatarForm = document.querySelector('[data-avatar-form]');
  const avatarInput = document.querySelector('[data-avatar-input]');
  const removeButton = document.querySelector('[data-avatar-remove]');
  const resetButton = document.querySelector('[data-profile-reset]');
  if (
    !admin ||
    !(profileForm instanceof HTMLFormElement) ||
    !(passwordForm instanceof HTMLFormElement) ||
    !(avatarForm instanceof HTMLFormElement) ||
    !(avatarInput instanceof HTMLInputElement)
  ) {
    return;
  }

  admin.setupValidation(profileForm);
  admin.setupValidation(passwordForm);

  let current = {};

  const setText = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(value ?? '—');
  };

  const setField = (form, name, value) => {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) field.value = value ?? '';
  };

  const renderAvatar = (member, cacheBustAvatar = false) => {
    const image = document.querySelector('[data-profile-avatar]');
    const initials = document.querySelector('[data-profile-initials]');
    const letter = (member.firstName?.[0] ?? member.username?.[0] ?? 'A').toUpperCase();

    if (initials instanceof HTMLElement) {
      initials.textContent = letter;
      initials.hidden = Boolean(member.avatarUrl);
    }
    if (image instanceof HTMLImageElement) {
      if (member.avatarUrl) {
        const separator = String(member.avatarUrl).includes('?') ? '&' : '?';
        image.src = cacheBustAvatar
          ? `${member.avatarUrl}${separator}v=${Date.now()}`
          : member.avatarUrl;
        image.alt = `${member.firstName} ${member.lastName}`;
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.alt = '';
        image.hidden = true;
      }
    }
    if (removeButton instanceof HTMLElement) removeButton.hidden = !member.avatarUrl;
  };

  const render = (member, options = {}) => {
    const { cacheBustAvatar = false } = options;
    current = member;
    setText(
      '[data-profile-fullname]',
      [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username,
    );
    setText('[data-profile-rolelabel]', member.role === 'ADMIN' ? 'Administrator' : 'Member');
    setText('[data-profile-role]', member.role);
    setText('[data-profile-status]', member.status);
    setText('[data-profile-verified]', member.emailVerified ? 'Yes' : 'Not verified');
    setText('[data-profile-since]', admin.formatDate(member.createdAt));
    setText('[data-profile-sessions]', String(member.stats?.activeSessions ?? 0));
    setText(
      '[data-profile-lastsignin]',
      member.lastSignInAt ? admin.formatDate(member.lastSignInAt) : 'No recorded sign-in',
    );

    for (const name of ['firstName', 'lastName', 'username', 'email', 'phone', 'location']) {
      setField(profileForm, name, member[name]);
    }
    renderAvatar(member, cacheBustAvatar);
    // Keep the topbar account block in sync after photo or name changes.
    admin.setAccount(member, { cacheBustAvatar });
  };

  const load = async () => {
    try {
      render((await admin.getAccount({ force: true })) ?? {});
    } catch (error) {
      admin.reportError(error);
    }
  };

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!admin.validateForm(profileForm)) return;
    admin.setBusy(profileForm, true);
    try {
      const payload = await admin.request('/cavora/users/me', {
        method: 'PATCH',
        body: admin.values(profileForm),
      });
      render(payload?.data ?? {});
      admin.feedback(profileForm, 'Profile updated.', 'success');
      admin.notify('Profile updated.', 'success');
    } catch (error) {
      admin.reportError(error, profileForm);
    } finally {
      admin.setBusy(profileForm, false);
    }
  });

  resetButton?.addEventListener('click', () => {
    render(current);
    admin.clearValidation(profileForm);
    admin.feedback(profileForm, 'Changes discarded.');
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = admin.values(passwordForm);
    const mismatch =
      raw.newPassword !== raw.confirmPassword
        ? [{ name: 'confirmPassword', message: 'Both new passwords must match.' }]
        : [];
    if (!admin.validateForm(passwordForm, mismatch)) return;

    const confirmed = await admin.confirm({
      title: 'Change your password?',
      text: 'Every other active session will be signed out.',
      confirmText: 'Yes',
      cancelText: 'No',
    });
    if (!confirmed) return;

    admin.setBusy(passwordForm, true);
    try {
      const payload = await admin.request('/cavora/users/me/password', {
        method: 'POST',
        body: { currentPassword: raw.currentPassword, newPassword: raw.newPassword },
      });
      passwordForm.reset();
      admin.clearValidation(passwordForm);
      admin.feedback(passwordForm, payload?.message ?? 'Password updated.', 'success');
      admin.notify('Password updated.', 'success');
      await load();
    } catch (error) {
      admin.reportError(error, passwordForm);
    } finally {
      admin.setBusy(passwordForm, false);
    }
  });

  document.querySelector('[data-avatar-edit]')?.addEventListener('click', () => {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('image', file);
    admin.setBusy(avatarForm, true);
    try {
      const payload = await admin.request('/cavora/users/me/avatar', { method: 'POST', body });
      render(payload?.data ?? {}, { cacheBustAvatar: true });
      admin.feedback(avatarForm, 'Photo updated.', 'success');
      admin.notify('Profile photo updated.', 'success');
    } catch (error) {
      admin.reportError(error, avatarForm);
    } finally {
      avatarInput.value = '';
      admin.setBusy(avatarForm, false);
    }
  });

  removeButton?.addEventListener('click', async () => {
    if (!current.avatarUrl) return;
    const confirmed = await admin.confirm({
      title: 'Remove your profile photo?',
      text: 'Your initials will be shown instead.',
      confirmText: 'Yes',
      cancelText: 'No',
      danger: true,
    });
    if (!confirmed) return;

    admin.setBusy(avatarForm, true);
    try {
      const payload = await admin.request('/cavora/users/me/avatar', { method: 'DELETE' });
      render(payload?.data ?? {});
      admin.feedback(avatarForm, 'Photo removed.', 'success');
      admin.notify('Profile photo removed.', 'success');
    } catch (error) {
      admin.reportError(error, avatarForm);
    } finally {
      admin.setBusy(avatarForm, false);
    }
  });

  void load();
})();
