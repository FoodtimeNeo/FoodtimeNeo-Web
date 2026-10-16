import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
const api = vi.hoisted(() => ({
  fetchStalls: vi.fn(),
  fetchStallDishes: vi.fn(),
}));
vi.mock('@/api/canteen.api.js', () => api);
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { canteenId: 'c1', stallId: 's1' } }),
  RouterLink: RouterLinkStub,
}));
import StallDetailView from './StallDetailView.vue';
beforeEach(() => {
  setActivePinia(createPinia());
  api.fetchStalls.mockReset();
  api.fetchStallDishes.mockReset();
  api.fetchStallDishes.mockResolvedValue([]);
});
describe('真实档口层级', () => {
  it('菜单使用暂定评分，同分保持原顺序，搜索与清除后评分仍可见', async () => {
    api.fetchStalls.mockResolvedValue([{ id: 's1', name: '面档' }]);
    const dishes = [
      { id: 'd2', stallId: 's1', name: '五花肉石锅拌饭', price: 15.6 },
      { id: 'd1', stallId: 's1', name: '韩式辣鸡饭', price: 14 },
    ];
    api.fetchStallDishes.mockResolvedValue(dishes);
    const wrapper = mount(StallDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(
      wrapper.findAll('.dish-price__name').map((item) => item.text()),
    ).toEqual(dishes.map((dish) => dish.name));
    expect(wrapper.findAll('[aria-label="评分 4.8 分"]')).toHaveLength(2);
    expect(dishes[0]).not.toHaveProperty('menuRating');
    await wrapper.get('input').setValue('韩式');
    expect(wrapper.findAll('.dish-price')).toHaveLength(1);
    expect(wrapper.get('[aria-label="评分 4.8 分"]').text()).toContain(
      '4.8 分',
    );
    await wrapper.get('[aria-label="清除搜索关键词"]').trigger('click');
    expect(wrapper.findAll('[aria-label="评分 4.8 分"]')).toHaveLength(2);
  });
  it('单独获取当前档口菜品，零价格可显示', async () => {
    api.fetchStalls.mockResolvedValue([
      { id: 's1', name: '面档', diningHallId: 'c1' },
    ]);
    api.fetchStallDishes.mockResolvedValue([
      { id: 'd1', stallId: 's1', name: '例汤', price: 0 },
    ]);
    const wrapper = mount(StallDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(api.fetchStallDishes.mock.calls[0][0]).toBe('s1');
    expect(wrapper.text()).toContain('¥0.00');
    expect(wrapper.getComponent(RouterLinkStub).props('to').name).toBe(
      'canteenDetail',
    );
    await wrapper.get('input').setValue('不存在');
    expect(wrapper.text()).toContain('没有匹配的菜品');
  });
  it('URL中的档口不属于该食堂时不请求其菜品', async () => {
    api.fetchStalls.mockResolvedValue([{ id: 's2', name: '其他档口' }]);
    const wrapper = mount(StallDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('档口不存在');
    expect(api.fetchStallDishes).not.toHaveBeenCalled();
  });
  it('空菜品与加载失败分别显示', async () => {
    api.fetchStalls.mockResolvedValue([{ id: 's1', name: '面档' }]);
    const wrapper = mount(StallDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('这个档口还没有菜品');
  });
  it('返回同一菜单保留搜索，其他档口不共用关键词，清除后恢复全部菜品', async () => {
    api.fetchStalls.mockResolvedValue([{ id: 's1', name: '面档' }]);
    api.fetchStallDishes.mockResolvedValue([
      { id: 'd1', name: '排骨小锅', price: 0 },
      { id: 'd2', name: '炒鸡饭', price: 14.9 },
    ]);
    const options = { global: { stubs: { RouterLink: RouterLinkStub } } };
    const first = mount(StallDetailView, options);
    await flushPromises();
    await first.get('input').setValue('排骨');
    expect(first.text()).toContain('找到 1 / 2 道菜品');
    expect(first.text()).not.toContain('炒鸡饭');
    first.unmount();
    const returned = mount(StallDetailView, options);
    await flushPromises();
    expect(returned.get('input').element.value).toBe('排骨');
    await returned.get('[aria-label="清除搜索关键词"]').trigger('click');
    expect(returned.text()).toContain('炒鸡饭');
    expect(api.fetchStallDishes).toHaveBeenCalledTimes(2);
  });
});
