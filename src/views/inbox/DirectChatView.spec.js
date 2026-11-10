import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  fetchConversation: vi.fn(),
  fetchConversationMessages: vi.fn(),
  sendDirectMessage: vi.fn(),
  markConversationRead: vi.fn(),
  hideConversation: vi.fn(),
}));
vi.mock('@/api/directMessage.api.js', () => api);
const safety = vi.hoisted(() => ({
  fetchBlockState: vi.fn(),
  setUserBlock: vi.fn(),
  submitReport: vi.fn(),
}));
vi.mock('@/api/safety.api.js', () => safety);
const dialog = vi.hoisted(() => ({
  confirm: vi.fn(),
  prompt: vi.fn(),
}));
vi.mock('element-plus', async (importOriginal) => ({
  ...(await importOriginal()),
  ElMessageBox: dialog,
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

const route = vi.hoisted(() => ({ params: { conversationId: 'c1' } }));
const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}));
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}));

import DirectChatView from './DirectChatView.vue';

beforeEach(() => {
  vi.clearAllMocks();
  safety.fetchBlockState.mockResolvedValue({ blocked: false });
  api.fetchConversation.mockResolvedValue({
    id: 'c1',
    other: { id: 'u2', displayName: '小红', avatarUrl: null },
  });
  api.fetchConversationMessages.mockResolvedValue({
    items: [
      {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u2',
        content: '你好',
        createdAt: '2026-11-06T10:00:00Z',
      },
    ],
    hasMore: false,
    nextCursor: null,
  });
  api.markConversationRead.mockResolvedValue(undefined);
  api.sendDirectMessage.mockResolvedValue({
    id: 'm2',
    conversationId: 'c1',
    senderId: 'me',
    content: '今晚吃食堂',
    createdAt: '2026-11-06T10:01:00Z',
  });
});

it('只举报被选中的对方私信，并在拉黑成功后关闭发送入口', async () => {
  const wrapper = mount(DirectChatView);
  dialog.prompt.mockResolvedValue({ value: ' 骚扰 ' });
  dialog.confirm.mockResolvedValue(true);
  safety.setUserBlock.mockResolvedValue({ blocked: true });
  await flushPromises();
  const button = (label) =>
    wrapper.findAll('button').find((item) => item.text() === label);
  await button('举报').trigger('click');
  await flushPromises();
  expect(safety.submitReport).toHaveBeenCalledExactlyOnceWith(
    'message',
    'm1',
    '骚扰',
  );
  await button('拉黑管理').trigger('click');
  await flushPromises();
  expect(safety.setUserBlock).toHaveBeenCalledExactlyOnceWith('u2', true);
  expect(wrapper.find('textarea').exists()).toBe(false);
  expect(wrapper.text()).toContain('解除拉黑');
  expect(api.sendDirectMessage).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('加载会话后发送消息并追加到列表', async () => {
  const wrapper = mount(DirectChatView);
  await flushPromises();
  expect(wrapper.text()).toContain('小红');
  expect(wrapper.text()).toContain('你好');
  expect(api.markConversationRead).toHaveBeenCalledWith('c1');

  await wrapper.find('textarea').setValue('  今晚吃食堂  ');
  await wrapper.find('form').trigger('submit.prevent');
  await flushPromises();

  expect(api.sendDirectMessage).toHaveBeenCalledWith('c1', {
    content: '今晚吃食堂',
    clientRequestId: expect.any(String),
  });
  expect(wrapper.text()).toContain('今晚吃食堂');
  expect(wrapper.find('textarea').element.value).toBe('');
  wrapper.unmount();
});

it('页面重新可见时刷新私信，重叠事件只发一次请求', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const wrapper = mount(DirectChatView);
  await flushPromises();
  let complete;
  api.fetchConversationMessages.mockReturnValueOnce(
    new Promise((resolve) => (complete = resolve)),
  );
  document.dispatchEvent(new Event('visibilitychange'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(api.fetchConversationMessages).toHaveBeenCalledTimes(2);
  complete({ items: [{ id: 'm3', senderId: 'u2', content: '又一条私信' }] });
  await flushPromises();
  expect(wrapper.text()).toContain('又一条私信');
  wrapper.unmount();
  hidden.mockRestore();
});
