import { http, ApiError } from './http.js';
function path(type) {
  if (!['dining-halls', 'stalls', 'dishes'].includes(type))
    throw new ApiError('目录类型无效', { code: 'VALIDATION' });
  return '/admin/catalog/' + type;
}
export const fetchManagedItems = (
  type,
  page = 1,
  parentId = '',
  options = {},
) =>
  http.get(path(type), {
    ...options,
    params: { page, size: 20, ...(parentId ? { parentId } : {}) },
  });
export const fetchManagedItem = (type, id, options = {}) =>
  http.get(path(type) + '/' + encodeURIComponent(id), options);
export function catalogPayload(type, input) {
  const body = {
    name: input.name,
    description: input.description,
    status: input.status,
  };
  if (type !== 'dining-halls') body.parentId = input.parentId;
  if (type === 'dishes') body.price = input.price;
  else {
    body.coverImageUrl = input.coverImageUrl;
    body.sortOrder = input.sortOrder;
  }
  return body;
}
export function saveManagedItem(type, id, input) {
  const body = catalogPayload(type, input);
  return id
    ? http.put(path(type) + '/' + encodeURIComponent(id), body)
    : http.post(path(type), body);
}
export const deleteManagedItem = (type, id) =>
  http.delete(path(type) + '/' + encodeURIComponent(id));
export const fetchManagedReviews = (page = 1, query = '', options = {}) =>
  http.get('/admin/reviews', {
    ...options,
    params: { page, size: 20, ...(query.trim() ? { q: query.trim() } : {}) },
  });
export const deleteManagedReview = (id, reason) =>
  http.delete('/admin/reviews/' + encodeURIComponent(id), { data: { reason } });
