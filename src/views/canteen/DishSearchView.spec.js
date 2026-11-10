import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import DishSearchView from './DishSearchView.vue';
import { searchDishes } from '@/api/dish.api.js';

vi.mock('@/api/dish.api.js', () => ({ searchDishes: vi.fn() }));

const stub = { template: '<div />' };
const dish = {
  id: 'dish',
  name: '鸡腿饭',
  price: 12.3,
  stallId: 'stall',
  stallName: '二号档口',
  diningHallId: 'hall',
  diningHallName: '学苑',
};
let wrapper;
let router;

async function render(query = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/canteens', name: 'canteenList', component: stub },
      {
        path: '/canteens/search',
        name: 'dishSearch',
        component: DishSearchView,
      },
      {
        path: '/canteens/:canteenId/:stallId/:dishId',
        name: 'dishDetail',
        component: stub,
      },
    ],
  });
  await router.push({ name: 'dishSearch', query });
  wrapper = mount(DishSearchView, { global: { plugins: [router] } });
  await flushPromises();
}

async function submit(query) {
  await wrapper.get('input').setValue(query);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  searchDishes.mockReset();
  searchDishes.mockImplementation(async (_query, page) => ({
    items: [dish],
    page,
    size: 20,
    total: 21,
  }));
});
afterEach(() => wrapper?.unmount());

it('只在提交时搜索，显示价格和位置，并链接到菜品详情', async () => {
  await render();
  await wrapper.get('input').setValue('鸡腿');
  expect(searchDishes).not.toHaveBeenCalled();
  await submit(' 鸡腿 ');
  expect(searchDishes).toHaveBeenCalledTimes(1);
  expect(searchDishes).toHaveBeenCalledWith('鸡腿', 1, {
    signal: expect.any(AbortSignal),
  });
  const link = wrapper.get('li a');
  expect(link.text()).toContain('学苑 · 二号档口');
  expect(link.text()).toContain('12.30');
  expect(link.attributes('href')).toBe('/canteens/hall/stall/dish');
  await wrapper.findAll('.pagination button')[1].trigger('click');
  await flushPromises();
  expect(searchDishes.mock.calls.at(-1).slice(0, 2)).toEqual(['鸡腿', 2]);
  await submit('豆腐');
  expect(searchDishes.mock.calls.at(-1).slice(0, 2)).toEqual(['豆腐', 1]);
});

it('丢弃清空关键词后迟到的结果', async () => {
  let resolve;
  searchDishes.mockReturnValue(new Promise((callback) => (resolve = callback)));
  await render({ q: '鸡腿' });
  const { signal } = searchDishes.mock.calls[0][2];
  await submit('');
  resolve({ items: [dish], page: 1, size: 20, total: 1 });
  await flushPromises();
  expect(signal.aborted).toBe(true);
  expect(wrapper.find('li').exists()).toBe(false);
  expect(searchDishes).toHaveBeenCalledTimes(1);
});
