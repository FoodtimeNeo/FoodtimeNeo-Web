import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { ApiError } from '@/api/http.js';

const fetchDish = vi.fn();
const fetchDishReviews = vi.fn();
const recommendDish = vi.fn();
const avoidDish = vi.fn();
vi.mock('@/api/dish.api.js', () => ({
  fetchDish: (...a) => fetchDish(...a),
  fetchDishReviews: (...a) => fetchDishReviews(...a),
  recommendDish: (...a) => recommendDish(...a),
  avoidDish: (...a) => avoidDish(...a),
}));

let authState = { isAuthenticated: true };
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => authState,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { canteenId: 'c1', dishId: 'd1' } }),
  RouterLink: RouterLinkStub,
}));

const message = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('element-plus', () => ({ ElMessage: message }));

import DishDetailView from './DishDetailView.vue';

function mountView() {
  return mount(DishDetailView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DishDetailView', () => {
  beforeEach(() => {
    fetchDish.mockReset();
    fetchDishReviews.mockReset();
    recommendDish.mockReset();
    avoidDish.mockReset();
    message.success.mockReset();
    message.error.mockReset();
    message.warning.mockReset();
    authState = { isAuthenticated: true };
  });

  it('展示菜品主图、评分、价格与评论', async () => {
    fetchDish.mockResolvedValue({
      id: 'd1',
      name: '红烧牛肉面',
      price: 15,
      rating: 4.7,
      imageUrl: '/d1.jpg',
      recommendVotes: 3,
      avoidVotes: 1,
    });
    fetchDishReviews.mockResolvedValue([
      {
        id: 'r1',
        rating: 5,
        comment: '好吃',
        reviewer: '同学A',
        createdAt: '2026-01-01',
      },
    ]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('红烧牛肉面');
    expect(wrapper.text()).toContain('¥15');
    expect(wrapper.text()).toContain('推荐 · 3');
    expect(wrapper.text()).toContain('避雷 · 1');
    expect(wrapper.text()).toContain('好吃');
  });

  it('菜品不存在时显示错误态', async () => {
    fetchDish.mockRejectedValue(
      new ApiError('菜品不存在', { status: 404, code: 'NOT_FOUND' }),
    );
    fetchDishReviews.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('菜品不存在');
  });

  it('推荐成功后票数乐观 +1', async () => {
    fetchDish.mockResolvedValue({
      id: 'd1',
      name: '面',
      imageUrl: '/d.jpg',
      recommendVotes: 2,
      avoidVotes: 0,
    });
    fetchDishReviews.mockResolvedValue([]);
    recommendDish.mockResolvedValue({});
    const wrapper = mountView();
    await flushPromises();
    const recommendBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('推荐'));
    await recommendBtn.trigger('click');
    await flushPromises();
    expect(recommendDish).toHaveBeenCalledWith('d1');
    expect(wrapper.text()).toContain('推荐 · 3');
  });

  it('推荐失败时票数回滚', async () => {
    fetchDish.mockResolvedValue({
      id: 'd1',
      name: '面',
      imageUrl: '/d.jpg',
      recommendVotes: 2,
      avoidVotes: 0,
    });
    fetchDishReviews.mockResolvedValue([]);
    recommendDish.mockRejectedValue(new ApiError('失败', { status: 500 }));
    const wrapper = mountView();
    await flushPromises();
    const recommendBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('推荐'));
    await recommendBtn.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('推荐 · 2');
  });

  it('未登录点击投票时提示登录且不请求', async () => {
    authState = { isAuthenticated: false };
    fetchDish.mockResolvedValue({ id: 'd1', name: '面', imageUrl: '/d.jpg' });
    fetchDishReviews.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();
    const recommendBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('推荐'));
    await recommendBtn.trigger('click');
    await flushPromises();
    expect(recommendDish).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });
});
