import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  createAdminNotice: vi.fn(),
  deleteAdminNotice: vi.fn(),
  fetchAdminNotice: vi.fn(),
  fetchAdminNotices: vi.fn(),
  updateAdminNotice: vi.fn(),
}));
vi.mock('@/api/notice.api.js', () => api);

import AdminNoticesView from './AdminNoticesView.vue';

const row = {
  id: 'n1',
  title: '旧标题',
  body: '旧正文',
  publishedAt: '2026-10-20T08:00:00Z',
};

function mountPage() {
  return mount(AdminNoticesView);
}

function buttonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text);
}

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchAdminNotices.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    size: 20,
  });
  api.createAdminNotice.mockResolvedValue(row);
  api.updateAdminNotice.mockResolvedValue(row);
  api.deleteAdminNotice.mockResolvedValue(undefined);
  api.fetchAdminNotice.mockResolvedValue(row);
});

it('空标题提交被拦截且不调接口', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('标题不能为空');
  expect(api.createAdminNotice).not.toHaveBeenCalled();
});

it('填写后发布公告并刷新列表', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await wrapper.get('input').setValue('新公告');
  await wrapper.get('textarea').setValue('新正文');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.createAdminNotice).toHaveBeenCalledWith({
    title: '新公告',
    body: '新正文',
  });
  expect(wrapper.text()).toContain('公告已发布');
  expect(api.fetchAdminNotices).toHaveBeenCalledTimes(2);
});

it('编辑回填后保存修改', async () => {
  api.fetchAdminNotices.mockResolvedValue({
    items: [row],
    total: 1,
    page: 1,
    size: 20,
  });
  const wrapper = mountPage();
  await flushPromises();
  await buttonByText(wrapper, '编辑').trigger('click');
  await flushPromises();
  expect(api.fetchAdminNotice).toHaveBeenCalledWith('n1');
  expect(wrapper.get('input').element.value).toBe('旧标题');
  await wrapper.get('input').setValue('新标题');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.updateAdminNotice).toHaveBeenCalledWith('n1', {
    title: '新标题',
    body: '旧正文',
  });
  expect(wrapper.text()).toContain('公告已更新');
});

it('二次确认后删除公告', async () => {
  api.fetchAdminNotices.mockResolvedValue({
    items: [row],
    total: 1,
    page: 1,
    size: 20,
  });
  const wrapper = mountPage();
  await flushPromises();
  await buttonByText(wrapper, '删除').trigger('click');
  expect(wrapper.text()).toContain('确认删除这条公告');
  expect(api.deleteAdminNotice).not.toHaveBeenCalled();
  await buttonByText(wrapper, '确认删除').trigger('click');
  await flushPromises();
  expect(api.deleteAdminNotice).toHaveBeenCalledWith('n1');
  expect(wrapper.text()).toContain('公告已删除');
});
