import { http } from './http.js';

const base = '/users/me/favorite-groups';
export const fetchFavoriteGroups = (kind) =>
  http.get(base, { params: { kind } });
export const createFavoriteGroup = (kind, name) =>
  http.post(base, { kind, name });
export const updateFavoriteGroup = (id, body) =>
  http.put(`${base}/${encodeURIComponent(id)}`, body);
export const deleteFavoriteGroup = (id) =>
  http.delete(`${base}/${encodeURIComponent(id)}`);
export const fetchFavoriteGroupMemberships = (kind, targetId) =>
  http.get(`${base}/memberships`, { params: { kind, targetId } });
export const addFavoriteGroupMember = (groupId, targetId) =>
  http.put(
    `${base}/${encodeURIComponent(groupId)}/members/${encodeURIComponent(targetId)}`,
  );
export const removeFavoriteGroupMember = (groupId, targetId) =>
  http.delete(
    `${base}/${encodeURIComponent(groupId)}/members/${encodeURIComponent(targetId)}`,
  );
