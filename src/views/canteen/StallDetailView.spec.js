import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
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
  api.fetchStalls.mockReset();
  api.fetchStallDishes.mockReset();
  api.fetchStallDishes.mockResolvedValue([]);
});
describe('真实档口层级', () => {
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
});
