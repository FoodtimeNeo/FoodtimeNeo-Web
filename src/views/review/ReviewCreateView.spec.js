import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchCanteens: vi.fn(),
  fetchStalls: vi.fn(),
  fetchStallDishes: vi.fn(),
  createReview: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));
vi.mock('@/api/canteen.api.js', () => api);
vi.mock('@/api/review.api.js', () => api);
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { canteenId: 'c1', stallId: 's1', dishId: 'd1' } }),
  useRouter: () => ({ push: api.push }),
  RouterLink: RouterLinkStub,
}));
vi.mock('element-plus', () => ({ ElMessage: { success: api.success } }));
import ReviewCreateView from './ReviewCreateView.vue';
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.fetchCanteens.mockResolvedValue([{ id: 'c1', name: '第一食堂' }]);
  api.fetchStalls.mockResolvedValue([
    { id: 's1', name: '面档', diningHallId: 'c1' },
  ]);
  api.fetchStallDishes.mockResolvedValue([
    { id: 'd1', stallId: 's1', name: '牛肉面' },
  ]);
});
function view() {
  return mount(ReviewCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}
describe('真实点评投稿', () => {
  it('从详情带入三级关系并请求独立菜品接口', async () => {
    const wrapper = view();
    await flushPromises();
    expect(wrapper.findAll('select').map((s) => s.element.value)).toEqual([
      'c1',
      's1',
      'd1',
    ]);
    expect(api.fetchStallDishes).toHaveBeenCalledWith('s1');
  });
  it('提交真实内容一次，并返回完整菜品上下文', async () => {
    api.createReview.mockResolvedValue({ id: 'review', status: 'pending' });
    const wrapper = view();
    await flushPromises();
    await wrapper.get('[aria-label="5 星"]').trigger('click');
    await wrapper.get('textarea').setValue('好吃');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.createReview).toHaveBeenCalledWith({
      dishId: 'd1',
      rating: 5,
      content: '好吃',
    });
    expect(api.push).toHaveBeenCalledWith({
      name: 'dishDetail',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
  });
  it('评分未选不能投稿；失败保留正文', async () => {
    const wrapper = view();
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(api.createReview).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('1–5');
    await wrapper.get('[aria-label="4 星"]').trigger('click');
    await wrapper.get('textarea').setValue('保留草稿');
    api.createReview.mockRejectedValue(new Error('已有待审核点评'));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('保留草稿');
    expect(wrapper.text()).toContain('已有待审核');
  });
  it('提交中固定目标并阻止重复请求', async () => {
    let resolve;
    api.createReview.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const wrapper = view();
    await flushPromises();
    await wrapper.get('[aria-label="4 星"]').trigger('click');
    await wrapper.get('textarea').setValue('内容');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(api.createReview).toHaveBeenCalledOnce();
    expect(wrapper.get('select').attributes('disabled')).toBeDefined();
    resolve({ id: 'review', status: 'pending' });
    await flushPromises();
  });
});
