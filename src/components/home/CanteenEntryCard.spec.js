import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import CanteenEntryCard from './CanteenEntryCard.vue';

const canteen = {
  id: 'c1',
  name: '西区食堂',
  summary: '两层楼，面食最稳',
  imageUrl: '/img/c1.jpg',
};

function mountCard() {
  return mount(CanteenEntryCard, {
    props: { canteen },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('CanteenEntryCard', () => {
  it('展示名称、概要与封面 alt', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('西区食堂');
    expect(wrapper.text()).toContain('面食最稳');
    expect(wrapper.find('img').attributes('alt')).toBe('西区食堂');
  });

  it('链接指向对应食堂详情', () => {
    const wrapper = mountCard();
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'canteenDetail',
      params: { canteenId: 'c1' },
    });
  });
});
