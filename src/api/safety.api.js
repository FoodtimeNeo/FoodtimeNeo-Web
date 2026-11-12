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
export const decideReport = (id, body) =>
  http.post(`/admin/reports/${encodeURIComponent(id)}/decision`, body);
export const fetchMyReports = (page = 1, options = {}) =>
  http.get('/users/me/reports', { ...options, params: { page, size: 20 } });
export const fetchMyModerationDecisions = (page = 1, options = {}) =>
  http.get('/users/me/moderation-decisions', {
    ...options,
    params: { page, size: 20 },
  });
