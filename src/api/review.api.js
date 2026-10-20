import { http } from './http.js';
// 提交人由Cookie会话确定；只发送数据库已有的评分和正文。
export function createReview({ dishId, rating, content }) {
  return http.post(`/dishes/${encodeURIComponent(dishId)}/reviews`, {
    rating,
    content,
  });
}

export function setReviewLike(id, liked) {
  const path = `/reviews/${encodeURIComponent(id)}/like`;
  return liked ? http.put(path) : http.delete(path);
}

export const fetchReviewReplies = (id, cursor = '', options = {}) =>
  http.get(`/reviews/${encodeURIComponent(id)}/replies`, {
    ...options,
    params: { size: 20, ...(cursor ? { cursor } : {}) },
  });
export const createReviewReply = (
  id,
  { content, replyToId, clientRequestId },
) =>
  http.post(`/reviews/${encodeURIComponent(id)}/replies`, {
    content,
    replyToId: replyToId || null,
    clientRequestId,
  });
export const deleteReviewReply = (id) =>
  http.delete(`/review-replies/${encodeURIComponent(id)}`);
export const fetchMyReviewReplies = (page = 1, options = {}) =>
  http.get('/users/me/review-replies', {
    ...options,
    params: { page, size: 20 },
  });
export const removeReviewReplyAsAdmin = (id, reason) =>
  http.delete(`/admin/review-replies/${encodeURIComponent(id)}`, {
    data: { reason },
  });
