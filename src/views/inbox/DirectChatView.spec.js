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
