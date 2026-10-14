import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';

const fetchCanteens = vi.fn();
const fetchStalls = vi.fn();
const createReview = vi.fn();
vi.mock('@/api/canteen.api.js', () => ({
  fetchCanteens: (...args) => fetchCanteens(...args),
  fetchStalls: (...args) => fetchStalls(...args),
}));
vi.mock('@/api/review.api.js', () => ({
  createReview: (...args) => createReview(...args),
}));

const push = vi.fn();
let routeQuery = { canteenId: 'c1', dishId: 'd1' };
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push }),
  RouterLink: RouterLinkStub,
}));

const message = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('element-plus', () => ({ ElMessage: message }));

import ReviewCreateView from './ReviewCreateView.vue';

function mountView() {
  return mount(ReviewCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('ReviewCreateView', () => {
  beforeEach(() => {
    routeQuery = { canteenId: 'c1', dishId: 'd1' };
    fetchCanteens.mockReset();
    fetchStalls.mockReset();
    createReview.mockReset();
    push.mockReset();
    message.success.mockReset();
    fetchCanteens.mockResolvedValue([{ id: 'c1', name: '一食堂' }]);
    fetchStalls.mockResolvedValue([
      {
        id: 's1',
        name: '面食档口',
        dishes: [{ id: 'd1', name: '牛肉面' }],
      },
    ]);
  });

  it('从菜品详情进入时自动带入食堂、档口和菜品', async () => {
    const wrapper = mountView();
    await flushPromises();
    const selects = wrapper.findAll('select');
    expect(selects.map((select) => select.element.value)).toEqual([
      'c1',
      's1',
      'd1',
    ]);
    expect(wrapper.text()).toContain('一食堂 · 面食档口');
  });

  it('提交一次真实接口请求并返回菜品详情', async () => {
    createReview.mockResolvedValue({ id: 'r1' });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="5 星"]').trigger('click');
    await wrapper.get('textarea').setValue('汤底浓，牛肉分量足。');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(createReview).toHaveBeenCalledTimes(1);
    expect(createReview).toHaveBeenCalledWith({
      dishId: 'd1',
      rating: 5,
      comment: '汤底浓，牛肉分量足。',
    });
    expect(message.success).toHaveBeenCalledWith(
      '点评已提交，审核通过后将公开展示',
    );
    expect(push).toHaveBeenCalledWith({
      name: 'dishDetail',
      params: { canteenId: 'c1', dishId: 'd1' },
    });
  });

  it('缺少评分和文字时不调用接口并给出校验提示', async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(createReview).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain('1–5 星');
  });

  it('提交期间阻止重复请求', async () => {
    let resolveRequest;
    createReview.mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="4 星"]').trigger('click');
    await wrapper.get('textarea').setValue('值得再吃。');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(createReview).toHaveBeenCalledTimes(1);
    resolveRequest({ id: 'r1' });
    await flushPromises();
  });
});
