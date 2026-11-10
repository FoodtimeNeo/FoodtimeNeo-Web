import { expect, it, vi } from 'vitest';
vi.mock('./http.js', () => ({ http: { get: vi.fn() } }));
import { http } from './http.js';
import { searchUsers } from './user-search.api.js';

it('保留关键词并传递取消信号，固定每页20条', async () => {
  const signal = new AbortController().signal;
  http.get.mockResolvedValue({ items: [] });
  await searchUsers('同学%_!', 2, { signal });
  expect(http.get).toHaveBeenCalledWith('/users/search', {
    signal,
    params: { q: '同学%_!', page: 2, size: 20 },
  });
});
