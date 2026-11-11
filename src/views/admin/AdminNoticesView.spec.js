import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  searchAdminNotices: vi.fn(),
  saveNoticeMarkdown: vi.fn(),
  saveNoticeSchedule: vi.fn(),
}));
vi.mock('@/api/notice.api.js', () => api);
import AdminNoticesView from './AdminNoticesView.vue';
const row = {
  id: 'n1',
  title: '新公告',
  content: '# 新公告\n\n**正文**',
  publishedAt: '2026-11-11T07:30:00Z',
  displayStartsAt: '2026-11-11T07:30:00Z',
  expiresOn: '2026-11-15',
  isUpdate: true,
  published: true,
  enabled: true,
  status: 'active',
};
const button = (view, text) =>
  view.findAll('button').find((b) => b.text() === text);
beforeEach(() => {
  vi.resetAllMocks();
  api.searchAdminNotices.mockResolvedValue({ items: [row], total: 30 });
  api.saveNoticeMarkdown.mockResolvedValue(row);
  api.saveNoticeSchedule.mockResolvedValue(row);
});
it('草稿不发布、不启用弹窗，内容与完整排期一起提交', async () => {
  const view = mount(AdminNoticesView);
  await flushPromises();
  await button(view, '创建公告').trigger('click');
  await button(view, '保存草稿').trigger('click');
  expect(view.text()).toContain('内容不能为空');
  await view.find('textarea').setValue('没有标题');
  await button(view, '保存草稿').trigger('click');
  expect(view.text()).toContain('添加非空标题');
  await view.find('textarea').setValue('# 草稿');
  await button(view, '保存草稿').trigger('click');
  await flushPromises();
  expect(api.saveNoticeMarkdown).toHaveBeenCalledWith(
    '# 草稿',
    null,
    expect.objectContaining({ published: false, enabled: false }),
  );
  view.unmount();
});
it('发布时以 UTC+8 提交时间，日期截止不在浏览器猜测时区', async () => {
  const view = mount(AdminNoticesView);
  await flushPromises();
  await button(view, '创建公告').trigger('click');
  await view.find('textarea').setValue('# 定时公告');
  await view
    .findAll('input[type=datetime-local]')[0]
    .setValue('2026-11-11T15:30');
  await view.find('select').setValue('date');
  await view.find('input[type=date]').setValue('2026-11-15');
  await view.find('form.notice-editor').trigger('submit');
  await flushPromises();
  expect(api.saveNoticeMarkdown).toHaveBeenCalledWith(
    '# 定时公告',
    null,
    expect.objectContaining({
      publishedAt: '2026-11-11T07:30:00.000Z',
      displayStartsAt: null,
      expiresOn: '2026-11-15',
      published: true,
      enabled: true,
    }),
  );
  view.unmount();
});
it('单条停用保留其他类别和原排期，失败可重试', async () => {
  const view = mount(AdminNoticesView);
  await flushPromises();
  api.saveNoticeSchedule.mockRejectedValueOnce(new Error('网络断开'));
  await button(view, '停用弹窗').trigger('click');
  await flushPromises();
  expect(view.text()).toContain('网络断开');
  await button(view, '停用弹窗').trigger('click');
  await flushPromises();
  expect(api.saveNoticeSchedule).toHaveBeenLastCalledWith(
    'n1',
    expect.objectContaining({
      enabled: false,
      published: true,
      isUpdate: true,
      expiresOn: '2026-11-15',
    }),
  );
  view.unmount();
});
it('编辑保留 Markdown、更新类别与截止日期', async () => {
  const view = mount(AdminNoticesView);
  await flushPromises();
  await button(view, '编辑').trigger('click');
  expect(view.find('textarea').element.value).toBe(row.content);
  expect(view.find('input[type=date]').element.value).toBe('2026-11-15');
  expect(view.find('input[type=checkbox]').element.checked).toBe(true);
  expect(button(view, '保存草稿')).toBeUndefined();
  view.unmount();
});
it('较早的搜索响应不会覆盖较新的结果', async () => {
  const view = mount(AdminNoticesView);
  await flushPromises();
  let old;
  api.searchAdminNotices
    .mockReturnValueOnce(
      new Promise((resolve) => {
        old = resolve;
      }),
    )
    .mockResolvedValueOnce({ items: [], total: 0 });
  await view.find('.search').trigger('submit');
  await view.find('input[type=search]').setValue('不存在');
  await view.find('.search').trigger('submit');
  await flushPromises();
  old({ items: [row], total: 1 });
  await flushPromises();
  expect(view.text()).toContain('没有匹配的公告');
  expect(view.findAll('article')).toHaveLength(0);
  view.unmount();
});
