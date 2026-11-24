/** Transient composer commands must not remount a page when consumed. */
export function pageIdentity(route) {
  // Search owns query changes; remounting here would drop an explicitly granted transient location.
  if (route.name === 'dishSearch') return route.path;
  if (route.name !== 'community') return route.fullPath;
  const query = { ...route.query };
  delete query.action;
  return route.path + JSON.stringify(query) + (route.hash || '');
}
