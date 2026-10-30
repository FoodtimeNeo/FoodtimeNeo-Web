import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({ confirmNotice: vi.fn() }));
vi.mock('@/api/notice.api.js', () => api);
import NoticeDialog from './NoticeDialog.vue';

const notice = {
  id: 'n1',
  content: '# 停水通知\n\n明日 **停水**\n\n- 提前储水',
  createdTime: '2026-10-20T08:00:00Z',
};
function mountDialog() {
  return mount(NoticeDialog, {
    props: { modelValue: true, notice },
    global: {
      stubs: {
        ElDialog: {
          template: '<div><slot /><slot name="footer" /></div>',
          props: ['modelValue'],
        },
      },
    },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  api.confirmNotice.mockResolvedValue({ isRead: true });
});
it('渲染 Markdown，打开时不写已读，默认不免弹', async () => {
  const wrapper = mountDialog();
  expect(wrapper.find('h1').text()).toBe('停水通知');
  expect(wrapper.find('strong').text()).toBe('停水');
  expect(wrapper.find('li').text()).toBe('提前储水');
  expect(api.confirmNotice).not.toHaveBeenCalled();
  await wrapper.find('button').trigger('click');
  await flushPromises();
  expect(api.confirmNotice).toHaveBeenCalledWith('n1', false);
  expect(wrapper.emitted('confirmed')).toEqual([['n1']]);
  expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
});
it('勾选后确认才保存免弹；失败保持弹窗和选择并允许重试', async () => {
  const wrapper = mountDialog();
  await wrapper.find('input').setValue(true);
  expect(api.confirmNotice).not.toHaveBeenCalled();
  api.confirmNotice.mockRejectedValueOnce(new Error('网络不可用'));
  await wrapper.find('button').trigger('click');
  await flushPromises();
  expect(api.confirmNotice).toHaveBeenCalledWith('n1', true);
  expect(wrapper.find('[role="alert"]').text()).toBe('网络不可用');
  expect(wrapper.find('input').element.checked).toBe(true);
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  await wrapper.find('button').trigger('click');
  await flushPromises();
  expect(wrapper.emitted('confirmed')).toEqual([['n1']]);
});
it('切换公告或账号后丢弃旧确认结果', async () => {
  let resolve;
  api.confirmNotice.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const wrapper = mountDialog();
  await wrapper.find('button').trigger('click');
  await wrapper.setProps({ notice: { ...notice, id: 'n2' } });
  resolve({});
  await flushPromises();
  expect(wrapper.emitted('confirmed')).toBeUndefined();
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
});
