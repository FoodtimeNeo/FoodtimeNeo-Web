import { http } from './http.js';

const base = '/users/me/browsing-history';

export const fetchHistorySettings = () => http.get(`${base}/settings`);
export const updateHistorySettings = (body) =>
  http.put(`${base}/settings`, body);
export const fetchBrowsingHistory = (kind, params = {}) =>
  http.get(base, { params: { kind, ...params } });
export const recordBrowsingHistory = (kind, targetId, body) =>
  http.put(
    `${base}/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
    body,
  );
export const deleteBrowsingHistory = (kind, targetId) =>
  http.delete(
    `${base}/${encodeURIComponent(kind)}/${encodeURIComponent(targetId)}`,
  );
export const clearBrowsingHistory = (kind) =>
  http.delete(base, { params: { kind } });
