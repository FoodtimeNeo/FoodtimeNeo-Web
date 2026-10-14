import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: api,
}));
import {
  fetchOwnSubmissions,
  fetchOwnReviews,
  deleteOwnReview,
} from './profile.api.js';
beforeEach(() => {
  vi.clearAllMocks();
});
it('个人记录仅请求当前用户路径，并拒绝未知投稿类型', async () => {
  await fetchOwnReviews(2);
  await fetchOwnSubmissions('photo', 3);
  await deleteOwnReview('a/b');
  expect(api.get).toHaveBeenCalledWith('/users/me/reviews', {
    params: { page: 2, size: 20 },
  });
  expect(api.get).toHaveBeenCalledWith('/users/me/image-submissions', {
    params: { page: 3, size: 20 },
  });
  expect(api.delete).toHaveBeenCalledWith('/users/me/reviews/a%2Fb');
  expect(() => fetchOwnSubmissions('users')).toThrow('未知投稿类型');
});
