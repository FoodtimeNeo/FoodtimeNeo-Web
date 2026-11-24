import { http } from './http.js';
import { mapPost } from './community.api.js';

// Device coordinates stay in a transient POST body, never in a URL or public cache.
export const fetchSearchCapabilities = (options = {}) =>
  http.get('/search/capabilities', options);
export const searchStalls = (query, options = {}) =>
  http.post('/search/stalls/query', query, options);
export const searchStallDishes = (query, options = {}) =>
  http.post('/search/dishes/query', query, options);
export async function searchNotes(query, options = {}) {
  const page = await http.post('/search/notes/query', query, options);
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, post: mapPost(item.post) })),
  };
}
