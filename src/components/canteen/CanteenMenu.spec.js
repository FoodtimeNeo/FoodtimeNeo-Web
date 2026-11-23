import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import CanteenMenu from './CanteenMenu.vue';
import { fetchStallDishes } from '@/api/canteen.api.js';
vi.mock('@/api/canteen.api.js', () => ({ fetchStallDishes: vi.fn() }));
const stalls = [
  { id: 'a', name: '面档' },
  { id: 'b', name: '粥档' },
];
let wrapper;
function render(items = stalls) {
  wrapper = mount(CanteenMenu, {
    props: { canteenId: 'hall', stalls: items, ownerId: 'test-owner' },
    global: { stubs: { RouterLink: RouterLinkStub, MediaImage: true } },
  });
  return wrapper;
}
beforeEach(() => {
  fetchStallDishes.mockReset().mockResolvedValue([]);
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  wrapper?.unmount();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it('同页分组展示，菜品链接与单位准确，失败档口可单独重试', async () => {
  fetchStallDishes.mockImplementation(async (id) => {
    if (id === 'b') throw new Error('暂时断线');
    return [
      {
        id: 'dish',
        stallId: 'a',
        name: '牛肉面',
        price: 15,
        priceUnit: 'bowl',
        coverImageUrl: 'https://example.test/ok.jpg',
        averageScore: 4.5,
      },
    ];
  });
  render();
  await flushPromises();
  expect(wrapper.text()).toContain('牛肉面');
  expect(wrapper.text()).toContain('¥15.00/碗');
  expect(wrapper.findComponent(RouterLinkStub).props('to')).toMatchObject({
    name: 'stallDetail',
    params: { stallId: 'a' },
  });
  const dishLink = wrapper
    .findAllComponents(RouterLinkStub)
    .find((link) => link.props('to').name === 'dishDetail');
  expect(dishLink.props('to').params).toEqual({
    canteenId: 'hall',
    stallId: 'a',
    dishId: 'dish',
  });
  fetchStallDishes.mockResolvedValue([]);
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '重试')
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).not.toContain('暂时断线');
  expect(wrapper.text()).toContain('暂无菜品');
});
it('点击档口平滑定位，滚动时左栏同步，返回恢复本账号位置', async () => {
  render();
  await flushPromises();
  const sections = wrapper.findAll('section');
  Object.defineProperty(sections[0].element, 'offsetTop', { value: 0 });
  Object.defineProperty(sections[1].element, 'offsetTop', { value: 400 });
  await wrapper.findAll('nav button')[1].trigger('click');
  expect(
    wrapper.get('.canteen-menu__dishes').element.scrollTo,
  ).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
  const viewport = wrapper.get('.canteen-menu__dishes');
  viewport.element.scrollTop = 410;
  await viewport.trigger('scroll');
  expect(wrapper.findAll('nav button')[1].attributes('aria-current')).toBe(
    'true',
  );
  wrapper.unmount();
  render();
  await flushPromises();
  expect(wrapper.get('.canteen-menu__dishes').element.scrollTop).toBe(410);
});
it('最多并发三次，卸载取消未完成请求，不继续排队或写入新页面', async () => {
  const pending = [];
  fetchStallDishes.mockImplementation(
    (_id, options) =>
      new Promise((resolve) =>
        pending.push({ resolve, signal: options.signal }),
      ),
  );
  render(
    Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `档口${i}` })),
  );
  expect(fetchStallDishes).toHaveBeenCalledTimes(3);
  wrapper.unmount();
  expect(pending.every((item) => item.signal.aborted)).toBe(true);
  for (const item of pending) item.resolve([]);
  await flushPromises();
  expect(fetchStallDishes).toHaveBeenCalledTimes(3);
});
