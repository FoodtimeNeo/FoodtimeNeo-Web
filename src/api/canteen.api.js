import { http, ApiError } from './http.js';
export const fetchCanteens = (options = {}) =>
  http.get('/dining-halls', options);
export async function fetchCanteen(id, options = {}) {
  const halls = await fetchCanteens(options);
  const hall = halls.find((item) => item.id === id);
  if (!hall)
    throw new ApiError('食堂不存在或已停用', {
      status: 404,
      code: 'NOT_FOUND',
    });
  return hall;
}
export const fetchStalls = (id, options = {}) =>
  http.get(`/dining-halls/${encodeURIComponent(id)}/stalls`, options);
export const fetchStallDishes = (id, options = {}) =>
  http.get(`/stalls/${encodeURIComponent(id)}/dishes`, options);
// 点评选菜依次查询真实档口与菜品，不请求不存在的食堂菜品聚合接口。
export async function fetchCanteenDishes(id, options = {}) {
  const stalls = await fetchStalls(id, options);
  return (
    await Promise.all(
      stalls.map((stall) => fetchStallDishes(stall.id, options)),
    )
  ).flat();
}
