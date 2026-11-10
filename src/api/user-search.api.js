import { http } from './http.js';

export const searchUsers = (q, page = 1, options = {}) =>
  http.get('/users/search', { ...options, params: { q, page, size: 20 } });
