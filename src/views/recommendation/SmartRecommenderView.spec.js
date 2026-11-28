import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import SmartRecommenderView from './SmartRecommenderView.vue';
import { fetchCanteens } from '@/api/canteen.api.js';
import {
  fetchDishTags,
  querySmartDishRecommendations,
} from '@/api/smartRecommend.api.js';
import { fetchSearchCapabilities } from '@/api/search.api.js';
import { DEFAULT_DISH_TAGS } from '@/utils/dishTags.js';

vi.mock('@/api/canteen.api.js', () => ({ fetchCanteens: vi.fn() }));
vi.mock('@/api/smartRecommend.api.js', () => ({
  fetchDishTags: vi.fn(),
  querySmartDishRecommendations: vi.fn(),
}));
vi.mock('@/api/search.api.js', () => ({
  fetchSearchCapabilities: vi.fn(),
}));

const sampleDish = {
  id: 'dish-1',
  name: '清蒸鸡胸肉饭',
  price: 14.5,
  priceUnit: 'serving',
  imageUrl: '/uploads/chicken.webp',
  stallId: 'stall-1',
  stallName: '轻食档口',
  diningHallId: 'hall-1',
  diningHallName: '留园',
  averageScore: 4.7,
  reviewCount: 16,
  distanceMeters: null,
  tags: ['rice', 'poultry', 'steamed', 'healthy'],
  matchedTags: ['rice', 'healthy'],
  missedRequirements: [],
  reasons: ['¥14.5/份 · 符合预算', '命中：米饭/盖饭 · 健康清淡'],
  matchScore: 0.92,
};

let wrapper;
let router;

async function renderPage() {
  setActivePinia(createPinia());
  const stub = { template: '<div />' };
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub },
      {
        path: '/recommend',
        name: 'smartRecommend',
        component: SmartRecommenderView,
      },
      { path: '/canteens/search', name: 'dishSearch', component: stub },
      {
        path: '/canteens/:canteenId/stalls/:stallId/dishes/:dishId',
        name: 'dishDetail',
        component: stub,
      },
    ],
  });
  await router.push({ name: 'smartRecommend' });
  wrapper = mount(SmartRecommenderView, {
    global: { plugins: [router] },
  });
  await flushPromises();
}

async function clickButton(text) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === text);
  expect(btn, `button "${text}" should exist`).toBeTruthy();
  await btn.trigger('click');
  await flushPromises();
}

describe('SmartRecommenderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    fetchCanteens.mockResolvedValue([
      { id: 'hall-1', name: '留园' },
      { id: 'hall-2', name: '明湖' },
    ]);
    fetchDishTags.mockResolvedValue([...DEFAULT_DISH_TAGS]);
    fetchSearchCapabilities.mockResolvedValue({ distanceHallIds: [] });
    querySmartDishRecommendations.mockResolvedValue({
      exactMode: true,
      exactTotal: 1,
      returnedCount: 1,
      relaxedHints: [],
      picked: sampleDish,
      items: [sampleDish],
    });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('按单份预算、多维标签与忌口查询推荐，且想吃与忌口自动互斥', async () => {
    await renderPage();
    expect(querySmartDishRecommendations).toHaveBeenCalledTimes(1);

    await clickButton('¥15 以内');
    await wrapper.get('.smart-rec__toggle input').setValue(true);
    await clickButton('留园');
    await clickButton('米饭/盖饭');
    await clickButton('香辣/麻辣');
    // 将同一标签加入忌口后，应自动从想吃移除
    await clickButton('✕ 香辣/麻辣');
    await clickButton('精准推荐');

    const lastPayload = querySmartDishRecommendations.mock.calls.at(-1)[0];
    expect(lastPayload).toMatchObject({
      diningHallIds: ['hall-1'],
      maxPrice: 15,
      portionOnly: true,
      includeTags: ['rice'],
      excludeTags: ['spicy'],
    });
    expect(wrapper.text()).toContain('清蒸鸡胸肉饭');
    expect(wrapper.text()).toContain('命中：米饭/盖饭 · 健康清淡');
    expect(wrapper.get('.smart-rec__spotlight a').attributes('href')).toContain(
      '/dishes/dish-1',
    );
  });

  it('点击帮我抽一道 / 换一道时递增 seed 并排除已抽中菜品', async () => {
    await renderPage();
    await clickButton('换一道');
    const rollPayload = querySmartDishRecommendations.mock.calls.at(-1)[0];
    expect(rollPayload.seed).toBeGreaterThan(0);
    expect(rollPayload.excludeDishIds).toContain('dish-1');
  });

  it('近似放宽模式展示原因横幅与缺失项，并支持一键放宽重搜', async () => {
    querySmartDishRecommendations.mockResolvedValueOnce({
      exactMode: false,
      exactTotal: 0,
      returnedCount: 1,
      relaxedHints: ['预算上限适当放宽了约 30%', '仍严格遵守你的忌口排除条件'],
      picked: {
        ...sampleDish,
        price: 18,
        missedRequirements: ['超出预算 ¥3'],
      },
      items: [
        {
          ...sampleDish,
          price: 18,
          missedRequirements: ['超出预算 ¥3'],
        },
      ],
    });
    await renderPage();
    expect(wrapper.text()).toContain('当前严格组合暂无完全匹配');
    expect(wrapper.text()).toContain('超出预算 ¥3');

    await clickButton('一键放宽筛选');
    const nextPayload = querySmartDishRecommendations.mock.calls.at(-1)[0];
    expect(nextPayload.portionOnly).toBe(false);
  });
});
