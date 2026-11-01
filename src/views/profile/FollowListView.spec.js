import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchFollowers: vi.fn(),
  fetchFollowing: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));
vi.mock('@/api/follow.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { id: 'me' } }),
}));
import FollowListView from './FollowListView.vue';

const mountView = (kind) =>
  mount(FollowListView, {
    props: { kind },
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        MediaImage: true,
      },
    },
  });

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchFollowing.mockResolvedValue({
    items: [
      { id: 'u1', displayName: '小明', avatarUrl: null, followedByMe: true },
      { id: 'u2', displayName: '小红', avatarUrl: null, followedByMe: false },
    ],
    page: 1,
    size: 20,
    total: 2,
  });
  api.fetchFollowers.mockResolvedValue({
    items: [],
    page: 1,
    size: 20,
    total: 0,
  });
  api.unfollowUser.mockResolvedValue({ followed: false, followerCount: 0 });
  api.followUser.mockResolvedValue({ followed: true, followerCount: 1 });
});

it('关注列表请求当前用户并展示关注状态', async () => {
  const wrapper = mountView('following');
  await flushPromises();
  expect(api.fetchFollowing).toHaveBeenCalledWith('me', 1, expect.anything());
  expect(wrapper.text()).toContain('小明');
  expect(wrapper.text()).toContain('已关注');
  expect(wrapper.text()).toContain('关注');
});

it('点击关注调用接口并把状态切为已关注', async () => {
  const wrapper = mountView('following');
  await flushPromises();
  const row = wrapper
    .findAll('li')
    .find((item) => item.text().includes('小红'));
  await row.find('button').trigger('click');
  await flushPromises();
  expect(api.followUser).toHaveBeenCalledWith('u2');
  expect(row.find('button').text()).toBe('已关注');
});

it('已关注的行点击后取消关注', async () => {
  const wrapper = mountView('following');
  await flushPromises();
  const row = wrapper
    .findAll('li')
    .find((item) => item.text().includes('小明'));
  await row.find('button').trigger('click');
  await flushPromises();
  expect(api.unfollowUser).toHaveBeenCalledWith('u1');
  expect(row.find('button').text()).toBe('关注');
});

it('粉丝列表为空时展示空态', async () => {
  const wrapper = mountView('followers');
  await flushPromises();
  expect(api.fetchFollowers).toHaveBeenCalledWith('me', 1, expect.anything());
  expect(wrapper.text()).toContain('还没有人关注你');
});
