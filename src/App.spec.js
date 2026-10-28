import { beforeEach, expect, it, vi } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import App from './App.vue';
import { useAuthStore } from './store/useAuthStore.js';

vi.mock('@/composables/useNoticePolling.js', () => ({
  useNoticePolling: () => ({
    noticesUnread: ref(0),
    items: ref([]),
    refresh: vi.fn(),
  }),
}));
vi.mock('@/api/message.api.js', () => ({
  fetchUnreadMessageCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

it('访客首次启动及登录后退出均能初始化公告队列', async () => {
  const auth = useAuthStore();
  const wrapper = shallowMount(App, {
    global: { stubs: { RouterView: true } },
  });
  expect(
    wrapper.findComponent({ name: 'NoticeDialog' }).props('modelValue'),
  ).toBe(false);
  auth.setSession({
    user: { id: 'one', email: '1@bjtu.edu.cn', role: 'user' },
  });
  await flushPromises();
  auth.clear();
  await flushPromises();
  expect(
    wrapper.findComponent({ name: 'NoticeDialog' }).props('modelValue'),
  ).toBe(false);
  wrapper.unmount();
});
