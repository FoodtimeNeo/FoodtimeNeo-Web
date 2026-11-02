import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
const api = vi.hoisted(() => ({
  fetchVenueReplies: vi.fn(),
  submitVenueReply: vi.fn(),
  fetchVenueReplyStatus: vi.fn(),
}));
vi.mock('@/api/venue-review.api.js', () => api);
import View from './VenueReplySection.vue';
let wrapper;
const pub = {
  id: 'reply-one',
  userDisplayName: '同学甲',
  content: '公开回复',
  status: 'approved',
  likeCount: 0,
};
const own = {
  id: 'private-one',
  userDisplayName: '同学乙',
  content: '本人待审回复',
  status: 'pending',
  ownedByMe: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  useAuthStore().setSession({ user: { id: 'one', role: 'user' } });
  api.fetchVenueReplies.mockImplementation((id, cursor, mine) =>
    Promise.resolve({ items: mine ? [own] : [pub], total: mine ? 1 : 1 }),
  );
});
afterEach(() => wrapper?.unmount());
const open = async () => {
  wrapper = mount(View, { props: { review: { id: 'root', replyCount: 1 } } });
  await wrapper.get('button').trigger('click');
  await flushPromises();
};
it('公开与本人待审回复分开读取和展示，收起保留草稿', async () => {
  await open();
  expect(wrapper.get('[data-private-reply]').text()).toContain(
    '审核中 · 仅自己可见',
  );
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '写下你的回复…')
    .trigger('click');
  await wrapper.get('textarea').setValue('未提交草稿');
  await wrapper.get('button').trigger('click');
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('textarea').element.value).toBe('未提交草稿');
});
it('楼中楼发送实际回复对象，网络失败保留输入和操作 ID', async () => {
  await open();
  api.submitVenueReply.mockRejectedValue(new Error('离线'));
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '回复这条')
    .trigger('click');
  await wrapper.get('textarea').setValue('回复正文');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  const first = api.submitVenueReply.mock.calls[0][1],
    second = api.submitVenueReply.mock.calls[1][1];
  expect(first.replyToId).toBe(pub.id);
  expect(first.clientRequestId).toBe(second.clientRequestId);
  expect(wrapper.get('textarea').element.value).toBe('回复正文');
});
