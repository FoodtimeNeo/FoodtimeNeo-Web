import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchDish: vi.fn(),
  createReview: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));
vi.mock('@/api/dish.api.js', () => ({ fetchDish: api.fetchDish }));
vi.mock('@/api/review.api.js', () => ({ createReview: api.createReview }));
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    query: { canteenId: 'other', stallId: 'other', dishId: 'other' },
  }),
  useRouter: () => ({ push: api.push }),
  RouterLink: RouterLinkStub,
}));
vi.mock('element-plus', () => ({ ElMessage: { success: api.success } }));
import DishReviewCreateView from './DishReviewCreateView.vue';
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.fetchDish.mockResolvedValue({
    id: 'd1',
    name: '牛肉面',
    stallId: 's1',
    stallName: '面档',
    diningHallId: 'c1',
    diningHallName: '第一食堂',
  });
});
const view = () =>
  mount(DishReviewCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
describe('菜品附属点评', () => {
  it('直接读取菜品详情，固定目标，不显示任何三级选择控件', async () => {
    const wrapper = view();
    await flushPromises();
    expect(api.fetchDish).toHaveBeenCalledWith('d1', {
      signal: expect.any(AbortSignal),
    });
    expect(wrapper.text()).toContain('牛肉面');
    expect(wrapper.text()).toContain('第一食堂 · 面档');
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.findAllComponents(RouterLinkStub)[0].props('to')).toEqual({
      name: 'dishDetail',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
  });
  it.each([
    { diningHallId: 'other', stallId: 's1' },
    { diningHallId: 'c1', stallId: 'other' },
  ])('拒绝不匹配的父级 %j', async (parents) => {
    api.fetchDish.mockResolvedValue({ id: 'd1', name: '不应显示', ...parents });
    const wrapper = view();
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('不匹配');
    expect(wrapper.text()).not.toContain('不应显示');
    expect(api.createReview).not.toHaveBeenCalled();
  });
  it('菜品加载失败隐藏表单，重试成功后可填写', async () => {
    api.fetchDish.mockRejectedValueOnce(new Error('菜品不存在或已停用'));
    const wrapper = view();
    await flushPromises();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('已停用');
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('重试'))
      .trigger('click');
    await flushPromises();
    expect(wrapper.find('textarea').exists()).toBe(true);
  });
  it('加载中不允许提交；提交后使用当前菜品并返回其详情', async () => {
    let resolve;
    api.fetchDish.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const wrapper = view();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(api.createReview).not.toHaveBeenCalled();
    resolve({ id: 'd1', name: '面', stallId: 's1', diningHallId: 'c1' });
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
  it('评分或正文缺失不能提交，服务端失败保留草稿', async () => {
    const wrapper = view();
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(api.createReview).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('1–5');
    await wrapper.get('[aria-label="4 星"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.text()).toContain('文字点评');
    expect(api.createReview).not.toHaveBeenCalled();
    await wrapper.get('textarea').setValue('保留草稿');
    api.createReview.mockRejectedValueOnce(new Error('已有待审核点评'));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('保留草稿');
    expect(wrapper.text()).toContain('已有待审核');
  });
  it('提交期间禁用填写且阻止重复写入', async () => {
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
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    resolve();
    await flushPromises();
  });
  it('提交期间离开，迟到成功不会把用户拉回菜品页', async () => {
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
    wrapper.unmount();
    resolve();
    await flushPromises();
    expect(api.push).not.toHaveBeenCalled();
    expect(api.success).not.toHaveBeenCalled();
  });
});
