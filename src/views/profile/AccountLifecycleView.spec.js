import { beforeEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({ fetchAccountLifecycle: vi.fn() }));
const replace = vi.hoisted(() => vi.fn());
const invalidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/api/account-lifecycle.api.js', () => api);
vi.mock('@/api/http.js', () => ({ invalidateSession }));
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
  useRoute: () => ({ query: {} }),
}));
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }));
const auth = reactive({
  user: { id: 'one' },
  role: 'user',
  clear: vi.fn(),
  setSession: vi.fn(),
});
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => auth }));
import View from './AccountLifecycleView.vue';
const summary = {
  verificationEmail: '123@bjtu.edu.cn',
  schoolEmail: '123@bjtu.edu.cn',
  canDelete: true,
  canUnbind: true,
  deletionCodeAvailableAt: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'one' };
  auth.role = 'user';
  api.fetchAccountLifecycle.mockResolvedValue(summary);
});
const render = () =>
  mount(View, {
    global: {
      stubs: {
        BackLink: true,
        AccountEmailAction: {
          name: 'AccountEmailAction',
          props: ['kind'],
          emits: ['done'],
          template: '<div :data-kind="kind"></div>',
        },
      },
    },
  });
it('按真实服务端能力展示解绑和注销，管理员状态不展示操作', async () => {
  const view = render();
  await flushPromises();
  expect(view.findAll('[data-kind]')).toHaveLength(2);
  api.fetchAccountLifecycle.mockResolvedValue({
    ...summary,
    canDelete: false,
    canUnbind: false,
  });
  auth.role = 'superadmin';
  await flushPromises();
  expect(view.findAll('[data-kind]')).toHaveLength(0);
  view.unmount();
});
it('解绑响应同步访客身份并明确学校邮箱重新可用时间', async () => {
  const view = render();
  await flushPromises();
  const profile = { id: 'one', role: 'visitor', email: 'old@gmail.com' };
  view
    .findAllComponents({ name: 'AccountEmailAction' })
    .find((item) => item.props('kind') === 'unbind')
    .vm.$emit('done', {
      profile,
      schoolEmailReusableAt: '2026-11-11T11:00:00Z',
    });
  await flushPromises();
  expect(auth.setSession).toHaveBeenCalledWith({ user: profile });
  expect(view.text()).toContain('当前为访客身份');
  expect(view.text()).toContain('UTC+8');
  view.unmount();
});
it('注销完成后清除会话并跳转到有注销说明的登录页', async () => {
  const view = render();
  await flushPromises();
  view
    .findAllComponents({ name: 'AccountEmailAction' })
    .find((item) => item.props('kind') === 'delete')
    .vm.$emit('done', {
      deleted: true,
      emailsReusableAt: '2026-11-11T11:00:00Z',
    });
  await flushPromises();
  expect(auth.clear).toHaveBeenCalledOnce();
  expect(invalidateSession).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledWith({
    name: 'login',
    query: { accountDeleted: '1' },
  });
  view.unmount();
});
it('切换账号后旧账号迟到的状态不会覆盖新账号', async () => {
  let resolve;
  api.fetchAccountLifecycle
    .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    .mockResolvedValue({
      ...summary,
      canUnbind: false,
      schoolEmail: null,
      verificationEmail: 'new@gmail.com',
    });
  const view = render();
  auth.user = { id: 'two' };
  await flushPromises();
  resolve(summary);
  await flushPromises();
  expect(view.findAll('[data-kind]')).toHaveLength(1);
  expect(view.find('[data-kind=unbind]').exists()).toBe(false);
  view.unmount();
});
