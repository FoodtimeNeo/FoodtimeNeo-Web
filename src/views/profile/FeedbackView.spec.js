import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
const api = vi.hoisted(() => ({
  fetchFeedback: vi.fn(),
  createFeedback: vi.fn(),
  exportFeedback: vi.fn(),
  importFeedback: vi.fn(),
  confirm: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}));
vi.mock('@/api/feedback.api.js', () => api);
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: api.confirm } }));
vi.mock('@/utils/feedback.js', async (original) => ({
  ...(await original()),
  readFeedbackCsv: api.read,
  saveFeedbackCsv: api.save,
}));
let auth;
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => auth }));
import FeedbackView from './FeedbackView.vue';

const item = {
  id: 'f1',
  type: 'function',
  content: '原反馈',
  status: 'pending',
  createdAt: '2026-11-11T00:00:00Z',
  userDisplayName: '小明',
  latestReply: null,
};
const page = (items = [item]) => ({
  items,
  page: 1,
  size: 20,
  total: items.length,
});
const mountView = (admin = false) =>
  mount(FeedbackView, {
    props: { admin },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
const button = (view, text) =>
  view.findAll('button').find((b) => b.text() === text);
beforeEach(() => {
  vi.resetAllMocks();
  auth = reactive({ user: { id: 'me', role: 'user' } });
  api.fetchFeedback.mockResolvedValue(page());
  api.createFeedback.mockResolvedValue(item);
  api.confirm.mockResolvedValue('confirm');
  api.read.mockResolvedValue('CSV');
});
it('提交失败保留文字并复用请求编号重试，成功后展示记录', async () => {
  const view = mountView();
  await flushPromises();
  await view.find('select').setValue('usage');
  await view.find('textarea').setValue('失败后仍保留');
  api.createFeedback.mockRejectedValueOnce(new Error('网络失败'));
  await view.find('form').trigger('submit');
  await flushPromises();
  const request = api.createFeedback.mock.calls[0][0];
  expect(view.text()).toContain('网络失败');
  expect(view.find('textarea').element.value).toBe('失败后仍保留');
  await view.find('form').trigger('submit');
  await flushPromises();
  expect(api.createFeedback).toHaveBeenLastCalledWith(request);
  expect(request.type).toBe('usage');
  expect(view.find('textarea').element.value).toBe('');
  expect(view.text()).toContain('反馈已提交');
  view.unmount();
});
it('切换已完成归档请求独立列表', async () => {
  const view = mountView();
  await flushPromises();
  api.fetchFeedback.mockResolvedValue(page([]));
  await button(view, '已完成').trigger('click');
  await flushPromises();
  expect(api.fetchFeedback).toHaveBeenLastCalledWith(
    1,
    true,
    false,
    expect.anything(),
  );
  expect(view.text()).toContain('暂无已完成反馈');
  view.unmount();
});
it('超管导出使用服务器 CSV 并重新获取处理状态', async () => {
  const exported = { filename: '反馈.csv', csv: 'CSV', count: 1 };
  api.exportFeedback.mockResolvedValue(exported);
  const view = mountView(true);
  await flushPromises();
  await button(view, '导出未完成反馈（CSV）').trigger('click');
  await flushPromises();
  expect(api.save).toHaveBeenCalledWith(exported);
  expect(view.text()).toContain('已导出 1 条');
  expect(api.fetchFeedback).toHaveBeenLastCalledWith(
    1,
    false,
    true,
    expect.anything(),
  );
  view.unmount();
});
it('导入展示有效行数量和逐条错误，取消不提交', async () => {
  const view = mountView(true);
  await flushPromises();
  const input = view.find('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    value: [{ name: '回复.csv' }],
    configurable: true,
  });
  await input.trigger('change');
  api.confirm.mockRejectedValueOnce('cancel');
  await button(view, '导入回复与状态').trigger('click');
  await flushPromises();
  expect(api.importFeedback).not.toHaveBeenCalled();
  api.importFeedback.mockResolvedValue({
    updated: 1,
    skipped: 1,
    issues: [{ row: 3, message: '反馈内容已修改' }],
  });
  await button(view, '导入回复与状态').trigger('click');
  await flushPromises();
  expect(api.importFeedback).toHaveBeenCalledWith('CSV');
  expect(view.text()).toContain('已更新 1 条，跳过 1 条');
  expect(view.text()).toContain('第 3 条记录：反馈内容已修改');
  view.unmount();
});
it('读取失败显示错误，切换账号立即清除旧反馈', async () => {
  const view = mountView();
  await flushPromises();
  expect(view.text()).toContain('原反馈');
  api.fetchFeedback.mockRejectedValue(new Error('读取失败'));
  auth.user = { id: 'another', role: 'user' };
  await flushPromises();
  expect(view.text()).not.toContain('原反馈');
  expect(view.text()).toContain('读取失败');
  expect(view.text()).not.toContain('暂无未完成反馈');
  view.unmount();
});

it('超管降权后立即清除之前读取的全部用户反馈', async () => {
  auth.user.role = 'superadmin';
  const view = mountView(true);
  await flushPromises();
  expect(view.text()).toContain('原反馈');
  api.fetchFeedback.mockRejectedValue(
    Object.assign(new Error('仅超级管理员可管理反馈'), { status: 403 }),
  );
  auth.user.role = 'admin';
  await flushPromises();
  expect(view.text()).not.toContain('原反馈');
  expect(view.text()).toContain('仅超级管理员可管理反馈');
  view.unmount();
});
