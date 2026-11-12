import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import AppealOnlyView from './AppealOnlyView.vue';

const shared = vi.hoisted(() => ({
  auth: null,
  fetch: vi.fn(),
  actions: vi.fn(),
  submit: vi.fn(),
  success: vi.fn(),
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => shared.auth }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('element-plus', () => ({ ElMessage: { success: shared.success } }));
vi.mock('@/api/safety.api.js', () => ({
  fetchMyModerationDecisions: shared.fetch,
  fetchDecisionActions: shared.actions,
  submitAppeal: shared.submit,
}));
const decision = (reason = '本人决定') => ({
  decisionId: 'shared-decision',
  outcome: 'upheld',
  publicReason: reason,
  deliveredAt: new Date().toISOString(),
  appealDeadline: new Date(Date.now() + 86400000).toISOString(),
});
let wrapper;
async function render() {
  wrapper = mount(AppealOnlyView);
  await flushPromises();
}
const button = (text) =>
  wrapper.findAll('button').find((item) => item.text() === text);
const actor = (id) => (shared.auth.user = { id, email: id + '@example.test' });

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  shared.auth = reactive({ user: { id: 'actor-a' }, isRestricted: true });
  shared.fetch.mockImplementation(async () => ({ items: [decision()] }));
  shared.actions.mockResolvedValue([]);
  shared.submit.mockResolvedValue({ id: 'appeal', status: 'submitted' });
});
afterEach(() => wrapper?.unmount());

it('同一决定的双方切换账号时草稿隔离，本人重新进入可以恢复', async () => {
  await render();
  await wrapper.get('textarea').setValue('A 的私密申诉内容');
  actor('actor-b');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('');
  await wrapper.get('textarea').setValue('B 的私密申诉内容');
  actor('actor-a');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('A 的私密申诉内容');
  actor('actor-b');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('B 的私密申诉内容');
});

it('未标记归属的旧版草稿不自动归给当前账号，也不擅自删除', async () => {
  const key = 'foodtime:appeal-draft:shared-decision';
  sessionStorage.setItem(key, JSON.stringify({ content: '未知归属的旧草稿' }));
  await render();
  expect(wrapper.get('textarea').element.value).toBe('');
  expect(sessionStorage.getItem(key)).toContain('未知归属的旧草稿');
});

it('账号切换取消旧读取，旧响应不能覆盖当前账号决定', async () => {
  let resolveOld;
  shared.fetch.mockImplementationOnce(
    () => new Promise((resolve) => (resolveOld = resolve)),
  );
  await render();
  const signal = shared.fetch.mock.calls[0][1].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  resolveOld({ items: [decision('A 的旧响应')] });
  await flushPromises();
  expect(wrapper.text()).not.toContain('A 的旧响应');
  expect(wrapper.text()).toContain('本人决定');
});

it('切号取消提交，迟到成功不清理新账号草稿或弹出旧账号提示', async () => {
  let complete;
  shared.submit.mockImplementationOnce(
    () => new Promise((resolve) => (complete = resolve)),
  );
  await render();
  await wrapper.get('textarea').setValue('A 私密材料');
  await button('提交申诉').trigger('click');
  await flushPromises();
  const signal = shared.submit.mock.calls[0][2].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  await wrapper.get('textarea').setValue('B 当前材料');
  complete({ id: 'old-appeal', status: 'submitted' });
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('B 当前材料');
  expect(shared.success).not.toHaveBeenCalled();
});

it('同账号重新挂载恢复草稿，失败重试复用编号，成功只清理本人草稿', async () => {
  await render();
  await wrapper.get('textarea').setValue('A 的材料');
  wrapper.unmount();
  await render();
  expect(wrapper.get('textarea').element.value).toBe('A 的材料');
  shared.submit.mockRejectedValueOnce(new Error('网络中断'));
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('网络中断');
  const requestId = shared.submit.mock.calls[0][1].clientRequestId;
  await button('提交申诉').trigger('click');
  await flushPromises();
  expect(shared.submit.mock.calls[1][1].clientRequestId).toBe(requestId);
  expect(shared.success).toHaveBeenCalledTimes(1);
  wrapper.unmount();
  await render();
  expect(wrapper.get('textarea').element.value).toBe('');
});

it('处理动作读取失败可重试，切号时旧动作响应也会被隔离', async () => {
  shared.actions.mockRejectedValueOnce(new Error('动作读取失败'));
  await render();
  await button('查看处理动作').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('动作读取失败');
  await button('收起处理动作').trigger('click');
  await button('查看处理动作').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('尚未记录实际处理动作');
  const signal = shared.actions.mock.calls[1][1].signal;
  actor('actor-b');
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(wrapper.text()).not.toContain('尚未记录实际处理动作');
});

it('失去受限会话后立即清空界面并停止读取，卸载取消在途请求', async () => {
  await render();
  const signal = shared.fetch.mock.calls[0][1].signal;
  shared.auth.user = null;
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(wrapper.find('textarea').exists()).toBe(false);
  expect(shared.fetch).toHaveBeenCalledTimes(1);
  actor('actor-a');
  await flushPromises();
  const activeSignal = shared.fetch.mock.calls[1][1].signal;
  wrapper.unmount();
  expect(activeSignal.aborted).toBe(true);
});
