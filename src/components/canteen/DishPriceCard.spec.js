import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import DishPriceCard from './DishPriceCard.vue';

function mountCard(dish) {
  return mount(DishPriceCard, {
    props: { dish, canteenId: 'c1' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DishPriceCard', () => {
  it('展示菜名与价格', () => {
    const wrapper = mountCard({ id: 'd1', name: '红烧牛肉面', price: 15 });
    expect(wrapper.text()).toContain('红烧牛肉面');
    expect(wrapper.text()).toContain('¥15');
  });

  it('价格缺失时显示占位符', () => {
    const wrapper = mountCard({ id: 'd2', name: '例汤', price: 0 });
    expect(wrapper.text()).toContain('—');
  });

  it('链接指向菜品详情', () => {
    const wrapper = mountCard({ id: 'd1', name: '面', price: 10 });
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'dishDetail',
      params: { canteenId: 'c1', dishId: 'd1' },
    });
  });
});
