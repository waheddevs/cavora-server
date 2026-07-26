(() => {
  const shell = document.querySelector('[data-admin-shell]');
  const notice = document.querySelector('[data-admin-notice]');
  const noticeMessage = document.querySelector('[data-admin-notice-message]');
  const selectEnhancements = new WeakMap();
  let openSelect;
  let selectSequence = 0;

  const enhancedSelectTrigger = (control) =>
    control instanceof HTMLSelectElement ? selectEnhancements.get(control)?.trigger : undefined;

  const focusTarget = (control) => enhancedSelectTrigger(control) ?? control;

  const setupCustomSelects = () => {
    const selects = [...document.querySelectorAll('.field select')].filter(
      (select) => select instanceof HTMLSelectElement && !selectEnhancements.has(select),
    );

    for (const select of selects) {
      const originalField = select.closest('label.field');
      if (originalField instanceof HTMLLabelElement) {
        const field = document.createElement('div');
        for (const attribute of originalField.attributes) {
          field.setAttribute(attribute.name, attribute.value);
        }
        while (originalField.firstChild) field.append(originalField.firstChild);
        originalField.replaceWith(field);
      }

      selectSequence += 1;
      const field = select.closest('.field');
      const fieldLabel = field?.querySelector(':scope > span');
      const labelId = fieldLabel?.id || `select-label-${selectSequence}`;
      const valueId = `select-value-${selectSequence}`;
      const menuId = `select-menu-${selectSequence}`;
      if (fieldLabel instanceof HTMLElement) fieldLabel.id = labelId;

      const control = document.createElement('div');
      control.className = 'custom-select';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-select__trigger';
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', menuId);
      trigger.setAttribute('aria-labelledby', `${labelId} ${valueId}`);

      const value = document.createElement('span');
      value.id = valueId;
      value.className = 'custom-select__value';
      trigger.append(value);

      const menu = document.createElement('div');
      menu.id = menuId;
      menu.className = 'custom-select__menu';
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-labelledby', labelId);
      menu.hidden = true;

      const optionButtons = [...select.options].map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'custom-select__option';
        button.dataset.optionIndex = String(index);
        button.setAttribute('role', 'option');
        button.textContent = option.textContent?.trim() || option.value;
        menu.append(button);
        return button;
      });

      const sync = () => {
        const selectedOption = select.selectedOptions[0];
        value.textContent = selectedOption?.textContent?.trim() || 'Select an option';
        trigger.disabled = select.disabled;
        trigger.toggleAttribute('aria-invalid', select.getAttribute('aria-invalid') === 'true');

        const describedBy = select.getAttribute('aria-describedby');
        if (describedBy) trigger.setAttribute('aria-describedby', describedBy);
        else trigger.removeAttribute('aria-describedby');

        optionButtons.forEach((button, index) => {
          const option = select.options[index];
          const isSelected = index === select.selectedIndex;
          button.disabled = select.disabled || option.disabled;
          button.setAttribute('aria-selected', String(isSelected));
          button.tabIndex = isSelected && !button.disabled ? 0 : -1;
        });
      };

      const enabledOptions = () => optionButtons.filter((button) => !button.disabled);

      const close = (restoreFocus = false) => {
        if (menu.hidden) return;
        menu.hidden = true;
        control.classList.remove('is-open', 'opens-upward');
        trigger.setAttribute('aria-expanded', 'false');
        if (openSelect?.control === control) openSelect = undefined;
        if (restoreFocus) trigger.focus();
      };

      const focusOption = (index) => {
        const available = enabledOptions();
        if (!available.length) return;
        const normalizedIndex = (index + available.length) % available.length;
        available[normalizedIndex].focus();
      };

      const open = (direction = 0) => {
        if (trigger.disabled) return;
        if (openSelect?.control !== control) openSelect?.close();
        sync();
        menu.hidden = false;
        control.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        openSelect = { close, control };

        const menuRect = menu.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();
        const spaceBelow = window.innerHeight - controlRect.bottom - 12;
        const spaceAbove = controlRect.top - 12;
        control.classList.toggle(
          'opens-upward',
          menuRect.height > spaceBelow && spaceAbove > spaceBelow,
        );

        const available = enabledOptions();
        const selectedIndex = available.findIndex(
          (button) => button.getAttribute('aria-selected') === 'true',
        );
        const startIndex = selectedIndex >= 0 ? selectedIndex : 0;
        focusOption(direction === 0 ? startIndex : startIndex + direction);
      };

      const choose = (button) => {
        const index = Number(button.dataset.optionIndex);
        const option = select.options[index];
        if (!option || option.disabled) return;
        select.selectedIndex = index;
        sync();
        select.dispatchEvent(new window.Event('input', { bubbles: true }));
        select.dispatchEvent(new window.Event('change', { bubbles: true }));
        close(true);
      };

      trigger.addEventListener('click', () => {
        if (menu.hidden) open();
        else close(true);
      });

      trigger.addEventListener('keydown', (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (menu.hidden) {
          open(event.key === 'ArrowUp' || event.key === 'End' ? -1 : 0);
          if (event.key === 'Home') focusOption(0);
          if (event.key === 'End') focusOption(-1);
        }
      });

      menu.addEventListener('keydown', (event) => {
        const available = enabledOptions();
        const currentIndex = available.indexOf(document.activeElement);
        if (event.key === 'Escape') {
          event.preventDefault();
          close(true);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          focusOption(currentIndex + 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          focusOption(currentIndex - 1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          focusOption(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          focusOption(-1);
        } else if ((event.key === 'Enter' || event.key === ' ') && currentIndex >= 0) {
          event.preventDefault();
          choose(available[currentIndex]);
        } else if (event.key === 'Tab') {
          close();
        }
      });

      optionButtons.forEach((button) => {
        button.addEventListener('click', () => choose(button));
      });

      select.classList.add('custom-select__native');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      select.replaceWith(control);
      control.append(select, trigger, menu);

      const valueProperty = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (valueProperty?.get && valueProperty.set) {
        Object.defineProperty(select, 'value', {
          configurable: true,
          get() {
            return valueProperty.get.call(this);
          },
          set(nextValue) {
            valueProperty.set.call(this, nextValue);
            sync();
          },
        });
      }

      select.addEventListener('change', sync);
      select.form?.addEventListener('reset', () => window.setTimeout(sync, 0));
      new MutationObserver(sync).observe(select, {
        attributeFilter: ['aria-describedby', 'aria-invalid', 'disabled'],
        attributes: true,
      });
      selectEnhancements.set(select, { close, control, sync, trigger });
      sync();
    }

    document.addEventListener('pointerdown', (event) => {
      if (openSelect && !openSelect.control.contains(event.target)) openSelect.close();
    });
    window.addEventListener('resize', () => openSelect?.close());
  };

  const notify = (message, type = 'info') => {
    if (!(notice instanceof HTMLElement) || !(noticeMessage instanceof HTMLElement)) return;
    noticeMessage.textContent = message;
    notice.dataset.noticeType = type;
    notice.hidden = false;
  };

  document.querySelector('[data-admin-notice-close]')?.addEventListener('click', () => {
    if (notice instanceof HTMLElement) notice.hidden = true;
  });

  const getCookie = (name) => {
    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix));
    return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
  };

  const request = async (url, options = {}) => {
    const { csrf = true, ...fetchOptions } = options;
    const method = String(fetchOptions.method ?? 'GET').toUpperCase();
    const headers = new Headers(fetchOptions.headers);

    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfCookieName =
        shell instanceof HTMLElement ? shell.dataset.csrfCookieName : undefined;
      const csrfToken = csrfCookieName ? getCookie(csrfCookieName) : undefined;
      if (!csrfToken) throw new Error('Your security token is unavailable. Sign in again.');
      headers.set('x-csrf-token', csrfToken);
    }

    let body = fetchOptions.body;
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(body);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      body,
      credentials: 'same-origin',
      headers,
      method,
    });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json') ? await response.json() : undefined;

    if (!response.ok) {
      const error = new Error(payload?.message ?? 'The request could not be completed.');
      error.code = payload?.code;
      error.fieldErrors = payload?.fieldErrors;
      error.status = response.status;
      if (response.status === 401 && window.location.pathname !== '/admin/login') {
        window.location.assign('/admin/login');
      }
      throw error;
    }
    return payload;
  };

  const feedback = (form, message = '', type = 'info') => {
    const element = form?.querySelector('[data-form-feedback]');
    if (!(element instanceof HTMLElement)) return;
    element.textContent = message;
    element.dataset.feedbackType = type;
    element.classList.toggle('is-visible', Boolean(message));
  };

  const fieldControl = (form, name) => {
    const control = form?.elements.namedItem(name);
    return control instanceof HTMLElement ? control : null;
  };

  const clearFieldError = (form, name) => {
    const control = fieldControl(form, name);
    if (!control) return;
    control.removeAttribute('aria-invalid');
    enhancedSelectTrigger(control)?.removeAttribute('aria-invalid');
    const error = [...form.querySelectorAll('[data-field-error-for]')].find(
      (element) => element.dataset.fieldErrorFor === name,
    );
    if (error instanceof HTMLElement) {
      const errorId = error.id;
      error.remove();
      if (errorId) {
        const describedBy = (control.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter((id) => id && id !== errorId);
        if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '));
        else control.removeAttribute('aria-describedby');
        const trigger = enhancedSelectTrigger(control);
        if (trigger) {
          if (describedBy.length) trigger.setAttribute('aria-describedby', describedBy.join(' '));
          else trigger.removeAttribute('aria-describedby');
        }
      }
    }
  };

  const clearValidation = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll('[data-field-error-for]').forEach((error) => error.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach((control) => {
      control.removeAttribute('aria-invalid');
      const describedBy = (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((id) => id && !id.startsWith('field-error-'));
      if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '));
      else control.removeAttribute('aria-describedby');
    });
  };

  const setFieldError = (form, name, message) => {
    const control = fieldControl(form, name);
    if (!control) return false;
    const existing = [...form.querySelectorAll('[data-field-error-for]')].find(
      (element) => element.dataset.fieldErrorFor === name,
    );
    if (existing instanceof HTMLElement) return false;
    const error = document.createElement('small');
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    error.id = `field-error-${safeName}`;
    error.className = 'field-error';
    error.dataset.fieldErrorFor = name;
    error.textContent = message;
    control.setAttribute('aria-invalid', 'true');
    enhancedSelectTrigger(control)?.setAttribute('aria-invalid', 'true');
    const describedBy = new Set(
      (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    );
    describedBy.add(error.id);
    control.setAttribute('aria-describedby', [...describedBy].join(' '));
    enhancedSelectTrigger(control)?.setAttribute('aria-describedby', [...describedBy].join(' '));
    const container = control.closest('.field') ?? control.parentElement;
    container?.append(error);
    return true;
  };

  const validateForm = (form, customErrors = []) => {
    if (!(form instanceof HTMLFormElement)) return false;
    clearValidation(form);
    feedback(form);
    const errors = [];
    for (const control of form.elements) {
      if (
        control instanceof HTMLElement &&
        'willValidate' in control &&
        control.willValidate &&
        'validity' in control &&
        !control.validity.valid &&
        'name' in control &&
        control.name
      ) {
        errors.push({
          name: control.name,
          message: control.validationMessage || 'Check this value.',
        });
      }
    }
    for (const error of customErrors) {
      if (error?.name && error?.message) errors.push(error);
    }
    for (const error of errors) setFieldError(form, error.name, error.message);
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid instanceof HTMLElement) {
      feedback(form, 'Check the highlighted fields.', 'error');
      focusTarget(firstInvalid).focus();
      return false;
    }
    return true;
  };

  const setupValidation = (form) => {
    if (!(form instanceof HTMLFormElement) || form.dataset.validationBound === 'true') return;
    form.dataset.validationBound = 'true';
    const clearChangedField = (event) => {
      const control = event.target;
      if (control instanceof HTMLElement && 'name' in control && control.name) {
        clearFieldError(form, control.name);
      }
    };
    form.addEventListener('input', clearChangedField);
    form.addEventListener('change', clearChangedField);
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        clearValidation(form);
        feedback(form);
      }, 0);
    });
  };

  const validationRules = Object.freeze({
    idList(value, maximum = 12) {
      const tokens = String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (tokens.length === 0) return { error: 'Enter at least one positive integer ID.', ids: [] };
      if (tokens.some((item) => !/^[1-9]\d*$/.test(item))) {
        return { error: 'Use only positive integer IDs separated by commas.', ids: [] };
      }
      if (tokens.length > maximum) {
        return { error: `Enter no more than ${maximum} IDs.`, ids: [] };
      }
      if (new Set(tokens).size !== tokens.length) {
        return { error: 'Duplicate IDs are not allowed.', ids: [] };
      }
      return { ids: tokens.map(Number) };
    },
    lineList(value, maximumItems = 100, maximumLength = 500) {
      const items = String(value)
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > maximumItems) {
        return { error: `Enter no more than ${maximumItems} items.`, items: [] };
      }
      if (items.some((item) => item.length > maximumLength)) {
        return { error: `Each item must be ${maximumLength} characters or fewer.`, items: [] };
      }
      return { items };
    },
    tourItinerary(value) {
      if (!value) return { itinerary: [] };
      try {
        const itinerary = JSON.parse(value);
        const valid =
          Array.isArray(itinerary) &&
          itinerary.length <= 100 &&
          itinerary.every(
            (item) =>
              item &&
              typeof item === 'object' &&
              !Array.isArray(item) &&
              Object.keys(item).every((key) => ['day', 'title', 'description'].includes(key)) &&
              Number.isInteger(item.day) &&
              item.day >= 1 &&
              typeof item.title === 'string' &&
              item.title.trim().length >= 1 &&
              item.title.trim().length <= 160 &&
              typeof item.description === 'string' &&
              item.description.trim().length >= 1 &&
              item.description.trim().length <= 5000,
          );
        return valid
          ? { itinerary }
          : {
              error: 'Use up to 100 itinerary items with day, title, and description fields.',
              itinerary: [],
            };
      } catch {
        return { error: 'Enter valid itinerary JSON.', itinerary: [] };
      }
    },
    urlOrPath(value) {
      if (/^\/(?!\/)/.test(value)) return true;
      try {
        new window.URL(value);
        return true;
      } catch {
        return false;
      }
    },
  });

  const setBusy = (form, isBusy) => {
    form?.querySelectorAll('button, input, select, textarea').forEach((control) => {
      if ('disabled' in control) control.disabled = isBusy;
    });
  };

  const values = (form) =>
    Object.fromEntries(
      [...new FormData(form).entries()].map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    );

  const listUrl = (path, form, page = 1, limit = 20) => {
    const query = new window.URLSearchParams({ page: String(page), limit: String(limit) });
    if (form instanceof HTMLFormElement) {
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
      }
    }
    return `${path}?${query.toString()}`;
  };

  const cell = (value = '') => {
    const element = document.createElement('td');
    element.textContent = String(value ?? '');
    return element;
  };

  const actionButton = (label, action, variant = '') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button button--small${variant ? ` button--${variant}` : ''}`;
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  };

  const badge = (status) => {
    const element = document.createElement('span');
    element.className = 'badge';
    element.textContent = String(status ?? '').replaceAll('_', ' ');
    return element;
  };

  const renderRows = (tbody, empty, data, render) => {
    tbody.replaceChildren(...data.map(render));
    if (empty instanceof HTMLElement) empty.hidden = data.length > 0;
  };

  const setPagination = (meta, loadPage) => {
    const summary = document.querySelector('[data-page-summary]');
    const previous = document.querySelector('[data-page-prev]');
    const next = document.querySelector('[data-page-next]');
    const page = meta?.page ?? 1;
    const totalPages = Math.max(meta?.totalPages ?? 0, 1);
    if (summary instanceof HTMLElement) {
      summary.textContent = `Page ${page} of ${totalPages} · ${meta?.total ?? 0} records`;
    }
    if (previous instanceof HTMLButtonElement) {
      previous.disabled = page <= 1;
      previous.onclick = () => loadPage(page - 1);
    }
    if (next instanceof HTMLButtonElement) {
      next.disabled = page >= totalPages;
      next.onclick = () => loadPage(page + 1);
    }
  };

  const formatDate = (value, dateOnly = false) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      ...(dateOnly ? { timeZone: 'UTC' } : {}),
      ...(dateOnly ? {} : { timeStyle: 'short' }),
    }).format(date);
  };

  const formatMoney = (amountCents, currency = 'USD') => {
    const amount = Number(amountCents);
    if (!Number.isFinite(amount)) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  const reportError = (error, form) => {
    const serverErrors =
      error?.fieldErrors && typeof error.fieldErrors === 'object'
        ? Object.entries(error.fieldErrors)
        : [];
    let fieldMessage;
    if (form instanceof HTMLFormElement) {
      for (const [path, message] of serverErrors) {
        const name = String(path)
          .split('.')
          .reverse()
          .find((part) => fieldControl(form, part));
        if (name && typeof message === 'string') {
          setFieldError(form, name, message);
          fieldMessage ??= message;
        }
      }
    }
    fieldMessage ??= serverErrors.find((entry) => typeof entry[1] === 'string')?.[1];
    const message = fieldMessage || error?.message || 'The request could not be completed.';
    if (form instanceof HTMLFormElement) feedback(form, message, 'error');
    notify(message, 'error');
  };

  document.querySelector('[data-current-year]')?.replaceChildren(String(new Date().getFullYear()));

  const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  if (shell instanceof HTMLElement && sidebarToggle instanceof HTMLButtonElement) {
    const closeSidebar = () => {
      shell.classList.remove('is-sidebar-open');
      sidebarToggle.setAttribute('aria-expanded', 'false');
    };
    sidebarToggle.addEventListener('click', () => {
      const isOpen = shell.classList.toggle('is-sidebar-open');
      sidebarToggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSidebar();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeSidebar();
    });
  }

  const loadAdminAccount = async () => {
    const account = document.querySelector('[data-admin-account]');
    if (!(account instanceof HTMLElement)) return;
    try {
      const member = (await request('/cavora/users/me'))?.data;
      const displayName = [member?.firstName, member?.lastName].filter(Boolean).join(' ');
      const name = displayName || member?.username || 'Administrator';
      account.querySelector('[data-admin-name]')?.replaceChildren(name);
      account
        .querySelector('[data-admin-email]')
        ?.replaceChildren(member?.email ?? 'Administrator account');
      account
        .querySelector('[data-admin-initial]')
        ?.replaceChildren(name.trim().charAt(0).toUpperCase() || 'A');
    } catch (error) {
      if (error.status !== 401) reportError(error);
    }
  };

  const logoutButton = document.querySelector('[data-admin-logout]');
  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = 'Logging out...';
      try {
        await request('/cavora/auth/logout', { method: 'POST' });
        window.location.assign('/admin/login');
      } catch (error) {
        reportError(error);
        logoutButton.disabled = false;
        logoutButton.textContent = 'Log out';
      }
    });
  }

  setupCustomSelects();

  window.CavoraAdmin = Object.freeze({
    actionButton,
    badge,
    cell,
    clearValidation,
    feedback,
    formatDate,
    formatMoney,
    getCookie,
    listUrl,
    notify,
    renderRows,
    reportError,
    request,
    setFieldError,
    setBusy,
    setPagination,
    setupValidation,
    setupDisclosure(triggerSelector, panelSelector) {
      const trigger = document.querySelector(triggerSelector);
      const panel = document.querySelector(panelSelector);
      if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
      const setOpen = (isOpen) => {
        panel.hidden = !isOpen;
        trigger.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) panel.querySelector('input, select, textarea')?.focus();
      };
      trigger.addEventListener('click', () => setOpen(panel.hidden));
      panel.querySelectorAll('[data-disclosure-close]').forEach((button) => {
        button.addEventListener('click', () => setOpen(false));
      });
    },
    setupFilterReset(formSelector) {
      const form = document.querySelector(formSelector);
      const resetButton = form?.querySelector('[data-filter-reset]');
      if (!(form instanceof HTMLFormElement) || !(resetButton instanceof HTMLButtonElement)) return;
      resetButton.addEventListener('click', () => {
        form.reset();
        form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      });
    },
    validateForm,
    validationRules,
    values,
  });

  void loadAdminAccount();
})();
