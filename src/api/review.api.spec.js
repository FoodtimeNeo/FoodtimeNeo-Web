import { expect, it, vi } from 'vitest';
const post = vi.hoisted(() => vi.fn());
const put = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('./http.js', () => ({ http: { get, post, put, delete: remove } }));
import {
  createReview,
  setReviewLike,
  fetchReviewReplies,
  createReviewReply,
} from './review.api.js';
it('点评使用菜品路径和现有rating/content，不发送客户端身份或状态', async () => {
  await createReview({
    dishId: 'dish',
    rating: 5,
    content: '真实点评',
    userId: 'fake',
    status: 'approved',
  });
  expect(post).toHaveBeenCalledWith('/dishes/dish/reviews', {
    rating: 5,
    content: '真实点评',
  });
});
it('回复分页携带游标，提交只发送正文、结构化对象和去重标识', async () => {
  await fetchReviewReplies('a/b', 'cursor');
  expect(get).toHaveBeenCalledWith('/reviews/a%2Fb/replies', {
    params: { size: 20, cursor: 'cursor' },
  });
  await createReviewReply('r', {
    content: '好吃',
    replyToId: 'parent',
    clientRequestId: 'request',
    status: 'approved',
    userId: 'fake',
  });
  expect(post).toHaveBeenLastCalledWith('/reviews/r/replies', {
    content: '好吃',
    replyToId: 'parent',
    clientRequestId: 'request',
  });
});
it('点赞与取消使用幂等方法和编码后的评论路径', async () => {
  await setReviewLike('a/b', true);
  expect(put).toHaveBeenCalledWith('/reviews/a%2Fb/like');
  await setReviewLike('a/b', false);
  expect(remove).toHaveBeenCalledWith('/reviews/a%2Fb/like');
});
