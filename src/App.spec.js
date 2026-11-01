import { beforeEach, expect, it, vi } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';
import { useAuthStore } from './store/useAuthStore.js';
const api = vi.hoisted(() => ({
  fetchCurrentNotice: vi.fn(),
  fetchUnreadNoticeCount: vi.fn(),
}));
vi.mock('@/api/notice.api.js', () => api);
vi.mock('@/api/message.api.js', () => ({
  fetchUnreadMessageCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
}));
const notice = {
  id: 'n1',
  content: '# 登录公告',
  createdTime: '2026-10-30T00:00:00Z',
};
function login(id = 'one') {
  useAuthStore().setSession({ user: { id, role: 'user' } });
}
function mountApp() {
  return shallowMount(App, { global: { stubs: { RouterView: true } } });
}
function popup(wrapper) {
  return wrapper.findComponent({ name: 'NoticeDialog' });
}
async function foreground() {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
  document.dispatchEvent(new Event('visibilitychange'));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await flushPromises();
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  api.fetchCurrentNotice.mockResolvedValue(notice);
  api.fetchUnreadNoticeCount.mockResolvedValue({ unreadCount: 0 });
});
it('访客不查询；登录或恢复会话立即展示，普通用户刷新不重查', async () => {
  const wrapper = mountApp();
  expect(api.fetchCurrentNotice).not.toHaveBeenCalled();
  login();
  await flushPromises();
  expect(popup(wrapper).props('modelValue')).toBe(true);
  popup(wrapper).vm.$emit('update:modelValue', false);
  await flushPromises();
  login();
  await flushPromises();
  expect(api.fetchCurrentNotice).toHaveBeenCalledTimes(1);
  expect(popup(wrapper).props('modelValue')).toBe(false);
  useAuthStore().clear();
  login();
  await flushPromises();
  expect(api.fetchCurrentNotice).toHaveBeenCalledTimes(2);
  wrapper.unmount();
});
it('已有登录态启动也检查一次；无配置或免弹返回空不展示', async () => {
  login();
  api.fetchCurrentNotice.mockResolvedValue(null);
  const wrapper = mountApp();
  await flushPromises();
  expect(api.fetchCurrentNotice).toHaveBeenCalledTimes(1);
  expect(popup(wrapper).props('modelValue')).toBe(false);
  wrapper.unmount();
});
it('退出和切号后晚到的公告不串账号', async () => {
  let resolve;
  api.fetchCurrentNotice.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  login();
  const wrapper = mountApp();
  useAuthStore().clear();
  login('two');
  api.fetchCurrentNotice.mockResolvedValue(null);
  await flushPromises();
  resolve({ ...notice, id: 'old-user' });
  await flushPromises();
  expect(popup(wrapper).props('notice')?.id).not.toBe('old-user');
  wrapper.unmount();
});
it('失败展示重试入口，不阻塞应用，也不创建轮询任务', async () => {
  const interval = vi.spyOn(globalThis, 'setInterval');
  api.fetchCurrentNotice.mockRejectedValueOnce(new Error('离线'));
  login();
  const wrapper = mountApp();
  await flushPromises();
  expect(wrapper.text()).toContain('公告暂时无法加载');
  await wrapper.find('button').trigger('click');
  await flushPromises();
  expect(popup(wrapper).props('modelValue')).toBe(true);
  expect(interval).not.toHaveBeenCalled();
  interval.mockRestore();
  wrapper.unmount();
});
it('回到前台补查公告；同一公告不重复弹，切换公告后展示新公告', async () => {
  login();
  const wrapper = mountApp();
  await flushPromises();
  expect(popup(wrapper).props('modelValue')).toBe(true);

  popup(wrapper).vm.$emit('update:modelValue', false);
  await flushPromises();

  await foreground();
  expect(api.fetchCurrentNotice).toHaveBeenCalledTimes(2);
  expect(popup(wrapper).props('modelValue')).toBe(false);

  api.fetchCurrentNotice.mockResolvedValue({
    ...notice,
    id: 'n2',
    content: '# 新公告',
  });
  await foreground();
  expect(popup(wrapper).props('modelValue')).toBe(true);
  expect(popup(wrapper).props('notice').id).toBe('n2');
  wrapper.unmount();
});
it('bfcache 恢复视为重新打开，补查当前公告', async () => {
  login();
  const wrapper = mountApp();
  await flushPromises();
  popup(wrapper).vm.$emit('update:modelValue', false);
  await flushPromises();

  api.fetchCurrentNotice.mockResolvedValue({
    ...notice,
    id: 'n3',
    content: '# 恢复后的公告',
  });
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  window.dispatchEvent(event);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await flushPromises();

  expect(popup(wrapper).props('modelValue')).toBe(true);
  expect(popup(wrapper).props('notice').id).toBe('n3');
  wrapper.unmount();
});
