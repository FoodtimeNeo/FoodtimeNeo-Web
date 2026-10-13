import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';

const fetchStalls = vi.fn();
vi.mock('@/api/canteen.api.js', () => ({
  fetchStalls: (...args) => fetchStalls(...args),
}));

let routeParams = { canteenId: 'c1', stallId: 's1' };
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
  RouterLink: RouterLinkStub,
}));

import StallDetailView from './StallDetailView.vue';

function mountView() {
  return mount(StallDetailView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('StallDetailView', () => {
  beforeEach(() => {
    fetchStalls.mockReset();
    routeParams = { canteenId: 'c1', stallId: 's1' };
  });

  it('定位当前档口并展示菜名与价格', async () => {
    fetchStalls.mockResolvedValue([
      {
        id: 's1',
        name: '面档',
        dishes: [{ id: 'd1', name: '牛肉面', price: 15 }],
      },
      { id: 's2', name: '饭档', dishes: [] },
    ]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('面档');
    expect(wrapper.text()).toContain('牛肉面');
    expect(wrapper.text()).toContain('¥15');
  });

  it('档口不存在时显示错误态', async () => {
    routeParams = { canteenId: 'c1', stallId: 'missing' };
    fetchStalls.mockResolvedValue([{ id: 's1', name: '面档', dishes: [] }]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('档口不存在');
  });

  it('档口无菜品时显示空态', async () => {
    fetchStalls.mockResolvedValue([{ id: 's1', name: '面档', dishes: [] }]);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('这个档口还没有菜品');
  });
});
