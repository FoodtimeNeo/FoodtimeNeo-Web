import { http } from './http.js';

const blockPath = (id) => `/users/${encodeURIComponent(id)}/block`;
export const fetchBlockState = (id) => http.get(blockPath(id));
export const fetchBlockedUsers = (page = 1, options = {}) =>
  http.get('/users/me/blocks', { ...options, params: { page, size: 20 } });
export const setUserBlock = (id, blocked) =>
  blocked ? http.put(blockPath(id)) : http.delete(blockPath(id));
export const submitReport = (targetType, targetId, reason) =>
  http.post('/reports', { targetType, targetId, reason });
export const fetchReports = (page = 1, options = {}) =>
  http.get('/admin/reports', { ...options, params: { page, size: 20 } });
export const reviewReport = (id) =>
  http.put(`/admin/reports/${encodeURIComponent(id)}/review`);
