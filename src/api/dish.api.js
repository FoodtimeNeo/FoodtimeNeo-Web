/**
 * 菜品相关接口。后端前缀 /api/v1，响应已在拦截器解包为 data。
 */
import { http } from './http.js';

/**
 * 菜品详情。
 * @param {string} dishId
 * @returns {Promise<object>}
 */
export function fetchDish(dishId) {
  return http.get(`/dishes/${dishId}`);
}

/**
 * 菜品评论（后端只返回已通过审核的）。
 * @param {string} dishId
 * @returns {Promise<Array<object>>}
 */
export function fetchDishReviews(dishId) {
  return http.get(`/dishes/${dishId}/reviews`);
}

/**
 * 推荐该菜品（需登录）。
 * @param {string} dishId
 * @returns {Promise<object>}
 */
export function recommendDish(dishId) {
  return http.post(`/dishes/${dishId}/recommend`);
}

/**
 * 避雷该菜品（需登录）。
 * @param {string} dishId
 * @returns {Promise<object>}
 */
export function avoidDish(dishId) {
  return http.post(`/dishes/${dishId}/avoid`);
}
