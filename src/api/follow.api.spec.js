import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: api,
}));
import {
  fetchFollowStatus,
  fetchFollowers,
  fetchFollowing,
  followUser,
  unfollowUser,
} from './follow.api.js';

beforeEach(() => {
  vi.clearAllMocks();
});

it('关注与取消关注使用 PUT / DELETE 同一路径并转义用户 ID', async () => {
  await followUser('a/b');
  await unfollowUser('a/b');
  expect(api.put).toHaveBeenCalledWith('/users/a%2Fb/follow');
  expect(api.delete).toHaveBeenCalledWith('/users/a%2Fb/follow');
});

it('状态与列表读取走公开的用户路径并带分页参数', async () => {
  await fetchFollowStatus('u1');
  await fetchFollowers('u1', 2);
  await fetchFollowing('u1', 3);
  expect(api.get).toHaveBeenNthCalledWith(1, '/users/u1/follow-status', {});
  expect(api.get).toHaveBeenNthCalledWith(2, '/users/u1/followers', {
    params: { page: 2, size: 20 },
  });
  expect(api.get).toHaveBeenNthCalledWith(3, '/users/u1/following', {
    params: { page: 3, size: 20 },
  });
});
