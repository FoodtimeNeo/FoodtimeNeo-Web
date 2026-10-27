import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from './http.js';
import { fetchCommunityPosts, createCommunityPost } from './community.api.js';
vi.mock('./http.js', () => ({ http: { get: vi.fn(), post: vi.fn() } }));
describe('真实社区接口适配', () => {
  beforeEach(() => vi.clearAllMocks());
  it('使用公开游标接口并保留服务端宽高和作者', async () => {
    http.get.mockResolvedValue({
      items: [
        {
          id: 'p',
          title: '午餐',
          userId: 'u',
          userDisplayName: '同学',
          images: [{ url: '/media/1', width: 3, height: 5 }],
        },
      ],
      hasMore: true,
      nextCursor: 'next',
    });
    const page = await fetchCommunityPosts({ cursor: 'current', size: 8 });
    expect(http.get).toHaveBeenCalledWith('/community/feed/cursor', {
      params: { cursor: 'current', size: 8 },
    });
    expect(page.items[0].author.name).toBe('同学');
    expect(page.items[0].images[0].height).toBe(5);
    expect(page.nextCursor).toBe('next');
  });
  it('发布传递请求编号和有序图片，失败原样上报', async () => {
    http.post.mockRejectedValue(new Error('服务暂不可用'));
    await expect(
      createCommunityPost({
        title: '午餐',
        content: '好吃',
        images: ['/a', '/b'],
        clientRequestId: 'request',
      }),
    ).rejects.toThrow('服务暂不可用');
    expect(http.post).toHaveBeenCalledWith(
      '/community/posts',
      {
        title: '午餐',
        content: '好吃',
        imageUrls: ['/a', '/b'],
        clientRequestId: 'request',
      },
      {},
    );
  });
});
