(() => {
  const admin = window.CavoraAdmin;
  const bookingRows = document.querySelector('[data-dashboard-booking-rows]');
  const departureList = document.querySelector('[data-dashboard-departures]');
  if (!admin || !(bookingRows instanceof HTMLElement) || !(departureList instanceof HTMLElement)) {
    return;
  }

  const setText = (selector, value) => {
    document.querySelector(selector)?.replaceChildren(String(value));
  };

  const dashboardDate = document.querySelector('[data-dashboard-date]');
  if (dashboardDate instanceof HTMLElement) {
    dashboardDate.textContent = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    }).format(new Date());
  }

  const renderBookings = (bookings) => {
    bookingRows.replaceChildren();
    if (!bookings.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'dashboard-table__empty';
      cell.textContent = 'No bookings have been created yet.';
      row.append(cell);
      bookingRows.append(row);
      return;
    }

    for (const booking of bookings) {
      const row = document.createElement('tr');
      const reference = admin.cell(booking.reference);
      reference.className = 'dashboard-table__reference';
      row.append(
        reference,
        admin.cell(`#${booking.tourId}`),
        admin.cell(String(booking.travelers)),
        admin.cell(admin.formatMoney(booking.totalCents, booking.currency)),
      );
      const status = admin.cell();
      status.append(admin.badge(booking.status));
      row.append(status);
      bookingRows.append(row);
    }
  };

  const renderDepartures = (departures) => {
    departureList.replaceChildren();
    if (!departures.length) {
      const empty = document.createElement('p');
      empty.className = 'dashboard-empty';
      empty.textContent = 'No scheduled departures.';
      departureList.append(empty);
      return;
    }

    for (const departure of departures.slice(0, 3)) {
      const date = new Date(departure.startDate);
      const card = document.createElement('article');
      card.className = 'departure-item';
      const dateBlock = document.createElement('time');
      dateBlock.dateTime = departure.startDate;
      const month = document.createElement('span');
      month.textContent = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
      const day = document.createElement('strong');
      day.textContent = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date);
      dateBlock.append(month, day);

      const details = document.createElement('div');
      details.className = 'departure-item__details';
      const title = document.createElement('strong');
      title.textContent = `Tour #${departure.tourId}`;
      const seats = document.createElement('span');
      seats.textContent = `${departure.reservedSeats} of ${departure.capacity} seats reserved`;
      const capacityTrack = document.createElement('span');
      capacityTrack.className = 'departure-item__capacity';
      const capacityFill = document.createElement('span');
      const occupancy = Math.min(
        100,
        Math.round((departure.reservedSeats / Math.max(1, departure.capacity)) * 100),
      );
      capacityFill.style.width = `${occupancy}%`;
      capacityTrack.append(capacityFill);
      details.append(title, seats, capacityTrack);

      const occupancyLabel = document.createElement('small');
      occupancyLabel.textContent = `${occupancy}%`;
      card.append(dateBlock, details, occupancyLabel);
      departureList.append(card);
    }
  };

  const fulfilled = (result) => (result.status === 'fulfilled' ? result.value : undefined);

  const load = async () => {
    const accountPromise = admin.getAccount().then((member) => {
      const firstName = member?.firstName || member?.username;
      if (firstName) setText('[data-dashboard-name]', firstName);
    });
    const results = await Promise.allSettled([
      admin.request('/cavora/admin/tours?page=1&limit=1'),
      admin.request('/cavora/admin/bookings?page=1&limit=5'),
      admin.request('/cavora/admin/users?page=1&limit=1'),
      admin.request('/cavora/admin/departures?page=1&limit=3&status=SCHEDULED'),
      admin.request('/cavora/admin/posts?page=1&limit=1&status=PUBLISHED'),
      admin.request('/cavora/admin/contact-messages?page=1&limit=1&status=NEW'),
    ]);
    await accountPromise;

    const [tours, bookings, members, departures, posts, messages] = results.map(fulfilled);
    if (tours) setText('[data-dashboard-tour-count]', tours.meta?.total ?? 0);
    if (bookings) {
      setText('[data-dashboard-booking-count]', bookings.meta?.total ?? 0);
      renderBookings(bookings.data ?? []);
    }
    if (members) {
      setText('[data-dashboard-member-count]', members.stats?.active ?? 0);
      setText(
        '[data-dashboard-member-note]',
        `${members.stats?.total ?? members.meta?.total ?? 0} registered accounts`,
      );
    }
    if (departures) {
      setText('[data-dashboard-departure-count]', departures.meta?.total ?? 0);
      renderDepartures(departures.data ?? []);
    }
    if (posts) setText('[data-dashboard-post-count]', posts.meta?.total ?? 0);
    if (messages) setText('[data-dashboard-message-count]', messages.meta?.total ?? 0);

    const recentBookings = bookings?.data ?? [];
    const pendingBookings = recentBookings.filter((booking) =>
      ['PENDING_PAYMENT', 'CANCELLATION_REQUESTED'].includes(booking.status),
    ).length;
    const newMessages = messages?.meta?.total ?? 0;
    if (newMessages > 0) {
      setText(
        '[data-dashboard-focus]',
        `${newMessages} new message${newMessages === 1 ? '' : 's'} need attention`,
      );
    } else if (pendingBookings > 0) {
      setText(
        '[data-dashboard-focus]',
        `${pendingBookings} recent booking${pendingBookings === 1 ? '' : 's'} need review`,
      );
    } else {
      setText('[data-dashboard-focus]', 'Operations are clear and up to date');
    }

    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') admin.reportError(failed.reason);
  };

  void load();
})();
