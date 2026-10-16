export const statusLabels = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '启用',
  inactive: '停用',
  disabled: '禁用',
};
export const roleLabels = {
  user: '用户',
  admin: '管理员',
  superadmin: '平台管理员',
};
export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}
export const recordContext = (row) =>
  [row.diningHallName, row.stallName, row.dishName || row.name]
    .filter(Boolean)
    .join(' · ');
