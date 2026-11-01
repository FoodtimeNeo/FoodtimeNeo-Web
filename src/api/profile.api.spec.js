import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn(), put: vi.fn() }));
vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: api,
}));
import {
  fetchOwnSubmissions,
  fetchOwnReviews,
  deleteOwnReview,
  updateOwnProfile,
} from './profile.api.js';
beforeEach(() => {
  vi.clearAllMocks();
});
it('修改昵称与头像只写当前会话用户，不能指定其他用户或角色', async () => {
  await updateOwnProfile({
    displayName: '新昵称',
    avatarUrl: null,
    id: 'other',
    role: 'superadmin',
  });
  expect(api.put).toHaveBeenCalledWith('/users/me/profile', {
    displayName: '新昵称',
    avatarUrl: null,
  });
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
