import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchDish: vi.fn(),
  fetchDishReviews: vi.fn(),
  fetchDishImages: vi.fn(),
  fetchDishRating: vi.fn(),
}));
vi.mock('@/api/dish.api.js', () => api);
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
  }),
  RouterLink: RouterLinkStub,
}));
import DishDetailView from './DishDetailView.vue';
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.fetchDish.mockResolvedValue({
    id: 'd1',
    name: '牛肉面',
    price: 0,
    stallId: 's1',
    diningHallId: 'c1',
    stallName: '面档',
    diningHallName: '第一食堂',
  });
  api.fetchDishImages.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    size: 20,
  });
  api.fetchDishRating.mockResolvedValue({
    averageScore: 4.25,
    reviewCount: 30,
  });
  api.fetchDishReviews.mockResolvedValue({
    items: [
      {
        id: 'r1',
        userId: 'user-id',
        userDisplayName: '干饭达人',
        rating: 5,
        content: '好吃',
      },
    ],
    total: 21,
    page: 1,
    size: 20,
  });
});
describe('菜品真实详情', () => {
  it('写点评按钮进入当前菜品子页面，不使用选择目标的查询参数', async () => {
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    const link = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.text() === '写点评');
    expect(link.props('to')).toEqual({
      name: 'dishReviewCreate',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
  });
  it('评分取服务器快照，评论显示昵称与正文，隐藏投票', async () => {
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('4.25 / 5');
    expect(wrapper.text()).toContain('每日更新');
    expect(wrapper.text()).toContain('干饭达人');
    expect(wrapper.text()).not.toContain('user-id');
    expect(wrapper.text()).toContain('好吃');
    expect(wrapper.text()).toContain('暂未上传菜品图片');
    expect(wrapper.text()).toContain('¥0.00');
    expect(wrapper.text()).not.toContain('避雷');
    expect(wrapper.text()).not.toContain('推荐 ·');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '下一页')
      .trigger('click');
    await flushPromises();
    expect(api.fetchDishReviews.mock.calls.at(-1).slice(0, 2)).toEqual([
      'd1',
      2,
    ]);
  });
  it('跨食堂或档口URL不展示错误上下文', async () => {
    api.fetchDish.mockResolvedValue({
      id: 'd1',
      name: '不能展示',
      diningHallId: 'other',
      stallId: 's1',
    });
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('不匹配');
    expect(wrapper.text()).not.toContain('不能展示');
    expect(api.fetchDishImages).not.toHaveBeenCalled();
  });
  it('无快照评分显示暂无评分，不以评论计算分数', async () => {
    api.fetchDishRating.mockResolvedValue({
      averageScore: null,
      reviewCount: 0,
    });
    const wrapper = mount(DishDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('暂无评分');
  });
});
