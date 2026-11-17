import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
const api = vi.hoisted(() => ({
  fetchManagedPins: vi.fn(),
  pinPost: vi.fn(),
  unpinPost: vi.fn(),
  reorderPins: vi.fn(),
}));
vi.mock('@/api/community-pins.api.js', () => api);
import CommunityPinManager from './CommunityPinManager.vue';
let auth;
const entry = (id, position, status = 'approved') => ({
  id,
  position,
  status,
  title: `食记${id}`,
  userDisplayName: '同学',
});
const snapshot = () => ({
  revision: 2,
  canManage: true,
  items: [entry('a', 1), entry('b', 2, 'pending')],
});
const button = (view, label) =>
  view.findAll('button').find((node) => node.text() === label);
function render() {
  return mount(CommunityPinManager, {
    props: { post: { id: 'c', status: 'approved' } },
    global: {
      stubs: {
        ElDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" role="dialog"><slot /></div>',
        },
      },
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  auth = useAuthStore();
  auth.setSession({ user: { id: 'owner', role: 'superadmin' } });
  auth.capabilities = ['community.pin.manage'];
  api.fetchManagedPins.mockResolvedValue(snapshot());
});
async function open(view) {
  await button(view, '置顶管理').trigger('click');
  await flushPromises();
}
it('无独立能力时不显示入口，也不发管理请求', () => {
  auth.capabilities = [];
  const view = render();
  expect(view.find('button').exists()).toBe(false);
  expect(api.fetchManagedPins).not.toHaveBeenCalled();
  view.unmount();
});
it('待审条目保留名额，顺序提交包含所有隐藏条目', async () => {
  const view = render();
  await open(view);
  expect(view.text()).toContain('待审核，保留名额');
  api.reorderPins.mockResolvedValue({
    ...snapshot(),
    revision: 3,
    items: [entry('b', 1, 'pending'), entry('a', 2)],
  });
  await view.get('[aria-label="下移 食记a"]').trigger('click');
  await flushPromises();
  expect(api.reorderPins).toHaveBeenCalledWith(['b', 'a'], 2);
  expect(view.emitted('changed')).toHaveLength(1);
  view.unmount();
});
it('保存期间锁定操作，失败后用相同版本显式重试', async () => {
  let reject;
  api.pinPost.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const view = render();
  await open(view);
  await button(view, '置顶当前帖子').trigger('click');
  expect(button(view, '刷新置顶列表').attributes('disabled')).toBeDefined();
  reject(new Error('暂时失败'));
  await flushPromises();
  expect(view.text()).toContain('暂时失败');
  api.pinPost.mockResolvedValue({
    ...snapshot(),
    revision: 3,
    items: [...snapshot().items, entry('c', 3)],
  });
  await button(view, '置顶当前帖子').trigger('click');
  await flushPromises();
  expect(api.pinPost.mock.calls).toEqual([
    ['c', 2],
    ['c', 2],
  ]);
  expect(view.findAll('li')).toHaveLength(3);
  view.unmount();
});
it('冲突需要刷新版本，不自动再次执行取消置顶', async () => {
  api.unpinPost.mockRejectedValueOnce(new Error('置顶列表已变化'));
  const view = render();
  await open(view);
  await button(view, '取消置顶').trigger('click');
  await flushPromises();
  expect(api.unpinPost).toHaveBeenCalledTimes(1);
  api.fetchManagedPins.mockResolvedValue({ ...snapshot(), revision: 8 });
  await button(view, '刷新置顶列表').trigger('click');
  await flushPromises();
  api.unpinPost.mockResolvedValue({
    revision: 9,
    canManage: true,
    items: [entry('b', 1, 'pending')],
  });
  await button(view, '取消置顶').trigger('click');
  await flushPromises();
  expect(api.unpinPost.mock.calls).toEqual([
    ['a', 2],
    ['a', 8],
  ]);
  view.unmount();
});
it('切号后丢弃旧读取并关闭管理界面', async () => {
  let resolve;
  api.fetchManagedPins.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = render();
  await button(view, '置顶管理').trigger('click');
  auth.setSession({ user: { id: 'other', role: 'user' } });
  await flushPromises();
  resolve(snapshot());
  await flushPromises();
  expect(view.find('[role=dialog]').exists()).toBe(false);
  expect(view.text()).not.toContain('食记a');
  view.unmount();
});
