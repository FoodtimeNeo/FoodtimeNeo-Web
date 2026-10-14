import { http } from './http.js';
export const fetchDish = (id, options = {}) =>
  http.get(`/dishes/${encodeURIComponent(id)}`, options);
export const fetchDishReviews = (id, page = 1, options = {}) =>
  http.get(`/dishes/${encodeURIComponent(id)}/reviews`, {
    ...options,
    params: { page, size: 20 },
  });
export const fetchDishImages = (id, page = 1, options = {}) =>
  http.get(`/dishes/${encodeURIComponent(id)}/images`, {
    ...options,
    params: { page, size: 20 },
  });
export const fetchDishRating = (id, options = {}) =>
  http.get(`/dishes/${encodeURIComponent(id)}/rating`, options);
