import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  searchUsers: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  startConversation: vi.fn(),
  push: vi.fn(),
  user: { id: 'me', role: 'user' },
}));
vi.mock('@/api/user-search.api.js', () => ({ searchUsers: api.searchUsers }));
vi.mock('@/api/follow.api.js', () => ({
  followUser: api.followUser,
  unfollowUser: api.unfollowUser,
}));
vi.mock('@/api/directMessage.api.js', () => ({
  startConversation: api.startConversation,
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => api }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: api.push }) }));
import UserSearchView from './UserSearchView.vue';

const row = {
  id: 'u2',
  displayName: '小李',
  avatarUrl: null,
  followedByMe: false,
};
const page = (items = [row], total = items.length) => ({
  items,
  total,
  page: 1,
  size: 20,
});
let wrapper;
function render() {
  wrapper = mount(UserSearchView, {
    global: { stubs: { RouterLink: RouterLinkStub, MediaImage: true } },
  });
  return wrapper;
}
async function search(value = '小李') {
  await wrapper.get('input').setValue(value);
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  setActivePinia(createPinia());
  api.user = { id: 'me', role: 'user' };
  for (const value of Object.values(api))
    if (typeof value === 'function') value.mockReset();
  api.searchUsers.mockResolvedValue(page());
  api.followUser.mockResolvedValue({ followed: true });
  api.unfollowUser.mockResolvedValue({ followed: false });
  api.startConversation.mockResolvedValue({ id: 'c1' });
});
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});

it('空关键词不取数，停顿300ms后只发送最后的昵称查询', async () => {
  render();
  expect(api.searchUsers).not.toHaveBeenCalled();
  await wrapper.get('input').setValue('小');
  await wrapper.get('input').setValue(' 小李 ');
  await vi.advanceTimersByTimeAsync(299);
  expect(api.searchUsers).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await flushPromises();
  expect(api.searchUsers).toHaveBeenCalledTimes(1);
  expect(api.searchUsers).toHaveBeenCalledWith('小李', 1, {
    signal: expect.any(AbortSignal),
  });
  expect(wrapper.findAll('li')).toHaveLength(1);
  expect(wrapper.get('li').text()).toContain('小李');
});

it('关注和取消关注就地更新同一行，不重新搜索', async () => {
  render();
  await search();
  const element = wrapper.get('li').element;
  await wrapper.get('[aria-label="关注小李"]').trigger('click');
  await flushPromises();
  expect(api.followUser).toHaveBeenCalledWith('u2');
  expect(wrapper.get('[aria-label="取消关注小李"]').text()).toBe('已关注');
  expect(wrapper.get('li').element).toBe(element);
  await wrapper.get('[aria-label="取消关注小李"]').trigger('click');
  await flushPromises();
  expect(api.unfollowUser).toHaveBeenCalledWith('u2');
  expect(api.searchUsers).toHaveBeenCalledTimes(1);
});

it('私信按钮打开当前用户对应的会话', async () => {
  render();
  await search();
  await wrapper.get('[aria-label="私信小李"]').trigger('click');
  await flushPromises();
  expect(api.startConversation).toHaveBeenCalledWith('u2');
  expect(api.push).toHaveBeenCalledWith({
    name: 'directChat',
    params: { conversationId: 'c1' },
  });
});

it('清空输入立即取消旧查询，迟到结果不能恢复旧用户', async () => {
  let complete;
  api.searchUsers.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  render();
  await search();
  const signal = api.searchUsers.mock.calls[0][2].signal;
  await wrapper.get('input').setValue('');
  expect(signal.aborted).toBe(true);
  complete(page());
  await flushPromises();
  expect(wrapper.find('li').exists()).toBe(false);
  expect(wrapper.text()).toContain('想找哪位同学');
});

it('分页只请求当前关键词，搜索框保留原实例', async () => {
  api.searchUsers.mockResolvedValue(page([row], 21));
  render();
  await search();
  const input = wrapper.get('input').element;
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '下一页')
    .trigger('click');
  await flushPromises();
  expect(api.searchUsers.mock.calls.at(-1).slice(0, 2)).toEqual(['小李', 2]);
  expect(wrapper.get('input').element).toBe(input);
});

it('修改关键词立即收起旧结果和分页，防止操作上一轮用户', async () => {
  api.searchUsers.mockResolvedValue(page([row], 21));
  render();
  await search();
  expect(wrapper.find('li').exists()).toBe(true);
  await wrapper.get('input').setValue('新昵称');
  expect(wrapper.find('li').exists()).toBe(false);
  expect(wrapper.find('.pagination').exists()).toBe(false);
  expect(api.searchUsers).toHaveBeenCalledTimes(1);
});

it('操作失败保留结果并在原行说明，访客只读', async () => {
  api.followUser.mockRejectedValueOnce(new Error('请求过于频繁'));
  render();
  await search();
  await wrapper.get('[aria-label="关注小李"]').trigger('click');
  await flushPromises();
  expect(wrapper.get('li').text()).toContain('请求过于频繁');
  expect(
    wrapper.get('[aria-label="关注小李"]').attributes('disabled'),
  ).toBeUndefined();
  wrapper.unmount();
  api.user = { id: 'visitor', role: 'visitor' };
  render();
  await search();
  expect(
    wrapper.get('[aria-label="关注小李"]').attributes('disabled'),
  ).toBeDefined();
  expect(
    wrapper.get('[aria-label="私信小李"]').attributes('disabled'),
  ).toBeDefined();
  expect(wrapper.text()).toContain('绑定学校邮箱');
});

it('空结果和查询错误仅影响结果区域', async () => {
  api.searchUsers
    .mockResolvedValueOnce(page([]))
    .mockRejectedValueOnce(new Error('网络断开'));
  render();
  await search();
  expect(wrapper.text()).toContain('没有找到匹配的用户');
  await search('别的昵称');
  expect(wrapper.text()).toContain('网络断开');
  expect(wrapper.get('input').element.value).toBe('别的昵称');
});
