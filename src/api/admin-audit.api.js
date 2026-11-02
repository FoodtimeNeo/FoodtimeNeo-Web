import { http, ApiError } from './http.js';
const types = ['review', 'dish', 'stall', 'photo', 'dish-review-reply'];
export function fetchAuditItems(
  status = 'pending',
  page = 1,
  options = {},
  type,
) {
  if (type !== undefined && !types.includes(type))
    throw new ApiError('审核类型无效', { code: 'VALIDATION' });
  return http.get('/admin/moderation', {
    ...options,
    params: { status, page, size: 20, ...(type ? { type } : {}) },
  });
}
export function submitAudit(type, id, { action, reason, price }) {
  if (!types.includes(type) || !['approve', 'reject'].includes(action))
    throw new ApiError('审核参数无效', { code: 'VALIDATION' });
  return http.post('/admin/moderation/' + type + '/' + encodeURIComponent(id), {
    action,
    reason,
    ...(type === 'dish' && price !== undefined ? { price } : {}),
  });
}
export const fetchModerationLogs = (page = 1, options = {}) =>
  http.get('/admin/moderation/logs', {
    ...options,
    params: { page, size: 20 },
  });
