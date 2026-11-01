import { http } from './http.js';

const userIdPath = (userId) => encodeURIComponent(userId);

export const followUser = (userId) =>
  http.put(`/users/${userIdPath(userId)}/follow`);

export const unfollowUser = (userId) =>
  http.delete(`/users/${userIdPath(userId)}/follow`);

export const fetchFollowStatus = (userId, options = {}) =>
  http.get(`/users/${userIdPath(userId)}/follow-status`, options);

export const fetchFollowers = (userId, page = 1, options = {}) =>
  http.get(`/users/${userIdPath(userId)}/followers`, {
    ...options,
    params: { page, size: 20 },
  });

export const fetchFollowing = (userId, page = 1, options = {}) =>
  http.get(`/users/${userIdPath(userId)}/following`, {
    ...options,
    params: { page, size: 20 },
  });
