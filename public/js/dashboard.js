(() => {
  const dashboardDate = document.querySelector('[data-dashboard-date]');

  if (dashboardDate) {
    dashboardDate.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
    }).format(new Date());
  }
})();
