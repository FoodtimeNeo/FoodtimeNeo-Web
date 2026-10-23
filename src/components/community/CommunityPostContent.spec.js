import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityPostContent from './CommunityPostContent.vue';
const api = vi.hoisted(() => ({
  fetchCommunityPostDetail: vi.fn(),
  setPostLike: vi.fn(),
  setPostFavorite: vi.fn(),
  deleteCommunityPost: vi.fn(),
}));
vi.mock('@/api/community.api.js', () => api);
function content() {
  return mount(CommunityPostContent, {
    props: { postId: 'post' },
    global: { stubs: { CommunityCommentSection: true } },
  });
}
describe('帖子服务端互动状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.fetchCommunityPostDetail.mockResolvedValue({
      id: 'post',
      status: 'approved',
      title: '午餐',
      content: '好吃',
      images: [],
      createdAt: '2026-10-23T00:00:00Z',
      likeCount: 5,
      favoriteCount: 2,
      commentCount: 3,
      likedByMe: false,
      favoritedByMe: false,
    });
  });
  it('请求完成前禁止重复提交，使用服务端最新计数', async () => {
    let finish;
    api.setPostLike.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = content();
    await flushPromises();
    await wrapper.find('.post-like').trigger('click');
    await wrapper.find('.post-like').trigger('click');
    expect(api.setPostLike).toHaveBeenCalledTimes(1);
    expect(api.setPostLike).toHaveBeenCalledWith('post', true);
    expect(wrapper.find('.post-like').text()).toContain('5');
    finish({ liked: true, likeCount: 8 });
    await flushPromises();
    expect(wrapper.find('.post-like').text()).toContain('已赞 8');
  });
  it('服务端失败保留原计数并显示错误', async () => {
    api.setPostFavorite.mockRejectedValue(new Error('帖子已不可见'));
    const wrapper = content();
    await flushPromises();
    await wrapper.find('.post-favorite').trigger('click');
    await flushPromises();
    expect(wrapper.find('.post-favorite').text()).toContain('2');
    expect(wrapper.find('[role=alert]').text()).toBe('帖子已不可见');
  });
});
