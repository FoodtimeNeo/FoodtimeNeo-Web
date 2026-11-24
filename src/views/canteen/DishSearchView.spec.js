import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia } from 'pinia';
import DishSearchView from './DishSearchView.vue';
import CommunityPostDetailModal from '@/components/community/CommunityPostDetailModal.vue';
import {
  searchStalls,
  searchNotes,
  searchStallDishes,
  fetchSearchCapabilities,
} from '@/api/search.api.js';
import { fetchCanteens } from '@/api/canteen.api.js';
vi.mock('@/api/search.api.js', () => ({
  searchStalls: vi.fn(),
  searchNotes: vi.fn(),
  searchStallDishes: vi.fn(),
  fetchSearchCapabilities: vi.fn(),
}));
vi.mock('@/api/canteen.api.js', () => ({ fetchCanteens: vi.fn() }));
vi.mock('@/api/recommendation.api.js', () => ({
  fetchDailyRecommendations: vi.fn().mockResolvedValue([]),
}));
const dish = {
  id: 'dish',
  name: '鸡腿饭',
  price: 12.3,
  priceUnit: 'serving',
  imageUrl: '/uploads/dish.webp',
  averageScore: 4.5,
  reviewCount: 8,
};
const stall = {
  id: 'stall',
  name: '二号档口',
  diningHallId: 'hall',
  diningHallName: '明湖',
  averageScore: 4.5,
  reviewCount: 8,
  matchCount: 8,
  dishes: [dish],
};
let wrapper, router;
async function render(query = {}) {
  const stub = { template: '<div/>' };
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      { path: '/search', name: 'dishSearch', component: DishSearchView },
      {
        path: '/h/:canteenId/s/:stallId',
        name: 'stallDetail',
        component: stub,
      },
      {
        path: '/h/:canteenId/s/:stallId/d/:dishId',
        name: 'dishDetail',
        component: stub,
      },
    ],
  });
  await router.push({ name: 'dishSearch', query });
  wrapper = mount(DishSearchView, {
    global: {
      plugins: [router, createPinia()],
      stubs: {
        ElDialog: {
          props: ['modelValue'],
          template:
            '<section v-if="modelValue" class="dialog-stub"><slot/></section>',
        },
        CommunityPostDetailModal: true,
      },
    },
  });
  await flushPromises();
}
async function click(text) {
  await wrapper
    .findAll('button')
    .find((button) => button.text() === text)
    .trigger('click');
  await flushPromises();
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  searchStalls.mockImplementation(async (query) => ({
    items: [stall],
    total: 11,
    page: query.page,
    size: 10,
  }));
  searchNotes.mockResolvedValue({ items: [], total: 0, page: 1, size: 20 });
  searchStallDishes.mockResolvedValue({
    items: [dish],
    total: 21,
    page: 1,
    size: 20,
  });
  fetchCanteens.mockResolvedValue([
    { id: 'hall', name: '明湖' },
    { id: 'east', name: '东区' },
  ]);
  fetchSearchCapabilities.mockResolvedValue({ distanceHallIds: [] });
});
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});
it('清空即回到发现且迟到响应不重新展示旧结果', async () => {
  await render({ q: '鸡腿' });
  expect(
    wrapper.findAll('.search-stall h3 mark').map((mark) => mark.text()),
  ).toContain('鸡腿');
  await wrapper.get('#dish-keyword').setValue('');
  await flushPromises();
  expect(wrapper.find('.search-discovery').exists()).toBe(true);
  expect(wrapper.find('.search-stall').exists()).toBe(false);
  expect(router.currentRoute.value.query.q).toBeUndefined();
});
it('输入展示真实匹配建议，点选后提交搜索', async () => {
  await render();
  await wrapper.get('#dish-keyword').setValue('鸡');
  await new Promise((resolve) => setTimeout(resolve, 300));
  await flushPromises();
  const panel = wrapper.get('[aria-label="搜索建议"]');
  expect(panel.text()).toContain('鸡腿饭');
  expect(panel.findAll('mark').map((mark) => mark.text())).toContain('鸡');
  await panel
    .findAll('button')
    .find((button) => button.text() === '鸡腿饭')
    .trigger('click');
  await flushPromises();
  expect(router.currentRoute.value.query.q).toBe('鸡腿饭');
  expect(wrapper.find('[aria-label="搜索建议"]').exists()).toBe(false);
});
it('统一入口先展示搜索发现，结果按档口分页并保留真实菜品入口', async () => {
  await render();
  expect(searchStalls).not.toHaveBeenCalled();
  expect(wrapper.find('.search-discovery').exists()).toBe(true);
  await wrapper.get('#dish-keyword').setValue('鸡腿');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(searchStalls.mock.calls[0][0]).toMatchObject({
    q: '鸡腿',
    page: 1,
    size: 10,
    previewSize: 8,
  });
  expect(wrapper.get('.search-stall h2').text()).toBe('二号档口（明湖）');
  expect(wrapper.findAll('.search-stall li')).toHaveLength(1);
  expect(wrapper.get('.search-stall li a').attributes('href')).toContain(
    '/d/dish',
  );
  await wrapper.get('button[aria-label="第 2 页"]').trigger('click');
  await flushPromises();
  expect(searchStalls.mock.calls.at(-1)[0].page).toBe(2);
});
it('筛选在完成时提交，多选食堂与价格评分进入查询，关闭不自动应用', async () => {
  await render({ q: '鸡腿', browse: '1' });
  await wrapper.get('button[aria-label="筛选"]').trigger('click');
  await flushPromises();
  const checks = wrapper.findAll('input[type=checkbox]');
  await checks[0].setValue(true);
  await checks[1].setValue(true);
  await click('价格');
  const amounts = wrapper.findAll('input[type=number]');
  await amounts[0].setValue(10);
  await amounts[1].setValue(20);
  await click('评分');
  await wrapper.findAll('input[type=radio]')[3].setValue(true);
  await click('完成');
  expect(searchStalls.mock.calls.at(-1)[0]).toMatchObject({
    diningHallIds: ['hall', 'east'],
    minPrice: '10',
    maxPrice: '20',
    minRating: '4.0',
  });
});
it('价格错误不提交且保留筛选面板', async () => {
  await render({ browse: '1' });
  await wrapper.get('button[aria-label="筛选"]').trigger('click');
  await flushPromises();
  await click('价格');
  const values = wrapper.findAll('input[type=number]');
  await values[0].setValue(30);
  await values[1].setValue(10);
  const before = searchStalls.mock.calls.length;
  await click('完成');
  expect(searchStalls).toHaveBeenCalledTimes(before);
  expect(wrapper.text()).toContain('最低价格不能高于最高价格');
});
it('切换笔记保留关键词与食堂，笔记类型、排序独立，不继承菜品价格', async () => {
  await render({
    q: '牛肉',
    halls: ['hall'],
    minPrice: '10',
    sort: 'price_asc',
    browse: '1',
  });
  await click('笔记');
  expect(searchNotes.mock.calls.at(-1)[0]).toMatchObject({
    q: '牛肉',
    diningHallIds: ['hall'],
    sort: 'relevance',
    type: 'all',
  });
  expect(searchNotes.mock.calls.at(-1)[0]).not.toHaveProperty('minPrice');
  await wrapper.get('button[aria-label="筛选"]').trigger('click');
  await flushPromises();
  await click('笔记类型');
  await wrapper.findAll('input[type=radio]')[2].setValue(true);
  await click('完成');
  expect(searchNotes.mock.calls.at(-1)[0].type).toBe('repost');
});
it('横滑加载后续匹配菜品，继承筛选且不增加额外查看入口', async () => {
  searchStallDishes.mockResolvedValue({
    items: [{ ...dish, id: 'next-dish', name: '后续菜品' }],
    total: 21,
    page: 2,
    size: 8,
  });
  await render({ q: '鸡腿', minPrice: '10', browse: '1' });
  const strip = wrapper.get('.search-stall ul');
  Object.defineProperties(strip.element, {
    clientWidth: { value: 300 },
    scrollWidth: { value: 800 },
    scrollLeft: { value: 500 },
  });
  await strip.trigger('scroll');
  await flushPromises();
  expect(searchStallDishes.mock.calls[0][0]).toMatchObject({
    q: '鸡腿',
    minPrice: '10',
    stallId: 'stall',
    page: 2,
    size: 8,
  });
  expect(wrapper.get('.search-stall').text()).toContain('后续菜品');
  expect(wrapper.text()).not.toContain('全部 8 道匹配菜品');
  expect(router.currentRoute.value.query.page).toBeUndefined();
});
it('没有可用食堂坐标时距离操作不改变排序，也不伪造定位', async () => {
  await render({ browse: '1' });
  const count = searchStalls.mock.calls.length;
  await click('距离最近');
  expect(wrapper.text()).toContain('食堂位置待补充');
  expect(searchStalls).toHaveBeenCalledTimes(count);
  expect(router.currentRoute.value.query.sort).toBeUndefined();
});
it('旧请求晚返回不会覆盖新关键词的分组结果', async () => {
  let resolve;
  searchStalls.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await render({ q: '旧', browse: '1' });
  await wrapper.get('#dish-keyword').setValue('新');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  resolve({
    items: [{ ...stall, name: '旧结果' }],
    total: 1,
    page: 1,
    size: 10,
  });
  await flushPromises();
  expect(wrapper.text()).not.toContain('旧结果');
  expect(wrapper.text()).toContain('二号档口');
});
it('异常分页显示可重试错误，不当作空结果', async () => {
  searchStalls.mockResolvedValue({ items: [], total: -1, size: 10, page: 1 });
  await render({ browse: '1' });
  expect(wrapper.text()).toContain('搜索分页响应异常');
});

it.each(['deleted', 'postEdited'])(
  '笔记详情 %s 不传 ID 时，也移除结果并更新总数',
  async (event) => {
    const note = {
      id: 'note',
      title: '牛肉笔记',
      status: 'approved',
      images: [],
      author: { id: 'author', name: '同学' },
      likeCount: 0,
    };
    searchNotes.mockResolvedValue({
      items: [{ post: note, diningHallName: '明湖', distanceMeters: null }],
      total: 1,
      size: 20,
      page: 1,
    });
    await render({ tab: 'notes', browse: '1' });
    await wrapper.get('.community-post-card').trigger('click');
    await flushPromises();
    wrapper.getComponent(CommunityPostDetailModal).vm.$emit(event);
    await flushPromises();
    expect(wrapper.find('.community-post-card').exists()).toBe(false);
    expect(wrapper.get('.unified-search__count').text()).toContain('0 篇笔记');
  },
);
