import { afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useNoticePolling } from './useNoticePolling.js';
const api = vi.hoisted(() => ({ fetchNoticeFeed: vi.fn() }));
vi.mock('@/api/notice.api.js', () => api);
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

it('慢轮询不重叠，切号后旧响应不能写入新账号', async () => {
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.setSession({ user: { id: 'one', role: 'user' } });
  let resolveOld;
  api.fetchNoticeFeed
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue({ items: [{ id: 'new' }], unreadCount: 2 });
  let polling;
  wrapper = mount(
    defineComponent({
      setup() {
        polling = useNoticePolling();
        return () => null;
      },
    }),
  );
  polling.refresh();
  polling.refresh();
  expect(api.fetchNoticeFeed).toHaveBeenCalledTimes(1);
  auth.setSession({ user: { id: 'two', role: 'admin' } });
  await flushPromises();
  resolveOld({ items: [{ id: 'old' }], unreadCount: 99 });
  await flushPromises();
  expect(polling.items.value).toEqual([{ id: 'new' }]);
  expect(polling.noticesUnread.value).toBe(2);
  auth.clear();
  await flushPromises();
  expect(polling.items.value).toEqual([]);
  expect(polling.noticesUnread.value).toBe(0);
});
