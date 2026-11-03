import { http, ApiError } from './http.js';
const id = (value) => encodeURIComponent(value);
export function venuePath(type, target) {
  if (!['hall', 'stall'].includes(type))
    throw new ApiError('评价对象类型不合法', { code: 'VALIDATION' });
  return `/${type === 'hall' ? 'dining-halls' : 'stalls'}/${id(target)}`;
}
export const fetchVenueRating = (type, target, options = {}) =>
  http.get(venuePath(type, target) + '/rating', options);
export const fetchVenueReviews = (
  type,
  target,
  cursor = '',
  rating = 'all',
  options = {},
) =>
  http.get(venuePath(type, target) + '/reviews', {
    ...options,
    params: { size: 20, rating, ...(cursor ? { cursor } : {}) },
  });
export const fetchOwnVenueReview = (type, target, options = {}) =>
  http.get(venuePath(type, target) + '/reviews/me', options);
export const submitVenueReview = (type, target, body) =>
  http.post(venuePath(type, target) + '/reviews', body);
export const fetchVenueStatus = (submissionId, options = {}) =>
  http.get(
    `/users/me/venue-review-submissions/${id(submissionId)}/status`,
    options,
  );
export const deleteVenueReview = (reviewId) =>
  http.delete(`/users/me/venue-reviews/${id(reviewId)}`);
export const fetchVenueReplies = (
  reviewId,
  cursor = '',
  mine = false,
  options = {},
) =>
  http.get(`/venue-reviews/${id(reviewId)}/replies${mine ? '/me' : ''}`, {
    ...options,
    params: { size: 20, ...(cursor ? { cursor } : {}) },
  });
export const submitVenueReply = (reviewId, body) =>
  http.post(`/venue-reviews/${id(reviewId)}/replies`, body);
export const deleteVenueReply = (replyId) =>
  http.delete(`/venue-review-replies/${id(replyId)}`);
export const fetchVenueReplyStatus = (replyId, options = {}) =>
  http.get(`/users/me/venue-review-replies/${id(replyId)}/status`, options);
export const likeVenueReview = (reviewId, liked) =>
  http[liked ? 'put' : 'delete'](`/venue-reviews/${id(reviewId)}/like`);
export const likeVenueReply = (replyId, liked) =>
  http[liked ? 'put' : 'delete'](`/venue-review-replies/${id(replyId)}/like`);
export const fetchMyVenueReviews = (
  page = 1,
  type,
  replies = false,
  options = {},
) =>
  http.get(`/users/me/venue-${replies ? 'review-replies' : 'reviews'}`, {
    ...options,
    params: { page, size: 20, ...(type ? { type } : {}) },
  });
export const removeVenueAsAdmin = (reviewId, reason, reply = false) =>
  http.delete(
    `/admin/venue-${reply ? 'review-replies' : 'reviews'}/${id(reviewId)}`,
    { data: { reason } },
  );
export const fetchVenueAuditDetail = (type, submissionId, options = {}) =>
  http.get(`/admin/venue-moderation/${id(type)}/${id(submissionId)}`, options);
