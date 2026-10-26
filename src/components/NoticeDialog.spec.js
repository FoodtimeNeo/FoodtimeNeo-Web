import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

const api = vi.hoisted(() => ({ markNoticeRead: vi.fn() }));
vi.mock('@/api/notice.api.js', () => api);

import NoticeDialog from './NoticeDialog.vue';

const notice = {
  id: 'n1',
  title: '停水通知',
  body: '明日停水半天',
  publishedAt: '2026-10-20T08:00:00Z',
};

function mountDialog(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/inbox', name: 'inboxView', component: { template: '<div />' } },
    ],
  });
  const wrapper = mount(NoticeDialog, {
    props: { modelValue: false, notice: null, ...props },
    global: {
      plugins: [router],
      stubs: {
        ElDialog: {
          template: '<div><slot /><slot name="footer" /></div>',
          props: ['modelValue'],
        },
      },
    },
  });
  return { wrapper, router };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.markNoticeRead.mockResolvedValue(undefined);
});

it('打开详情即标记已读并通知外层刷新', async () => {
  const { wrapper } = mountDialog({ notice });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  expect(api.markNoticeRead).toHaveBeenCalledWith('n1');
  expect(wrapper.emitted('read')).toEqual([['n1']]);
  expect(wrapper.text()).toContain('停水通知');
  expect(wrapper.text()).toContain('明日停水半天');
});

it('已读公告打开时不再重复标记', async () => {
  const { wrapper } = mountDialog({
    notice: { ...notice, isRead: true },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  expect(api.markNoticeRead).not.toHaveBeenCalled();
  expect(wrapper.emitted('read')).toBeUndefined();
});

it('去信箱看看关闭弹窗并跳转信箱', async () => {
  const { wrapper, router } = mountDialog({ modelValue: true, notice });
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '去信箱看看')
    .trigger('click');
  await flushPromises();
  expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  expect(router.currentRoute.value.name).toBe('inboxView');
});

it('知道了仅关闭弹窗', async () => {
  const { wrapper } = mountDialog({ modelValue: true, notice });
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '知道了')
    .trigger('click');
  expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
});
