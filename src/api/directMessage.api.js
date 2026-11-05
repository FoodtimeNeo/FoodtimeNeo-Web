import { http } from './http.js';

export const fetchConversations = (page = 1, options = {}) =>
  http.get('/users/me/conversations', {
    ...options,
    params: { page, size: 20 },
  });

export const fetchConversationUnread = (options = {}) =>
  http.get('/users/me/conversations/unread-count', options);

export const fetchConversation = (id) =>
  http.get(`/users/me/conversations/${encodeURIComponent(id)}`);

export const startConversation = (userId) =>
  http.post('/users/me/conversations', { userId });

export const fetchConversationMessages = (id, { cursor } = {}) =>
  http.get(`/users/me/conversations/${encodeURIComponent(id)}/messages`, {
    params: { size: 30, ...(cursor ? { cursor } : {}) },
  });

export const sendDirectMessage = (id, { content, clientRequestId }) =>
  http.post(`/users/me/conversations/${encodeURIComponent(id)}/messages`, {
    content,
    clientRequestId,
  });

export const markConversationRead = (id) =>
  http.post(`/users/me/conversations/${encodeURIComponent(id)}/read`);

export const hideConversation = (id) =>
  http.delete(`/users/me/conversations/${encodeURIComponent(id)}`);
