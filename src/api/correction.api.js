import { http } from './http.js';

const mine = '/users/me/catalog-corrections';
const admin = '/admin/catalog-corrections';

export const createCatalogCorrection = (payload) => http.post(mine, payload);
export const fetchMyCatalogCorrections = (params = {}) =>
  http.get(mine, { params });
export const fetchMyCatalogCorrection = (id) =>
  http.get(`${mine}/${encodeURIComponent(id)}`);
export const fetchAdminCatalogCorrections = (params = {}) =>
  http.get(admin, { params });
export const fetchAdminCatalogCorrection = (id) =>
  http.get(`${admin}/${encodeURIComponent(id)}`);
export const decideCatalogCorrection = (id, payload) =>
  http.post(`${admin}/${encodeURIComponent(id)}/decision`, payload);
