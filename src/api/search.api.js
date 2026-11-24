import { http } from './http.js';
import { mapPost } from './community.api.js';

// Device coordinates stay in a transient POST body, never in a URL or public cache.
export const fetchSearchCapabilities = (options = {}) =>
  http.get('/search/capabilities', options);
const catalogSearch = (resource, query, options) => {
  if (
    [query.latitude, query.longitude].some(
      (value) => value !== null && value !== undefined,
    ) ||
    query.sort === 'distance'
  )
    return http.post(`/search/${resource}/query`, query, options);
  return http.get(`/search/${resource}`, {
    ...options,
    params: query,
    paramsSerializer: { indexes: null },
  });
};
export const searchStalls = (query, options = {}) =>
  catalogSearch('stalls', query, options);
export const searchStallDishes = (query, options = {}) =>
  catalogSearch('dishes', query, options);
export async function searchNotes(query, options = {}) {
  const page = await http.post('/search/notes/query', query, options);
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, post: mapPost(item.post) })),
  };
}
