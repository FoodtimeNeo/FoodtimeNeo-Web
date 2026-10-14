export const navigationItems = [
  { name: 'home', label: '首页', icon: '⌂' },
  { name: 'canteenList', label: '食堂', icon: '▤' },
  { name: 'reviewCreate', label: '点评', icon: '✎' },
  { name: 'profile', label: '我的', icon: '◯' },
];

export function resolveBreadcrumbs(route) {
  const crumbs = route.matched
    .filter((record) => record.name && record.meta.title)
    .map((record) => ({ name: record.name, title: record.meta.title }));

  if (crumbs[0]?.name !== 'home') {
    crumbs.unshift({ name: 'home', title: '首页' });
  }

  return crumbs;
}

export function resolveActiveNavigation(route) {
  const names = new Set(navigationItems.map((item) => item.name));
  const section = route.meta.nav;

  if (names.has(section)) return section;

  const matched = [...route.matched].reverse();
  return matched.find((record) => names.has(record.name))?.name ?? null;
}
