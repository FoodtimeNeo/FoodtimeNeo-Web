import { http } from './http.js';

export const fetchNoticeFeed = (sinceSeq = 0, limit = 20, options = {}) =>
  http.get('/users/me/notices/feed', {
    ...options,
    params: { since_seq: sinceSeq, limit },
  });

export const fetchOwnNotices = (page = 1, options = {}) =>
  http.get('/users/me/notices', { ...options, params: { page, size: 20 } });

export const markNoticeRead = (id) =>
  http.post(`/users/me/notices/${encodeURIComponent(id)}/read`);

export const fetchAdminNotices = (page = 1, options = {}) =>
  http.get('/admin/notices', { ...options, params: { page, size: 20 } });

export const fetchAdminNotice = (id, options = {}) =>
  http.get(`/admin/notices/${encodeURIComponent(id)}`, options);

export const createAdminNotice = (input) =>
  http.post('/admin/notices', { title: input.title, body: input.body });

export const updateAdminNotice = (id, input) =>
  http.put(`/admin/notices/${encodeURIComponent(id)}`, {
    title: input.title,
    body: input.body,
  });

export const deleteAdminNotice = (id) =>
  http.delete(`/admin/notices/${encodeURIComponent(id)}`);
