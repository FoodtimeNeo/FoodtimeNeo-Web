import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import DailyRecommendList from './DailyRecommendList.vue';

const items = [
  {
    id: 'd1',
    dishId: 'd1',
    canteenId: 'c1',
    name: '红烧牛肉面',
    canteenName: '西区食堂',
    stall: '面档',
    price: 15,
    rating: 4.7,
    imageUrl: '/img/d1.jpg',
  },
];

function mountList(props = {}) {
  return mount(DailyRecommendList, {
    props: { items, ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DailyRecommendList', () => {
  it('展示菜名、来源、价格与评分', () => {
    const wrapper = mountList();
    const text = wrapper.text();
    expect(text).toContain('红烧牛肉面');
    expect(text).toContain('西区食堂');
    expect(text).toContain('面档');
    expect(text).toContain('¥15');
    expect(text).toContain('4.7');
  });

  it('卡片链接指向菜品详情', () => {
    const wrapper = mountList();
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'dishDetail',
      params: { canteenId: 'c1', dishId: 'd1' },
    });
  });

  it('价格缺失或非正数时不渲染价格段', () => {
    const wrapper = mountList({
      items: [{ ...items[0], price: 0 }],
    });
    expect(wrapper.text()).not.toContain('¥');
  });
});
