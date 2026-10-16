import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import DishPriceCard from './DishPriceCard.vue';

function mountCard(dish, props = {}) {
  return mount(DishPriceCard, {
    props: { dish, canteenId: 'c1', ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DishPriceCard', () => {
  it('展示菜名与价格', () => {
    const wrapper = mountCard({ id: 'd1', name: '红烧牛肉面', price: 15 });
    expect(wrapper.text()).toContain('红烧牛肉面');
    expect(wrapper.text()).toContain('¥15');
  });

  it('零价格按真实金额显示', () => {
    const wrapper = mountCard({ id: 'd2', name: '例汤', price: 0 });
    expect(wrapper.text()).toContain('¥0.00');
  });

  it('长菜名保持完整，缺少评分时显示暂无评分', () => {
    const name = '五花肉石锅拌饭配韩式辣酱和时令蔬菜';
    const wrapper = mountCard({ id: 'd3', name, price: 15.6 });
    expect(wrapper.get('.dish-price__name').text()).toBe(name);
    expect(wrapper.get('[aria-label="暂无评分"]').text()).toBe('暂无评分');
    expect(wrapper.text()).not.toContain('4.8');
  });

  it('展示传入的真实评分', () => {
    const wrapper = mountCard(
      { id: 'd4', name: '例汤', price: 0 },
      { rating: 3.5 },
    );
    expect(wrapper.get('[aria-label="评分 3.5 分"]').text()).toContain(
      '3.5 分',
    );
  });

  it('链接指向菜品详情', () => {
    const wrapper = mountCard({
      id: 'd1',
      stallId: 's1',
      name: '面',
      price: 10,
    });
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'dishDetail',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
  });
});
