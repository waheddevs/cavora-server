(() => {
  const ACCOUNT_CACHE_KEY = 'cavora.admin.account.v1';

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(ACCOUNT_CACHE_KEY) ?? 'null');
    const member = cached?.member;
    if (!member) return;

    const displayName = [member.firstName, member.lastName].filter(Boolean).join(' ');
    const name = displayName || member.username || 'Administrator';
    const initial = name.trim().charAt(0).toUpperCase() || 'A';

    const paintAvatar = (initialSelector, imageSelector) => {
      const initialElement = document.querySelector(initialSelector);
      const image = document.querySelector(imageSelector);
      initialElement?.replaceChildren(initial);
      if (initialElement instanceof HTMLElement) initialElement.hidden = Boolean(member.avatarUrl);
      if (!(image instanceof HTMLImageElement)) return;
      if (member.avatarUrl) {
        image.src = member.avatarUrl;
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.hidden = true;
      }
    };

    document.querySelector('[data-identity-name]')?.replaceChildren(name);
    paintAvatar('[data-identity-initial]', '[data-identity-avatar]');
    document.documentElement.classList.add('is-account-ready');
  } catch {
    window.sessionStorage.removeItem(ACCOUNT_CACHE_KEY);
  }
})();
