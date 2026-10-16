import { expect, it, vi } from 'vitest';
const post = vi.hoisted(() => vi.fn());
vi.mock('./http.js', () => ({ http: { post } }));
import { createReview } from './review.api.js';
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
