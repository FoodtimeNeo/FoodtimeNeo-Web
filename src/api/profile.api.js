import { http, ApiError } from './http.js';
export const fetchOwnReviews = (page = 1, options = {}) =>
  http.get('/users/me/reviews', { ...options, params: { page, size: 20 } });
export const deleteOwnReview = (id) =>
  http.delete(`/users/me/reviews/${encodeURIComponent(id)}`);
const submissionPaths = {
  review: 'review-submissions',
  dish: 'dish-submissions',
  stall: 'stall-submissions',
  photo: 'image-submissions',
};
export function fetchOwnSubmissions(kind, page = 1, options = {}) {
  if (!submissionPaths[kind])
    throw new ApiError('未知投稿类型', { code: 'VALIDATION' });
  return http.get('/users/me/' + submissionPaths[kind], {
    ...options,
    params: { page, size: 20 },
  });
}
