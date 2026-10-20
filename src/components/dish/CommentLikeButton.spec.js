import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CommentLikeButton from './CommentLikeButton.vue';

describe('评论点赞', () => {
  it('等待服务器结果，阻止重复操作，并能取消点赞', async () => {
    let resolve;
    const save = vi.fn(() => new Promise((done) => (resolve = done)));
    const wrapper = mount(CommentLikeButton, {
      props: {
        target: { id: 'r', likeCount: 2, likedByMe: false, counterVersion: 4 },
        save,
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').element.disabled).toBe(true);
    expect(wrapper.text()).toContain('2');
    expect(save).toHaveBeenCalledExactlyOnceWith(true);
    resolve({ likeCount: 3, likedByMe: true, counterVersion: 5 });
    await flushPromises();
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true');
    save.mockResolvedValue({
      likeCount: 2,
      likedByMe: false,
      counterVersion: 6,
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(save).toHaveBeenLastCalledWith(false);
    expect(wrapper.text()).toContain('赞 2');
  });

  it('失败保留原计数并就近显示错误，较旧响应不能覆盖新计数', async () => {
    const save = vi.fn().mockRejectedValue(new Error('请求失败'));
    const wrapper = mount(CommentLikeButton, {
      props: {
        target: { id: 'r', likeCount: 8, likedByMe: false, counterVersion: 10 },
        save,
      },
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toBe('请求失败');
    expect(wrapper.text()).toContain('赞 8');
    save.mockResolvedValue({
      likeCount: 7,
      likedByMe: true,
      counterVersion: 9,
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('赞 8');
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false');
  });
});
