import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: api,
}));

import {
  fetchNoticeFeed,
  fetchOwnNotices,
  markNoticeRead,
  fetchAdminNotices,
  fetchAdminNotice,
  createAdminNotice,
  updateAdminNotice,
  deleteAdminNotice,
} from './notice.api.js';

beforeEach(() => {
  vi.clearAllMocks();
});

it('公告 feed 携带 since_seq 游标与 limit，用户分页走当前用户路径', async () => {
  await fetchNoticeFeed(42, 20);
  await fetchOwnNotices(2);
  await markNoticeRead('a/b');
  expect(api.get).toHaveBeenCalledWith('/users/me/notices/feed', {
    params: { since_seq: 42, limit: 20 },
  });
  expect(api.get).toHaveBeenCalledWith('/users/me/notices', {
    params: { page: 2, size: 20 },
  });
  expect(api.post).toHaveBeenCalledWith('/users/me/notices/a%2Fb/read');
});

it('管理端公告走 /admin/notices 路径，写操作只发送标题与正文', async () => {
  await fetchAdminNotices(3);
  await fetchAdminNotice('n/1');
  await createAdminNotice({ title: 't', body: 'b', extra: 'drop' });
  await updateAdminNotice('n/1', { title: 't2', body: 'b2' });
  await deleteAdminNotice('n/1');
  expect(api.get).toHaveBeenCalledWith('/admin/notices', {
    params: { page: 3, size: 20 },
  });
  expect(api.get).toHaveBeenCalledWith('/admin/notices/n%2F1', {});
  expect(api.post).toHaveBeenCalledWith('/admin/notices', {
    title: 't',
    body: 'b',
  });
  expect(api.put).toHaveBeenCalledWith('/admin/notices/n%2F1', {
    title: 't2',
    body: 'b2',
  });
  expect(api.delete).toHaveBeenCalledWith('/admin/notices/n%2F1');
});
