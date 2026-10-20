export const navigationItems = [
  { name: 'home', label: '首页', icon: '⌂', code: '00' },
  { name: 'canteenList', label: '食堂', icon: '▤', code: '01' },
  { name: 'community', label: '社区', icon: '✦', code: '02' },
  { name: 'profile', label: '我的', icon: '◯', code: '03' },
];

const managementItem = {
  name: 'adminAudit',
  label: '管理',
  icon: '◇',
  code: '03',
};

export function getNavigationItems(isAdmin) {
  return isAdmin
    ? [
        navigationItems[0],
        navigationItems[1],
        navigationItems[2],
        managementItem,
        { ...navigationItems[3], code: '04' },
      ]
    : navigationItems;
}

export function navigationTarget(item, route) {
  return resolveActiveNavigation(route) === item.name
    ? route.fullPath
    : { name: item.name };
}

export function resolveBreadcrumbs(route) {
  if (route.name === 'dishReviewCreate') {
    const { canteenId, stallId, dishId } = route.params;
    return [
      { name: 'home', title: '首页' },
      { name: 'canteenList', title: '食堂' },
      { name: 'canteenDetail', title: '食堂详情', params: { canteenId } },
      { name: 'stallDetail', title: '档口', params: { canteenId, stallId } },
      {
        name: 'dishDetail',
        title: '菜品',
        params: { canteenId, stallId, dishId },
      },
      { name: 'dishReviewCreate', title: '写点评' },
    ];
  }
  if (route.name === 'communityDetail') {
    return [
      { name: 'home', title: '首页' },
      { name: 'community', title: '社区' },
      { name: 'communityDetail', title: '帖子详情' },
    ];
  }
  const crumbs = (route.matched || [])
    .filter((record) => record.name && record.meta?.title)
    .map((record) => ({ name: record.name, title: record.meta.title }));

  if (crumbs[0]?.name !== 'home') {
    crumbs.unshift({ name: 'home', title: '首页' });
  }

  return crumbs;
}

export function resolveActiveNavigation(route) {
  if (route.meta?.requiresAdmin || route.meta?.requiresSuperadmin)
    return managementItem.name;
  if (route.name === 'home' || route.matched?.some((r) => r.name === 'home'))
    return 'home';
  const names = new Set(navigationItems.map((item) => item.name));
  const section = route.meta?.nav;

  if (names.has(section)) return section;

  const matched = [...(route.matched || [])].reverse();
  return matched.find((record) => names.has(record.name))?.name ?? null;
}
