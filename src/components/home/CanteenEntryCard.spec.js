import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import CanteenEntryCard from './CanteenEntryCard.vue';

const canteen = {
  id: 'c1',
  name: '西区食堂',
  summary: '两层楼，面食最稳',
  coverImageUrl: '/api/v1/media/00000000-0000-4000-8000-000000000001',
};

function mountCard() {
  return mount(CanteenEntryCard, {
    props: { canteen },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('CanteenEntryCard', () => {
  it('只展示名称与封面，不展示概要', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('西区食堂');
    expect(wrapper.text()).not.toContain('面食最稳');
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
