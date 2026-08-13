(() => {
  const shell = document.querySelector('[data-admin-shell]');
  // Signed-out auth pages have no admin shell, so the cookie name is looked up
  // by attribute rather than assumed to live on it.
  const csrfCookieSource = document.querySelector('[data-csrf-cookie-name]');
  const selectEnhancements = new WeakMap();
  const ACCOUNT_CACHE_KEY = 'cavora.admin.account.v1';
  const ACCOUNT_CACHE_MAX_AGE_MS = 5 * 60 * 1_000;
  let openSelect;
  let selectSequence = 0;
  let accountRequest;
  let customSelectGlobalsBound = false;

  const readAccountCache = () => {
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(ACCOUNT_CACHE_KEY) ?? 'null');
      return cached?.member && Number.isFinite(cached.cachedAt) ? cached : undefined;
    } catch {
      window.sessionStorage.removeItem(ACCOUNT_CACHE_KEY);
      return undefined;
    }
  };

  const writeAccountCache = (member) => {
    try {
      window.sessionStorage.setItem(
        ACCOUNT_CACHE_KEY,
        JSON.stringify({ cachedAt: Date.now(), member }),
      );
    } catch {
      // The account still renders when browser storage is unavailable.
    }
  };

  const clearAccountCache = () => {
    window.sessionStorage.removeItem(ACCOUNT_CACHE_KEY);
  };

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
        // .admin-main is a scroll container, so it clips the menu; measure the
        // available space against it rather than the viewport.
        const clipper = control.closest('.admin-main');
        const clipRect = clipper?.getBoundingClientRect();
        const boundsTop = clipRect ? Math.max(clipRect.top, 0) : 0;
        const boundsBottom = clipRect
          ? Math.min(clipRect.bottom, window.innerHeight)
          : window.innerHeight;
        const spaceBelow = boundsBottom - controlRect.bottom - 12;
        const spaceAbove = controlRect.top - boundsTop - 12;
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

    if (!customSelectGlobalsBound) {
      document.addEventListener('pointerdown', (event) => {
        if (openSelect && !openSelect.control.contains(event.target)) openSelect.close();
      });
      window.addEventListener('resize', () => openSelect?.close());
      customSelectGlobalsBound = true;
    }
  };

  const BRAND_GOLD = '#ffb300';
  const DANGER_RED = '#e5484d';
  const NOTIFY_ICONS = Object.freeze({
    error: 'error',
    info: 'info',
    success: 'success',
    warning: 'warning',
  });
  const NOTIFY_DURATION_MS = Object.freeze({ error: 4_200, info: 2_600, success: 2_600 });

  /* SweetAlert stamps `height: auto !important` on <body> for every backdrop
     dialog. body.admin-page is 100dvh with overflow hidden and .admin-shell
     takes its height from it, so letting that through collapses the shell to
     its content height — the sidebar stops short and a white band shows under
     it on any page whose content is shorter than the viewport. Every dialog
     this shell opens keeps the body sized by the shell instead. */
  const KEEP_SHELL_HEIGHT = Object.freeze({ heightAuto: false });

  // Centred, auto-dismissing dialog — the same treatment the storefront uses
  // for its notifications, so the two surfaces behave alike.
  const notify = (message, type = 'info') => {
    if (typeof window.Swal === 'undefined') return;
    const icon = NOTIFY_ICONS[type] ?? 'info';
    void window.Swal.fire({
      ...KEEP_SHELL_HEIGHT,
      icon,
      iconColor: icon === 'error' ? DANGER_RED : BRAND_GOLD,
      title: message,
      position: 'center',
      timer: NOTIFY_DURATION_MS[type] ?? NOTIFY_DURATION_MS.info,
      timerProgressBar: true,
      showConfirmButton: false,
      showClass: { popup: 'cavora-swal-show' },
      hideClass: { popup: 'cavora-swal-hide' },
      customClass: {
        container: 'cavora-toast-container',
        popup: 'cavora-toast-popup',
        icon: 'cavora-toast-icon',
        title: 'cavora-toast-title',
        htmlContainer: 'cavora-toast-message',
        timerProgressBar: 'cavora-toast-progress',
      },
    });
  };

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

    /* Names this call as coming from the admin panel. /users/me and /auth/* are
       the same endpoints the storefront calls, so the server cannot tell the
       two surfaces apart by path; this is what selects the admin cookie pair. */
    headers.set('x-cavora-surface', 'admin');

    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfCookieName = csrfCookieSource?.dataset.csrfCookieName;
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

  const feedbackTimers = new WeakMap();
  // Inline text under a form, not a dialog — it keeps its own, longer timings.
  const FEEDBACK_DURATION_MS = Object.freeze({ info: 3_500, success: 3_000 });

  const feedback = (form, message = '', type = 'info') => {
    const element = form?.querySelector('[data-form-feedback]');
    if (!(element instanceof HTMLElement)) return;
    window.clearTimeout(feedbackTimers.get(element));
    element.textContent = message;
    element.dataset.feedbackType = type;
    element.classList.toggle('is-visible', Boolean(message));
    // Errors stay until dismissed so the reason for a failure is not lost.
    if (!message || type === 'error') return;
    feedbackTimers.set(
      element,
      window.setTimeout(() => {
        element.textContent = '';
        element.classList.remove('is-visible');
      }, FEEDBACK_DURATION_MS[type] ?? FEEDBACK_DURATION_MS.info),
    );
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

  // Admin lists render in one shot, so ask for the largest page the API
  // allows (adminValidator caps it at 100) instead of paging.
  const listUrl = (path, form, page = 1, limit = 100) => {
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

  // Two-line table cell: a primary value with muted supporting detail beneath.
  // Keeps wide records readable without adding another column.
  const cellStack = (primary, secondary = '', secondaryTitle = '') => {
    const element = document.createElement('td');
    element.className = 'cell-stack';
    const lead = document.createElement('strong');
    lead.textContent = String(primary ?? '');
    element.append(lead);
    if (secondary) {
      const detail = document.createElement('small');
      detail.textContent = String(secondary);
      if (secondaryTitle) detail.title = String(secondaryTitle);
      element.append(detail);
    }
    return element;
  };

  // Single-line cell for a value with no natural length limit — a post title,
  // an author and email. A plain cell() never wraps and never stops growing, so
  // the longest row decided how wide the whole table had to be; this one cuts
  // off with an ellipsis and keeps the full value in the tooltip.
  // `title` defaults to the shown value; pass it when the cell displays an
  // abbreviation and the tooltip should carry the long form.
  const cellTruncate = (value = '', title = value) => {
    const element = document.createElement('td');
    element.className = 'cell-truncate';
    // The cap lives on an inner block, not the cell: a table column sizes to
    // its content, and an auto-layout table is free to ignore max-width on the
    // td itself and stretch anyway.
    const inner = document.createElement('span');
    inner.textContent = String(value ?? '');
    element.title = String(title ?? '');
    element.append(inner);
    return element;
  };

  // Free-text cell: wraps and clamps to a single line so one long message cannot
  // stretch the table sideways. The full text belongs in the detail panel.
  const cellClamp = (value = '') => {
    const element = document.createElement('td');
    element.className = 'cell-clamp';
    const inner = document.createElement('span');
    inner.textContent = String(value ?? '');
    element.title = String(value ?? '');
    element.append(inner);
    return element;
  };

  // Object ids are unreadable at full length but still worth showing so an
  // admin can copy or search one; abbreviate and keep the full value in title.
  const shortId = (value) => {
    const text = String(value ?? '');
    return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
  };

  const actionButton = (label, action, variant = '') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button button--small${variant ? ` button--${variant}` : ''}`;
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  };

  /* One implementation of the destructive row action for every list page:
     the confirm dialog, the DELETE request, the notice and the reload all
     live here so the pages only describe what is being removed. */
  const deleteButton = ({ endpoint, label = 'Delete', notice, text, title, onDone }) => {
    const button = actionButton(label, async () => {
      const confirmed = await confirmAction({
        title,
        text,
        confirmText: 'Delete',
        danger: true,
      });
      if (!confirmed) return;
      button.disabled = true;
      try {
        await request(endpoint, { method: 'DELETE' });
        notify(notice ?? 'Record deleted.', 'success');
        await onDone?.();
      } catch (error) {
        reportError(error);
        button.disabled = false;
      }
    });
    button.classList.add('button--danger');
    return button;
  };

  // Actions cell: keeps the row buttons evenly spaced whether there is one or
  // several, so adding Delete cannot upset a table's alignment.
  const actionsCell = (...nodes) => {
    const element = document.createElement('td');
    element.className = 'cell-actions';
    const group = document.createElement('div');
    group.className = 'cell-actions__group';
    group.append(...nodes);
    element.append(group);
    return element;
  };

  const badge = (status) => {
    const element = document.createElement('span');
    element.className = 'badge';
    element.textContent = String(status ?? '').replaceAll('_', ' ');
    return element;
  };

  /* Editor panels sit above the list, so opening one from a row further down
     has to carry the reader up to it. `start`, not `nearest`: the panel
     heading is the useful landing point, not whichever edge happens to be
     closest. Pages that toggle the panel through setupDisclosure call
     revealPanel on its own, so the trigger keeps owning aria-expanded. */
  const revealPanel = (panel) => {
    if (!(panel instanceof HTMLElement) || panel.hidden) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setPanelOpen = (panel, isOpen) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.hidden = !isOpen;
    if (isOpen) revealPanel(panel);
  };

  const renderRows = (tbody, empty, data, render) => {
    tbody.replaceChildren(...data.map(render));
    if (empty instanceof HTMLElement) empty.hidden = data.length > 0;
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

  const paintAvatar = (
    initialSelector,
    imageSelector,
    letter,
    avatarUrl,
    cacheBustAvatar = false,
  ) => {
    const initial = document.querySelector(initialSelector);
    const image = document.querySelector(imageSelector);
    initial?.replaceChildren(letter);
    if (initial instanceof HTMLElement) initial.hidden = Boolean(avatarUrl);
    if (image instanceof HTMLImageElement) {
      if (avatarUrl) {
        const separator = String(avatarUrl).includes('?') ? '&' : '?';
        image.src = cacheBustAvatar ? `${avatarUrl}${separator}v=${Date.now()}` : String(avatarUrl);
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.hidden = true;
      }
    }
  };

  const setAccount = (member, options = {}) => {
    const { cacheBustAvatar = false, persist = true } = options;
    const displayName = [member?.firstName, member?.lastName].filter(Boolean).join(' ');
    const name = displayName || member?.username || 'Administrator';
    const letter = name.trim().charAt(0).toUpperCase() || 'A';
    const avatarUrl = member?.avatarUrl;

    // Sidebar identity
    document.querySelector('[data-identity-name]')?.replaceChildren(name);
    document.querySelector('[data-identity-email]')?.replaceChildren(member?.email ?? '');
    paintAvatar(
      '[data-identity-initial]',
      '[data-identity-avatar]',
      letter,
      avatarUrl,
      cacheBustAvatar,
    );

    if (persist) writeAccountCache(member);
    document.documentElement.classList.add('is-account-ready');
  };

  const loadAdminAccount = async (options = {}) => {
    const { force = false } = options;
    // Skipped on signed-out auth pages, which do not render the sidebar identity.
    if (!document.querySelector('[data-identity-name]')) return;
    const cached = readAccountCache();
    if (cached) setAccount(cached.member, { persist: false });
    if (!force && cached && Date.now() - cached.cachedAt < ACCOUNT_CACHE_MAX_AGE_MS) {
      return cached.member;
    }
    if (accountRequest) return accountRequest;
    accountRequest = request('/cavora/users/me')
      .then((payload) => {
        const member = payload?.data;
        setAccount(member);
        return member;
      })
      .catch((error) => {
        if (error.status === 401) clearAccountCache();
        else {
          document.documentElement.classList.add('is-account-ready');
          reportError(error);
        }
        throw error;
      })
      .finally(() => {
        accountRequest = undefined;
      });
    try {
      return await accountRequest;
    } catch {
      return undefined;
    }
  };

  const confirmAction = async (options = {}) => {
    const {
      title = 'Are you sure?',
      text = '',
      confirmText = 'Yes',
      cancelText = 'No',
      icon = 'question',
      danger = false,
    } = options;

    if (typeof window.Swal === 'undefined') {
      return window.confirm(text ? `${title}\n\n${text}` : title);
    }

    const result = await window.Swal.fire({
      ...KEEP_SHELL_HEIGHT,
      title,
      text,
      icon,
      iconColor: danger ? DANGER_RED : BRAND_GOLD,
      position: 'center',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      showClass: { popup: 'cavora-swal-show' },
      hideClass: { popup: 'cavora-swal-hide' },
      customClass: {
        container: 'cavora-swal-container',
        popup: `cavora-swal-popup${danger ? ' swal-danger' : ''}`,
        icon: 'cavora-swal-icon',
        title: 'cavora-swal-title',
        htmlContainer: 'cavora-swal-message',
        actions: 'cavora-swal-actions',
        confirmButton: 'cavora-swal-confirm',
        cancelButton: 'cavora-swal-cancel',
      },
    });

    return result.isConfirmed === true;
  };

  const imageUploadControllers = new WeakMap();
  const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const maximumImageBytes = 5 * 1024 * 1024;

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Selected image';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const imageNameFromUrl = (url) => {
    const value = String(url ?? '').split(/[?#]/)[0];
    return value.split('/').filter(Boolean).pop() ?? 'Current image';
  };

  const setupImageUploads = () => {
    document.querySelectorAll('[data-image-upload]').forEach((root) => {
      if (!(root instanceof HTMLElement)) return;
      const input = root.querySelector('.image-upload__input');
      const dropzone = root.querySelector('[data-image-upload-dropzone]');
      const preview = root.querySelector('[data-image-upload-preview]');
      const thumbnail = root.querySelector('[data-image-upload-thumbnail]');
      const thumbnailFallback = root.querySelector('[data-image-upload-fallback]');
      const name = root.querySelector('[data-image-upload-name]');
      const size = root.querySelector('[data-image-upload-size]');
      const changeButton = root.querySelector('[data-image-upload-change]');
      const removeButton = root.querySelector('[data-image-upload-remove]');
      const form = root.closest('form');
      if (
        !(input instanceof HTMLInputElement) ||
        !(dropzone instanceof HTMLButtonElement) ||
        !(preview instanceof HTMLElement) ||
        !(thumbnail instanceof HTMLImageElement) ||
        !(name instanceof HTMLElement) ||
        !(size instanceof HTMLElement)
      ) {
        return;
      }

      const existingName = root.dataset.existingInput;
      const existingControl = existingName ? form?.elements.namedItem(existingName) : undefined;
      let existingUrl =
        existingControl && 'value' in existingControl ? String(existingControl.value ?? '') : '';
      let objectUrl;

      const releaseObjectUrl = () => {
        if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      };

      const showPreview = (url, fileName, fileSize) => {
        thumbnail.src = url;
        thumbnail.alt = `Preview of ${fileName}`;
        thumbnail.hidden = false;
        if (thumbnailFallback instanceof HTMLElement) thumbnailFallback.hidden = true;
        name.textContent = fileName;
        size.textContent = fileSize;
        dropzone.hidden = true;
        preview.hidden = false;
      };

      const showEmpty = () => {
        releaseObjectUrl();
        thumbnail.removeAttribute('src');
        thumbnail.alt = 'Selected image preview';
        thumbnail.hidden = false;
        if (thumbnailFallback instanceof HTMLElement) thumbnailFallback.hidden = true;
        name.textContent = '';
        size.textContent = '';
        preview.hidden = true;
        dropzone.hidden = false;
      };

      const showExisting = () => {
        releaseObjectUrl();
        if (!existingUrl) {
          showEmpty();
          return;
        }
        showPreview(existingUrl, imageNameFromUrl(existingUrl), 'Current saved image');
      };

      const showFiles = (files) => {
        const [firstFile] = files;
        if (!firstFile) {
          showExisting();
          return;
        }
        releaseObjectUrl();
        objectUrl = window.URL.createObjectURL(firstFile);
        const totalBytes = files.reduce((total, file) => total + file.size, 0);
        showPreview(
          objectUrl,
          files.length === 1 ? firstFile.name : `${files.length} images selected`,
          files.length === 1
            ? formatFileSize(firstFile.size)
            : `${formatFileSize(totalBytes)} total`,
        );
      };

      const reportFileError = (message) => {
        input.value = '';
        showExisting();
        if (form instanceof HTMLFormElement) {
          clearFieldError(form, input.name);
          setFieldError(form, input.name, message);
          feedback(form, 'Check the highlighted fields.', 'error');
        }
      };

      const acceptFiles = (files) => {
        const maximumFiles = Math.max(1, Number(input.dataset.maxFiles) || 1);
        if (files.length > maximumFiles) {
          reportFileError(`Choose no more than ${maximumFiles} images.`);
          return;
        }
        if (files.some((file) => !imageTypes.has(file.type))) {
          reportFileError('Choose a JPG, PNG, WEBP, or AVIF image.');
          return;
        }
        if (files.some((file) => file.size > maximumImageBytes)) {
          reportFileError('Each image must be 5 MB or smaller.');
          return;
        }
        if (form instanceof HTMLFormElement) clearFieldError(form, input.name);
        showFiles(files);
      };

      const setExisting = (url) => {
        input.value = '';
        existingUrl = String(url ?? '');
        if (existingControl && 'value' in existingControl) existingControl.value = existingUrl;
        showExisting();
      };

      input.addEventListener('change', () => {
        const files = Array.from(input.files ?? []);
        if (files.length) acceptFiles(files);
        else showExisting();
      });
      thumbnail.addEventListener('load', () => {
        thumbnail.hidden = false;
        if (thumbnailFallback instanceof HTMLElement) thumbnailFallback.hidden = true;
      });
      thumbnail.addEventListener('error', () => {
        thumbnail.hidden = true;
        if (thumbnailFallback instanceof HTMLElement) thumbnailFallback.hidden = false;
      });
      dropzone.addEventListener('click', () => input.click());
      changeButton?.addEventListener('click', () => input.click());
      removeButton?.addEventListener('click', () => {
        if (input.files?.length) {
          input.value = '';
          input.dispatchEvent(new window.Event('change', { bubbles: true }));
          return;
        }
        existingUrl = '';
        if (existingControl && 'value' in existingControl) existingControl.value = '';
        showEmpty();
      });

      for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          root.classList.add('is-dragging');
        });
      }
      dropzone.addEventListener('dragleave', (event) => {
        if (
          !(event.relatedTarget instanceof window.Node) ||
          !dropzone.contains(event.relatedTarget)
        ) {
          root.classList.remove('is-dragging');
        }
      });
      dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        root.classList.remove('is-dragging');
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return;
        const transfer = new window.DataTransfer();
        for (const file of files) transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
      form?.addEventListener('reset', () => {
        window.setTimeout(() => {
          existingUrl =
            existingControl && 'value' in existingControl
              ? String(existingControl.value ?? '')
              : '';
          input.value = '';
          showExisting();
        }, 0);
      });

      imageUploadControllers.set(input, { setExisting });
      showExisting();
    });
  };

  const setImageUploadPreview = (input, url) => {
    if (!(input instanceof HTMLInputElement)) return;
    imageUploadControllers.get(input)?.setExisting(url);
  };

  const PAGE_CACHE_TTL_MS = 30_000;
  const PAGE_STATE_PREFIX = 'cavora.admin.page-state:';
  const prefetchedPages = new Map();
  let navigationSequence = 0;
  let renderedPageUrl = window.location.href;

  // The admin shell scrolls .admin-main, not the document, so a plain
  // window.scrollTo would be a no-op after navigating between pages.
  const resetScroll = () => {
    const main = document.querySelector('.admin-main');
    if (main instanceof HTMLElement) main.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const adminPageUrl = (value) => {
    const url = new window.URL(value, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith('/admin') ? url : null;
  };

  const pageStateKey = (url = window.location.href) => {
    const parsed = new window.URL(url, window.location.href);
    return `${PAGE_STATE_PREFIX}${parsed.pathname}${parsed.search}`;
  };

  const savePageState = (url = renderedPageUrl) => {
    const main = document.querySelector('.admin-main');
    if (!(main instanceof HTMLElement)) return;
    const toolbars = [...main.querySelectorAll('form.toolbar')].map((form) => ({
      values: [...new window.FormData(form).entries()]
        .filter((entry) => typeof entry[1] === 'string')
        .map(([name, value]) => [name, value]),
    }));
    // Only the filters are carried across a navigation. An editor panel is
    // deliberately not: it belongs to a record the reader picked, so it starts
    // closed on every visit and opens only when they press Edit or Select.
    try {
      window.sessionStorage.setItem(pageStateKey(url), JSON.stringify({ toolbars }));
    } catch {
      // Navigation still works if browser storage is unavailable.
    }
  };

  const restorePageState = (url) => {
    let state;
    try {
      state = JSON.parse(window.sessionStorage.getItem(pageStateKey(url)) ?? 'null');
    } catch {
      window.sessionStorage.removeItem(pageStateKey(url));
    }
    if (!state) return;

    const main = document.querySelector('.admin-main');
    if (!(main instanceof HTMLElement)) return;
    [...main.querySelectorAll('form.toolbar')].forEach((form, index) => {
      for (const [name, value] of state.toolbars?.[index]?.values ?? []) {
        const control = form.elements.namedItem(name);
        if (control && 'value' in control) control.value = value;
      }
    });
  };

  const fetchAdminPage = async (url) => {
    const key = url.href;
    const cached = prefetchedPages.get(key);
    if (cached?.html && Date.now() - cached.cachedAt < PAGE_CACHE_TTL_MS) return cached.html;
    if (cached?.promise) return cached.promise;
    const promise = window
      .fetch(key, {
        credentials: 'same-origin',
        headers: { Accept: 'text/html' },
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Admin page request failed with ${response.status}.`);
        const responseUrl = new window.URL(response.url);
        if (responseUrl.pathname === '/admin/login' && url.pathname !== '/admin/login') {
          window.location.assign(responseUrl.href);
          throw new Error('The administrator session expired.');
        }
        const html = await response.text();
        prefetchedPages.set(key, { cachedAt: Date.now(), html });
        return html;
      })
      .catch((error) => {
        prefetchedPages.delete(key);
        throw error;
      });
    prefetchedPages.set(key, { cachedAt: Date.now(), promise });
    while (prefetchedPages.size > 6) {
      prefetchedPages.delete(prefetchedPages.keys().next().value);
    }
    return promise;
  };

  const loadPageStylesheet = async (documentFragment) => {
    const current = document.querySelector('[data-page-stylesheet]');
    const incoming = documentFragment.querySelector('[data-page-stylesheet]');
    if (!(incoming instanceof HTMLElement) || incoming.tagName !== 'LINK') return;
    const incomingHref = new window.URL(incoming.getAttribute('href') ?? '', window.location.origin)
      .href;
    if (current instanceof HTMLElement && 'href' in current && current.href === incomingHref)
      return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = incomingHref;
    stylesheet.dataset.pageStylesheet = '';
    await new Promise((resolve) => {
      stylesheet.addEventListener('load', resolve, { once: true });
      stylesheet.addEventListener('error', resolve, { once: true });
      document.head.append(stylesheet);
    });
    current?.remove();
  };

  const loadPageScript = async (documentFragment) => {
    const current = document.querySelector('[data-page-script]');
    const incoming = documentFragment.querySelector('[data-page-script]');
    current?.remove();
    if (!(incoming instanceof HTMLElement) || incoming.tagName !== 'SCRIPT') return;
    const incomingSource = incoming.getAttribute('src');
    if (!incomingSource) return;
    const script = document.createElement('script');
    script.src = new window.URL(incomingSource, window.location.origin).href;
    script.dataset.pageScript = '';
    await new Promise((resolve, reject) => {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.body.append(script);
    });
  };

  const updateActiveNavigation = (url) => {
    document.querySelectorAll('.admin-nav__link').forEach((link) => {
      if (!(link instanceof HTMLElement) || link.tagName !== 'A' || !('href' in link)) return;
      const active = new window.URL(link.href).pathname === url.pathname;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const navigateAdmin = async (url, options = {}) => {
    const { pushHistory = true } = options;
    const main = document.querySelector('.admin-main');
    if (!(main instanceof HTMLElement)) {
      window.location.assign(url.href);
      return;
    }
    const navigationId = ++navigationSequence;
    savePageState(renderedPageUrl);
    main.classList.add('is-page-leaving');
    main.setAttribute('aria-busy', 'true');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    try {
      const html = await fetchAdminPage(url);
      if (navigationId !== navigationSequence) return;
      const parsed = new window.DOMParser().parseFromString(html, 'text/html');
      const incomingMain = parsed.querySelector('.admin-main');
      if (!(incomingMain instanceof HTMLElement)) throw new Error('Admin page content is missing.');

      await loadPageStylesheet(parsed);
      main.innerHTML = incomingMain.innerHTML;
      document.title = parsed.title || document.title;
      updateActiveNavigation(url);
      restorePageState(url.href);
      setupCustomSelects();
      setupImageUploads();
      await loadPageScript(parsed);
      if (pushHistory) window.history.pushState({ cavoraAdmin: true }, '', url.href);
      renderedPageUrl = url.href;
      main.classList.remove('is-page-leaving');
      main.classList.add('is-page-entering');
      main.removeAttribute('aria-busy');
      window.requestAnimationFrame(() => {
        main.classList.remove('is-page-entering');
        resetScroll();
      });
      window.setTimeout(resetScroll, 250);
    } catch {
      if (navigationId !== navigationSequence) return;
      window.location.assign(url.href);
    }
  };

  const setupAdminNavigation = () => {
    if (!document.querySelector('.admin-nav')) return;
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.history.replaceState({ cavoraAdmin: true }, '', window.location.href);
    restorePageState(renderedPageUrl);
    window.requestAnimationFrame(resetScroll);
    window.setTimeout(resetScroll, 250);
    const findLink = (target) => {
      const link =
        target instanceof window.Element
          ? target.closest('.admin-nav__link, .admin-identity, [data-admin-link]')
          : null;
      return link instanceof HTMLElement && link.tagName === 'A' && 'href' in link ? link : null;
    };
    const prefetchLink = (target) => {
      const link = findLink(target);
      const url = link ? adminPageUrl(link.href) : null;
      if (url && url.href !== renderedPageUrl) void fetchAdminPage(url).catch(() => undefined);
    };
    document.addEventListener('pointerover', (event) => prefetchLink(event.target));
    document.addEventListener('focusin', (event) => prefetchLink(event.target));
    document.addEventListener('click', (event) => {
      const link = findLink(event.target);
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === '_blank'
      ) {
        return;
      }
      const url = adminPageUrl(link.href);
      if (!url || url.href === renderedPageUrl) return;
      event.preventDefault();
      void navigateAdmin(url);
    });
    window.addEventListener('popstate', () => {
      const url = adminPageUrl(window.location.href);
      if (url) void navigateAdmin(url, { pushHistory: false });
    });
  };

  const logoutButton = document.querySelector('[data-admin-logout]');
  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener('click', async () => {
      const confirmed = await confirmAction({
        title: 'Do you want to logout?',
        text: 'You will need to sign in again to reach the admin workspace.',
        confirmText: 'Yes',
        cancelText: 'No',
      });
      if (!confirmed) return;

      logoutButton.disabled = true;
      logoutButton.textContent = 'Logging out...';
      try {
        await request('/cavora/auth/logout', { method: 'POST' });
        clearAccountCache();
        window.location.assign('/admin/login');
      } catch (error) {
        reportError(error);
        logoutButton.disabled = false;
        logoutButton.textContent = 'Log out';
      }
    });
  }

  setupAdminNavigation();
  setupCustomSelects();
  setupImageUploads();

  window.CavoraAdmin = Object.freeze({
    actionButton,
    actionsCell,
    badge,
    cell,
    cellClamp,
    cellStack,
    cellTruncate,
    clearValidation,
    deleteButton,
    confirm: confirmAction,
    feedback,
    formatDate,
    formatMoney,
    getAccount: loadAdminAccount,
    getCookie,
    listUrl,
    notify,
    renderRows,
    reportError,
    revealPanel,
    request,
    setAccount,
    setFieldError,
    setImageUploadPreview,
    setBusy,
    setPanelOpen,
    shortId,
    setupValidation,
    setupDisclosure(triggerSelector, panelSelector) {
      const trigger = document.querySelector(triggerSelector);
      const panel = document.querySelector(panelSelector);
      if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
      const setOpen = (isOpen) => {
        panel.hidden = !isOpen;
        trigger.setAttribute('aria-expanded', String(isOpen));
        // preventScroll so focusing the first field cannot override the
        // caller's scroll to the top of the panel.
        if (isOpen) {
          panel.querySelector('input, select, textarea')?.focus({ preventScroll: true });
        }
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
