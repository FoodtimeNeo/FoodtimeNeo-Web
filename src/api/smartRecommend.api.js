import { http } from './http.js';

export const fetchDishTags = (options = {}) =>
  http.get('/dishes/tags', options);

export const querySmartDishRecommendations = (payload = {}, options = {}) =>
  http.post('/recommendations/dishes/query', payload, options);
