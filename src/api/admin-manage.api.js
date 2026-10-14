import { http } from './http.js';

export const fetchManagedCanteens = () => http.get('/canteens');

export const fetchManagedStalls = (canteenId) =>
  http.get(`/canteens/${encodeURIComponent(canteenId)}/stalls`);

export function saveCanteen(id, payload) {
  return id
    ? http.put(`/canteens/${encodeURIComponent(id)}`, payload)
    : http.post('/canteens', payload);
}

export const deleteCanteen = (id) =>
  http.delete(`/canteens/${encodeURIComponent(id)}`);

export function saveStall(canteenId, id, payload) {
  return id
    ? http.put(`/stalls/${encodeURIComponent(id)}`, payload)
    : http.post(`/canteens/${encodeURIComponent(canteenId)}/stalls`, payload);
}

export const deleteStall = (id) =>
  http.delete(`/stalls/${encodeURIComponent(id)}`);

export function saveDish(id, payload) {
  return id
    ? http.put(`/dishes/${encodeURIComponent(id)}`, payload)
    : http.post('/dishes', payload);
}

export const deleteDish = (id) =>
  http.delete(`/dishes/${encodeURIComponent(id)}`);
