import { http } from './http.js';

export const fetchOwnMessages = (page = 1, options = {}) =>
  http.get('/users/me/messages', { ...options, params: { page, size: 20 } });

export const fetchUnreadMessageCount = (options = {}) =>
  http.get('/users/me/messages/unread-count', options);

export const markMessageRead = (id) =>
  http.post(`/users/me/messages/${encodeURIComponent(id)}/read`);

export const markAllMessagesRead = () =>
  http.post('/users/me/messages/read-all');
