/**
 * 菜品点评接口。后端会从登录 token 中识别用户，前端不传 user_id。
 */
import { http } from './http.js';

/**
 * 提交一条待审核点评。
 * @param {{ dishId: string, rating: number, comment: string }} review
 * @returns {Promise<object>}
 */
export function createReview({ dishId, rating, comment }) {
  return http.post('/reviews', {
    dish_id: dishId,
    rating,
    comment,
  });
}
