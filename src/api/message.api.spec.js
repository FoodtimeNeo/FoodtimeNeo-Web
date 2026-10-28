import { beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  http: api,
}));

import {
  fetchOwnMessages,
  fetchUnreadMessageCount,
  markMessageRead,
  markAllMessagesRead,
} from './message.api.js';

beforeEach(() => {
  vi.clearAllMocks();
});

it('消息列表与未读数走当前用户路径，已读接口对 id 做编码', async () => {
  await fetchOwnMessages(2);
  await fetchUnreadMessageCount();
  await markMessageRead('m/1');
  await markAllMessagesRead();
  expect(api.get).toHaveBeenCalledWith('/users/me/messages', {
    params: { page: 2, size: 20 },
  });
  expect(api.get).toHaveBeenCalledWith('/users/me/messages/unread-count', {});
  expect(api.post).toHaveBeenCalledWith('/users/me/messages/m%2F1/read');
  expect(api.post).toHaveBeenCalledWith('/users/me/messages/read-all');
});
