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
