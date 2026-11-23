import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import DishSearchView from './DishSearchView.vue';
import { searchDishes } from '@/api/dish.api.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { createPinia } from 'pinia';

vi.mock('@/api/dish.api.js', () => ({ searchDishes: vi.fn() }));
vi.mock('@/api/canteen.api.js', () => ({ fetchCanteens: vi.fn() }));

const stub = { template: '<div />' };
const dish = {
  id: 'dish',
  name: '鸡腿饭',
  price: 12.3,
  stallId: 'stall',
  stallName: '二号档口',
  diningHallId: 'hall',
  diningHallName: '学苑',
  averageScore: 4.5,
  reviewCount: 8,
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
  wrapper = mount(DishSearchView, {
    global: { plugins: [router, createPinia()] },
  });
  await flushPromises();
}

async function submit() {
  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  searchDishes.mockReset();
  searchDishes.mockImplementation(async (_q, page) => ({
    items: [dish],
    page,
    size: 20,
    total: 21,
  }));
  fetchCanteens.mockReset();
  fetchCanteens.mockResolvedValue([{ id: 'hall', name: '学苑' }]);
});
afterEach(() => wrapper?.unmount());

it('无关键词也可浏览全部，提交关键词后从第一页搜索并显示评分与价格', async () => {
  await render();
  expect(searchDishes).toHaveBeenCalledTimes(1);
  expect(searchDishes.mock.calls[0][0]).toBe('');
  expect(searchDishes.mock.calls[0][1]).toBe(1);
  const link = wrapper.get('li a');
  expect(link.text()).toContain('学苑 · 二号档口');
  expect(link.text()).toContain('4.5 分 · 8 条');
  expect(link.text()).toContain('12.30');
  await wrapper.get('button[aria-label="第 2 页"]').trigger('click');
  await flushPromises();
  expect(searchDishes.mock.calls.at(-1).slice(0, 2)).toEqual(['', 2]);
  await wrapper.get('#dish-keyword').setValue('豆腐');
  await submit();
  expect(searchDishes.mock.calls.at(-1)[0]).toBe('豆腐');
  expect(searchDishes.mock.calls.at(-1)[1]).toBe(1);
  expect(router.currentRoute.value.query.q).toBe('豆腐');
});

it('食堂、价格、评分与排序进入 URL 并传给接口', async () => {
  await render();
  const numbers = wrapper.findAll('input[type="number"]');
  await numbers[0].setValue('10');
  await numbers[1].setValue('30');
  const selects = wrapper.findAll('select');
  await wrapper.get('input[type="checkbox"]').setValue(true);
  await selects[0].setValue('4.0');
  await selects[1].setValue('price_desc');
  await submit();
  expect(searchDishes.mock.calls.at(-1)[3]).toMatchObject({
    q: '',
    diningHallIds: ['hall'],
    minPrice: '10',
    maxPrice: '30',
    minRating: '4.0',
    sort: 'price_desc',
  });
  expect(router.currentRoute.value.query).toMatchObject({
    halls: ['hall'],
    minPrice: '10',
    maxPrice: '30',
    minRating: '4.0',
    sort: 'price_desc',
  });
});

it('价格区间非法时不发请求并显示错误', async () => {
  await render();
  await wrapper.findAll('input[type="number"]')[0].setValue('30');
  await wrapper.findAll('input[type="number"]')[1].setValue('10');
  const before = searchDishes.mock.calls.length;
  await submit();
  expect(searchDishes.mock.calls.length).toBe(before);
  expect(wrapper.text()).toContain('最低价格不能高于最高价格');
});

it('点击数字直接跨页，保留已提交的关键词和筛选', async () => {
  searchDishes.mockImplementation(async (_q, page) => ({
    items: [dish],
    page,
    size: 20,
    total: 400,
  }));
  await render({
    q: '豆腐',
    halls: ['hall'],
    minPrice: '10',
    sort: 'price_asc',
  });
  for (const page of [3, 5, 3, 1]) {
    await wrapper.get(`button[aria-label="第 ${page} 页"]`).trigger('click');
    await flushPromises();
    expect(searchDishes.mock.calls.at(-1)[1]).toBe(page);
    expect(searchDishes.mock.calls.at(-1)[3]).toMatchObject({
      q: '豆腐',
      diningHallIds: ['hall'],
      minPrice: '10',
      sort: 'price_asc',
    });
  }
});

it('远页进入、刷新与再次挂载沿用 URL 页码，筛选提交回第一页', async () => {
  searchDishes.mockImplementation(async (_q, page) => ({
    items: [dish],
    page,
    size: 20,
    total: 400,
  }));
  await render({ q: '饭', page: '5' });
  expect(searchDishes.mock.calls.at(-1)[1]).toBe(5);
  expect(wrapper.get('button[aria-current="page"]').text()).toBe('5');
  await wrapper.get('button[aria-label="第 3 页"]').trigger('click');
  await flushPromises();
  expect(router.currentRoute.value.query.page).toBe('3');
  wrapper.unmount();
  wrapper = mount(DishSearchView, {
    global: { plugins: [router, createPinia()] },
  });
  await flushPromises();
  expect(searchDishes.mock.calls.at(-1)[1]).toBe(3);
  await wrapper.get('#dish-keyword').setValue('面');
  await submit();
  expect(searchDishes.mock.calls.at(-1).slice(0, 2)).toEqual(['面', 1]);
  expect(router.currentRoute.value.query.page).toBeUndefined();
});
it('翻页失败保留原成功页，重试再提交显示页码', async () => {
  searchDishes.mockImplementation(async (_q, page) => ({
    items: [dish],
    page,
    size: 20,
    total: 400,
  }));
  await render();
  searchDishes.mockRejectedValueOnce(new Error('暂时离线'));
  await wrapper.get('button[aria-label="第 3 页"]').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('暂时离线');
  expect(wrapper.text()).toContain('鸡腿饭');
  expect(wrapper.get('button[aria-current="page"]').text()).toBe('1');
  await wrapper
    .findAll('button')
    .find((b) => b.text().includes('重试'))
    .trigger('click');
  await flushPromises();
  expect(searchDishes.mock.calls.at(-1)[1]).toBe(3);
  expect(wrapper.get('button[aria-current="page"]').text()).toBe('3');
});
it('数据缩减时回退有效页，无效页参数不直接传给服务器', async () => {
  await render({ page: '999' });
  expect(router.currentRoute.value.query.page).toBe('2');
  await router.replace({ name: 'dishSearch', query: { page: '-5' } });
  await flushPromises();
  expect(searchDishes.mock.calls.at(-1)[1]).toBe(1);
});
