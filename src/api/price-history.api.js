import { http } from './http.js';
const path = (id) => `/dishes/${encodeURIComponent(id)}/price-history`;
export const fetchPriceHistory = (id, days = 0, options = {}) =>
  http.get(path(id), { ...options, params: { days } });
export const correctPriceHistory = (id, entry, body, options = {}) =>
  http.put(`/admin${path(id)}/${encodeURIComponent(entry)}`, body, options);
export const deletePriceHistory = (id, entry, expectedRevision, options = {}) =>
  http.delete(`/admin${path(id)}/${encodeURIComponent(entry)}`, {
    ...options,
    params: { expectedRevision },
  });
