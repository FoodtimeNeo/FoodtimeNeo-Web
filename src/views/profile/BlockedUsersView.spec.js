import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
const api = vi.hoisted(() => ({
  fetchBlockedUsers: vi.fn(),
  setUserBlock: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/api/safety.api.js', () => api);
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: api.confirm } }));
let auth;
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => auth }));
import BlockedUsersView from './BlockedUsersView.vue';

const row = { id: 'u1', displayName: '小明', avatarUrl: null };
const result = (items = [row], page = 1, total = items.length) => ({
  items,
  page,
  total,
  size: 20,
});
const mountView = () =>
  mount(BlockedUsersView, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' }, MediaImage: true },
    },
  });
const unblockButton = (view) =>
  view.findAll('button').find((b) => b.text() === '解除拉黑');
beforeEach(() => {
  vi.resetAllMocks();
  auth = reactive({ user: { id: 'me' } });
  api.fetchBlockedUsers.mockResolvedValue(result());
  api.setUserBlock.mockResolvedValue({ blocked: false });
  api.confirm.mockResolvedValue('confirm');
});

it('请求自己的列表并展示用户，取消确认不调用解除接口', async () => {
  const view = mountView();
  await flushPromises();
  expect(api.fetchBlockedUsers).toHaveBeenCalledWith(1, expect.anything());
  expect(view.text()).toContain('小明');
  api.confirm.mockRejectedValue('cancel');
  await unblockButton(view).trigger('click');
  await flushPromises();
  expect(api.setUserBlock).not.toHaveBeenCalled();
  expect(view.find('[role=alert]').exists()).toBe(false);
  view.unmount();
});
it('解除成功重新读取列表，失败保留当前行并允许重试', async () => {
  const view = mountView();
  await flushPromises();
  api.setUserBlock.mockRejectedValueOnce(new Error('网络不可用'));
  await unblockButton(view).trigger('click');
  await flushPromises();
  expect(view.text()).toContain('网络不可用');
  expect(view.text()).toContain('小明');
  api.fetchBlockedUsers.mockResolvedValue(result([]));
  await unblockButton(view).trigger('click');
  await flushPromises();
  expect(api.setUserBlock).toHaveBeenLastCalledWith('u1', false);
  expect(view.text()).toContain('黑名单为空');
  expect(view.text()).toContain('已解除拉黑');
  view.unmount();
});
it('末页最后一人解除后自动回上一页', async () => {
  api.fetchBlockedUsers.mockResolvedValue(result([row], 1, 21));
  const view = mountView();
  await flushPromises();
  api.fetchBlockedUsers.mockResolvedValue(result([row], 2, 21));
  await view
    .findAll('button')
    .find((b) => b.text() === '下一页')
    .trigger('click');
  await flushPromises();
  api.fetchBlockedUsers.mockResolvedValue(result([row], 1, 20));
  await unblockButton(view).trigger('click');
  await flushPromises();
  expect(api.fetchBlockedUsers).toHaveBeenLastCalledWith(1, expect.anything());
  view.unmount();
});
it('读取失败显示重试，不能伪装为空名单', async () => {
  api.fetchBlockedUsers.mockRejectedValueOnce(new Error('读取失败'));
  const view = mountView();
  await flushPromises();
  expect(view.text()).toContain('读取失败');
  expect(view.text()).not.toContain('黑名单为空');
  await view
    .findAll('button')
    .find((b) => b.text().includes('重试'))
    .trigger('click');
  await flushPromises();
  expect(view.text()).toContain('小明');
  view.unmount();
});
it('确认期间切换账号不再解除，旧列表立即清空', async () => {
  let confirm;
  api.confirm.mockImplementation(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
      }),
  );
  const view = mountView();
  await flushPromises();
  await unblockButton(view).trigger('click');
  api.fetchBlockedUsers.mockResolvedValue(result([]));
  auth.user = { id: 'another' };
  await flushPromises();
  expect(view.text()).not.toContain('小明');
  confirm('confirm');
  await flushPromises();
  expect(api.setUserBlock).not.toHaveBeenCalled();
  view.unmount();
});
