import { http, ApiError } from './http.js';
export const fetchUsers = (page = 1, q = '', options = {}) =>
  http.get('/admin/users', { ...options, params: { page, size: 20, q } });
export function updateUserAccess(id, { role, status }) {
  if (
    !['user', 'admin', 'superadmin'].includes(role) ||
    !['active', 'disabled'].includes(status)
  )
    throw new ApiError('用户权限参数无效', { code: 'VALIDATION' });
  return http.put('/admin/users/' + encodeURIComponent(id), { role, status });
}
