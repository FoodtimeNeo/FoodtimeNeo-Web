/**
 * 食堂浏览相关接口。后端前缀 /api/v1，响应已在拦截器解包为 data。
 */
import { http } from './http.js';

/**
 * 食堂列表（封面 + 名称等概要）。
 * @returns {Promise<Array<object>>}
 */
export function fetchCanteens() {
  return http.get('/canteens');
}

/**
 * 食堂详情。
 * @param {string} canteenId
 * @returns {Promise<object>}
 */
export function fetchCanteen(canteenId) {
  return http.get(`/canteens/${canteenId}`);
}

/**
 * 食堂下的档口列表。
 * @param {string} canteenId
 * @returns {Promise<Array<object>>}
 */
export function fetchStalls(canteenId) {
  return http.get(`/canteens/${canteenId}/stalls`);
}

/**
 * 食堂下的菜品列表。
 * @param {string} canteenId
 * @returns {Promise<Array<object>>}
 */
export function fetchCanteenDishes(canteenId) {
  return http.get(`/canteens/${canteenId}/dishes`);
}

/**
 * 菜品排行榜。
 * @returns {Promise<Array<object>>}
 */
export function fetchRankings() {
  return http.get('/rankings');
}

/**
 * 今日推荐。
 * @returns {Promise<Array<object>>}
 */
export function fetchDailyRecommendations() {
  return http.get('/recommendations/daily');
}
