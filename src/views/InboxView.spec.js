import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';

const noticeApi = vi.hoisted(() => ({
  fetchOwnNotices: vi.fn(),
  markNoticeRead: vi.fn(),
}));
vi.mock('@/api/notice.api.js', () => noticeApi);

const messageApi = vi.hoisted(() => ({
  fetchOwnMessages: vi.fn(),
  fetchUnreadMessageCount: vi.fn(),
  markAllMessagesRead: vi.fn(),
  markMessageRead: vi.fn(),
}));
vi.mock('@/api/message.api.js', () => messageApi);

import InboxView from './InboxView.vue';

const messageRow = {
  id: 'm1',
  title: '审核通过',
  body: '你的点评已通过',
  category: 'review',
  refType: null,
  refId: null,
  isRead: false,
  createdAt: '2026-10-20T08:00:00Z',
};

function mountPage() {
  return mount(InboxView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        ElDialog: {
          template: '<div><slot /><slot name="footer" /></div>',
          props: ['modelValue'],
        },
      },
    },
  });
}

function buttonByText(wrapper, text) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text));
}

beforeEach(() => {
  vi.resetAllMocks();
  noticeApi.fetchOwnNotices.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    size: 20,
  });
  noticeApi.markNoticeRead.mockResolvedValue(undefined);
  messageApi.fetchOwnMessages.mockResolvedValue({
    items: [messageRow],
    total: 1,
    page: 1,
    size: 20,
  });
  messageApi.fetchUnreadMessageCount.mockResolvedValue({ unreadCount: 1 });
  messageApi.markMessageRead.mockResolvedValue(undefined);
  messageApi.markAllMessagesRead.mockResolvedValue(undefined);
});

it('默认展示公告空态，切换后展示系统消息', async () => {
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.text()).toContain('暂无公告');
  await buttonByText(wrapper, '系统消息').trigger('click');
  expect(wrapper.text()).toContain('你的点评已通过');
});

it('单条消息标为已读后刷新列表与未读数', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await buttonByText(wrapper, '系统消息').trigger('click');
  messageApi.fetchOwnMessages.mockResolvedValue({
    items: [{ ...messageRow, isRead: true }],
    total: 1,
    page: 1,
    size: 20,
  });
  messageApi.fetchUnreadMessageCount.mockResolvedValue({ unreadCount: 0 });
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '标为已读')
    .trigger('click');
  await flushPromises();
  expect(messageApi.markMessageRead).toHaveBeenCalledWith('m1');
  expect(messageApi.fetchOwnMessages).toHaveBeenCalledTimes(2);
  expect(wrapper.text()).not.toContain('标为已读');
});

it('全部标为已读调用批量接口', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await buttonByText(wrapper, '系统消息').trigger('click');
  messageApi.fetchOwnMessages.mockResolvedValue({
    items: [{ ...messageRow, isRead: true }],
    total: 1,
    page: 1,
    size: 20,
  });
  messageApi.fetchUnreadMessageCount.mockResolvedValue({ unreadCount: 0 });
  await buttonByText(wrapper, '全部标为已读').trigger('click');
  await flushPromises();
  expect(messageApi.markAllMessagesRead).toHaveBeenCalledOnce();
});
