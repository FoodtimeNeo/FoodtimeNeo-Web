import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const fetchPostComments = vi.fn();
const createPostComment = vi.fn();

vi.mock('@/api/community.api.js', () => ({
  fetchPostComments: (...args) => fetchPostComments(...args),
  createPostComment: (...args) => createPostComment(...args),
}));

import CommunityCommentSection from './CommunityCommentSection.vue';

describe('CommunityCommentSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchPostComments.mockReset();
    createPostComment.mockReset();
  });

  it('展示评论列表且不包含下阶段字样，支持点赞与回复联动', async () => {
    fetchPostComments.mockResolvedValue([
      {
        id: 'c1',
        postId: 'p1',
        author: { id: 'u1', name: '小红' },
        content: '汤很好喝！',
        createdAt: '2026-10-19T10:00:00.000Z',
        likeCount: 2,
      },
    ]);

    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'p1' },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('汤很好喝！');
    expect(wrapper.text()).toContain('小红');
    expect(wrapper.text()).not.toContain('下阶段');
    expect(wrapper.text()).not.toContain('下一阶段');

    // 点赞
    const likeBtn = wrapper.find('.sub-action-btn');
    expect(likeBtn.text()).toContain('👍 2');
    await likeBtn.trigger('click');
    expect(likeBtn.text()).toContain('👍 3');
    expect(likeBtn.classes()).toContain('is-liked');

    // 回复自动在输入框填入 @小红
    const replyBtn = wrapper.findAll('.sub-action-btn')[1];
    await replyBtn.trigger('click');
    const textarea = wrapper.find('.community-comments__textarea');
    expect(textarea.element.value).toBe('@小红 ');
  });

  it('可以成功发送新评论并更新列表', async () => {
    fetchPostComments.mockResolvedValue([]);
    createPostComment.mockResolvedValue({
      id: 'c2',
      postId: 'p1',
      author: { id: 'u2', name: '我' },
      content: '我也觉得超赞！',
      createdAt: '2026-10-19T10:05:00.000Z',
      likeCount: 0,
    });

    const wrapper = mount(CommunityCommentSection, {
      props: { postId: 'p1' },
    });
    await flushPromises();

    const textarea = wrapper.find('.community-comments__textarea');
    await textarea.setValue('我也觉得超赞！');

    const sendBtn = wrapper.find('.community-comments__send-btn');
    await sendBtn.trigger('click');
    await flushPromises();

    expect(createPostComment).toHaveBeenCalledWith('p1', {
      content: '我也觉得超赞！',
    });
    expect(wrapper.text()).toContain('我也觉得超赞！');
  });
});
