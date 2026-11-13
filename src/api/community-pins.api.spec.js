import { beforeEach, expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('./http.js', async () => ({
  ...(await vi.importActual('./http.js')),
  http,
}));
import {
  fetchManagedPins,
  pinPost,
  unpinPost,
  reorderPins,
} from './community-pins.api.js';
const value = {
  revision: 3,
  canManage: true,
  items: [
    {
      id: 'a',
      title: '食记',
      userDisplayName: '同学',
      status: 'pending',
      position: 1,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  for (const call of Object.values(http)) call.mockResolvedValue(value);
});
it('管理操作保留版本与显式顺序，取消使用删除接口', async () => {
  expect(await fetchManagedPins()).toEqual(value);
  await pinPost('post', 3);
  await unpinPost('post', 3);
  await reorderPins(['a'], 3);
  expect(http.put.mock.calls[0]).toEqual([
    '/admin/community/pins/post',
    { expectedRevision: 3 },
    {},
  ]);
  expect(http.delete).toHaveBeenCalledWith('/admin/community/pins/post', {
    params: { expectedRevision: 3 },
  });
  expect(http.put.mock.calls[1][1]).toEqual({
    postIds: ['a'],
    expectedRevision: 3,
  });
});
it.each([
  { ...value, revision: -1 },
  { ...value, items: [value.items[0], value.items[0]] },
  { ...value, items: [{ ...value.items[0], position: 4 }] },
])('异常列表不能用于下一次写入', async (invalid) => {
  http.get.mockResolvedValue(invalid);
  await expect(fetchManagedPins()).rejects.toMatchObject({ code: 'PROTOCOL' });
});
