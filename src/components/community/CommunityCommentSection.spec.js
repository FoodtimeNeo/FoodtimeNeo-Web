import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunityCommentSection from './CommunityCommentSection.vue';
const api = vi.hoisted(() => ({
  fetchRootComments: vi.fn(),
  fetchCommentReplies: vi.fn(),
  createPostComment: vi.fn(),
  deletePostComment: vi.fn(),
}));
vi.mock('@/api/community.api.js', () => api);
const root = {
  id: 'root',
  userId: 'u1',
  status: 'approved',
  author: { name: '甲同学' },
  content: '一级评论',
  createdAt: '2026-10-23T01:00:00Z',
};
const reply = {
  id: 'reply',
  userId: 'u2',
  rootCommentId: 'root',
  replyToCommentId: 'root',
  replyToDisplayName: '甲同学',
  status: 'approved',
  author: { name: '乙同学' },
  content: '楼内回复',
  createdAt: '2026-10-23T02:00:00Z',
};
describe('紧凑楼中楼', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.fetchRootComments.mockResolvedValue({ items: [root], hasMore: false });
    api.fetchCommentReplies.mockResolvedValue({
      items: [reply],
      hasMore: false,
    });
  });
  it('只缩进一层，楼内互相回复发送实际对象 ID', async () => {
    api.createPostComment.mockResolvedValue({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    expect(wrapper.findAll('.compact-replies')).toHaveLength(1);
    await wrapper
      .find('[data-comment-id="reply"] .reply-button')
      .trigger('click');
    expect(wrapper.find('.reply-selection').text()).toContain('乙同学');
    expect(wrapper.find('textarea').element.value).toBe('');
    await wrapper.find('textarea').setValue('赞同你的推荐');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.createPostComment).toHaveBeenCalledWith('post', {
      content: '赞同你的推荐',
      rootCommentId: 'root',
      replyToCommentId: 'reply',
      clientRequestId: expect.any(String),
    });
  });
  it('失败保留草稿，重试复用编号', async () => {
    api.createPostComment
      .mockRejectedValueOnce(new Error('请求超时'))
      .mockResolvedValueOnce({ id: 'new' });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    await wrapper.find('textarea').setValue('重试评论');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('textarea').element.value).toBe('重试评论');
    expect(wrapper.text()).toContain('请求超时');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.createPostComment.mock.calls[0][1].clientRequestId).toBe(
      api.createPostComment.mock.calls[1][1].clientRequestId,
    );
  });
  it('删根评论仅展示占位并保留回复，禁止继续回复', async () => {
    api.fetchRootComments.mockResolvedValue({
      items: [{ ...root, content: '', deleted: true }],
      hasMore: false,
    });
    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'post' },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('原评论已删除');
    expect(wrapper.text()).toContain('楼内回复');
    expect(wrapper.findAll('.reply-button')).toHaveLength(0);
  });
});
