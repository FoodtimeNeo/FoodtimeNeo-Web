import { http } from './http.js';
export const searchDishes = (q, page = 1, options = {}, filters = {}) => {
  const params = { q, page, size: 20, sort: filters.sort || 'relevance' };
  const halls = Array.isArray(filters.diningHallIds)
    ? filters.diningHallIds.filter(Boolean)
    : [];
  if (halls.length) params.diningHallIds = halls.join(',');
  for (const key of ['minPrice', 'maxPrice', 'minRating']) {
    const value = filters[key];
    if (value !== null && value !== undefined && value !== '')
      params[key] = value;
  }
  return http.get('/dishes/search', { ...options, params });
};
const favoritePath = (id) =>
  `/users/me/dish-favorites/${encodeURIComponent(id)}`;
export const fetchDishFavorite = (id, options = {}) =>
  http.get(favoritePath(id), options);
export const setDishFavorite = (id, saved) =>
  saved ? http.put(favoritePath(id)) : http.delete(favoritePath(id));
export const fetchFavoriteDishes = (page = 1, options = {}) =>
  http.get('/users/me/dish-favorites', {
    ...options,
    params: { page, size: 20 },
  });
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
