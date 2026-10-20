import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchCommunityPosts,
  fetchCommunityPostDetail,
  createCommunityPost,
  fetchPostComments,
  createPostComment,
  resetCommunityMockData,
} from './community.api.js';

describe('community.api', () => {
  beforeEach(() => {
    resetCommunityMockData();
  });

  it('fetchCommunityPosts 默认只拉取 approved 状态的帖子并按时间倒序', async () => {
    const res = await fetchCommunityPosts();
    expect(res.items.length).toBeGreaterThan(0);
    // 所有帖子必须是 approved
    res.items.forEach((item) => {
      expect(item.status).toBe('approved');
    });

    // 检查时间倒序
    for (let i = 1; i < res.items.length; i++) {
      const prevTime = new Date(res.items[i - 1].createdAt).getTime();
      const currTime = new Date(res.items[i].createdAt).getTime();
      expect(prevTime).toBeGreaterThanOrEqual(currTime);
    }
  });

  it('fetchCommunityPostDetail 正常获取详情，不存在时抛出 404', async () => {
    const post = await fetchCommunityPostDetail('post-101');
    expect(post.id).toBe('post-101');
    expect(post.title).toContain('瓦罐汤');

    await expect(fetchCommunityPostDetail('not-exist-post')).rejects.toThrow(
      '帖子不存在或已被删除',
    );
  });

  it('createCommunityPost 发帖成功后状态为 pending，且默认不出现在 approved 列表中', async () => {
    // 标题为空抛出校验错误
    await expect(
      createCommunityPost({ title: '   ', content: '内容' }),
    ).rejects.toThrow('帖子标题不能为空');

    // 内容为空抛出校验错误
    await expect(
      createCommunityPost({ title: '标题', content: '  ' }),
    ).rejects.toThrow('帖子内容不能为空');

    // 发帖成功
    const newPost = await createCommunityPost({
      title: '今天的美食日记',
      content: '食堂二楼好吃的很多！',
      images: ['https://example.com/test.jpg'],
    });

    expect(newPost.title).toBe('今天的美食日记');
    expect(newPost.status).toBe('pending'); // 关键：默认审核状态为 pending

    // 默认列表获取中不包含此待审核帖子
    const approvedPosts = await fetchCommunityPosts();
    expect(approvedPosts.items.some((p) => p.id === newPost.id)).toBe(false);

    // 指定查询 pending 状态可查到
    const pendingPosts = await fetchCommunityPosts({ status: 'pending' });
    expect(pendingPosts.items.some((p) => p.id === newPost.id)).toBe(true);
  });

  it('fetchPostComments 与 createPostComment 发表评论及更新计数', async () => {
    const initialComments = await fetchPostComments('post-101');
    const initialCount = initialComments.length;

    await expect(
      createPostComment('post-101', { content: ' ' }),
    ).rejects.toThrow('评论内容不能为空');

    const newComment = await createPostComment('post-101', {
      content: '味道确实很不错，下次还来！',
    });

    expect(newComment.content).toBe('味道确实很不错，下次还来！');
    expect(newComment.postId).toBe('post-101');

    const updatedComments = await fetchPostComments('post-101');
    expect(updatedComments.length).toBe(initialCount + 1);
    expect(updatedComments[updatedComments.length - 1].content).toBe(
      '味道确实很不错，下次还来！',
    );

    // 验证帖子评论数增加了
    const post = await fetchCommunityPostDetail('post-101');
    expect(post.commentCount).toBe(initialCount + 1);
  });
});
