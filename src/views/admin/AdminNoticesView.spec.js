import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  searchAdminNotices: vi.fn(),
  fetchNoticeSettings: vi.fn(),
  setNoticeSettings: vi.fn(),
  saveNoticeMarkdown: vi.fn(),
  fetchAdminNotice: vi.fn(),
}));
vi.mock('@/api/notice.api.js', () => api);
import AdminNoticesView from './AdminNoticesView.vue';
const row = {
  id: 'n1',
  title: '新公告',
  content: '# 新公告\n\n**正文**',
  publishedAt: '2026-10-30T00:00:00Z',
};
const button = (w, text) => w.findAll('button').find((b) => b.text() === text);
beforeEach(() => {
  vi.resetAllMocks();
  api.fetchNoticeSettings.mockResolvedValue({ noticeId: null });
  api.searchAdminNotices.mockResolvedValue({ items: [row], total: 30 });
  api.saveNoticeMarkdown.mockResolvedValue(row);
});
it('创建仅提交 Markdown，保存后仍需明确确认设置', async () => {
  const w = mount(AdminNoticesView, { global: { stubs: { Teleport: true } } });
  await flushPromises();
  await button(w, '创建公告').trigger('click');
  await w.get('form:not(.search)').trigger('submit');
  expect(w.text()).toContain('内容不能为空');
  await w.get('textarea').setValue('普通文字');
  await w.get('form:not(.search)').trigger('submit');
  expect(w.text()).toContain('添加非空标题');
  await w.get('textarea').setValue(row.content);
  await w.get('form:not(.search)').trigger('submit');
  await flushPromises();
  expect(api.saveNoticeMarkdown).toHaveBeenCalledWith(row.content, null);
  expect(api.setNoticeSettings).not.toHaveBeenCalled();
  await button(w, '确认设置').trigger('click');
  await flushPromises();
  expect(api.setNoticeSettings).toHaveBeenCalledWith('n1');
});
it('翻页搜索保留选择，设置失败可重试', async () => {
  const w = mount(AdminNoticesView, { global: { stubs: { Teleport: true } } });
  await flushPromises();
  await w.findAll('input[type=radio]')[1].setValue();
  await button(w, '下一页').trigger('click');
  await flushPromises();
  expect(api.searchAdminNotices).toHaveBeenLastCalledWith(2, '');
  await w.get('input[type=search]').setValue('关键词');
  await w.get('.search').trigger('submit');
  await flushPromises();
  expect(api.searchAdminNotices).toHaveBeenLastCalledWith(1, '关键词');
  expect(w.get('footer').text()).toContain('新公告');
  api.setNoticeSettings.mockRejectedValueOnce(new Error('网络断开'));
  await button(w, '确认设置').trigger('click');
  await flushPromises();
  expect(w.text()).toContain('网络断开');
  expect(button(w, '确认设置').attributes('disabled')).toBeUndefined();
  await button(w, '确认设置').trigger('click');
  await flushPromises();
  expect(api.setNoticeSettings).toHaveBeenCalledTimes(2);
});
it('停用公告发送明确 null，编辑保留完整 Markdown', async () => {
  api.fetchNoticeSettings.mockResolvedValue({ noticeId: 'n1' });
  api.fetchAdminNotice.mockResolvedValue(row);
  const w = mount(AdminNoticesView, { global: { stubs: { Teleport: true } } });
  await flushPromises();
  await button(w, '编辑').trigger('click');
  expect(w.get('textarea').element.value).toBe(row.content);
  await button(w, '设置公告').trigger('click');
  await w.findAll('input[type=radio]')[0].setValue();
  await button(w, '确认设置').trigger('click');
  await flushPromises();
  expect(api.setNoticeSettings).toHaveBeenCalledWith(null);
});
it('较早的搜索响应不会覆盖较新的结果', async () => {
  const w = mount(AdminNoticesView, { global: { stubs: { Teleport: true } } });
  await flushPromises();
  let old;
  api.searchAdminNotices
    .mockReturnValueOnce(
      new Promise((resolve) => {
        old = resolve;
      }),
    )
    .mockResolvedValueOnce({ items: [], total: 0 });
  await w.get('.search').trigger('submit');
  await w.get('input[type=search]').setValue('不存在');
  await w.get('.search').trigger('submit');
  await flushPromises();
  old({ items: [row], total: 1 });
  await flushPromises();
  expect(w.text()).toContain('没有匹配的公告');
  expect(w.findAll('input[type=radio]')).toHaveLength(1);
});
