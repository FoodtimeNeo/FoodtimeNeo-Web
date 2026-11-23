/** Transient composer commands must not remount a page when consumed. */
export function pageIdentity(route) {
  if (route.name !== 'community') return route.fullPath;
  const query = { ...route.query };
  delete query.action;
  return route.path + JSON.stringify(query) + (route.hash || '');
}
