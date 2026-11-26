/** Transient composer commands must not remount a page when consumed. */
export function pageIdentity(route) {
  // Search and campus map own query changes; remounting drops transient location/navigation state.
  if (route.name === 'dishSearch') return route.path;
  if (route.name === 'campusMap') return 'campusMap';
  if (route.name !== 'community') return route.fullPath;
  const query = { ...route.query };
  delete query.action;
  return route.path + JSON.stringify(query) + (route.hash || '');
}
