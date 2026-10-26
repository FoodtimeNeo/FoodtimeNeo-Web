import { describe, expect, it } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import StallEntryCard from './StallEntryCard.vue';

const stall = {
  id: 's1',
  name: '面档',
  coverImageUrl: '/api/v1/media/00000000-0000-4000-8000-000000000001',
};

function mountCard() {
  return mount(StallEntryCard, {
    props: { stall, canteenId: 'c1' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('StallEntryCard', () => {
  it('展示档口名称与封面 alt', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('面档');
    expect(wrapper.findComponent({ name: 'MediaImage' }).props('alt')).toBe(
      '面档',
    );
  });

  it('链接带上食堂与档口参数', () => {
    const wrapper = mountCard();
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      name: 'stallDetail',
      params: { canteenId: 'c1', stallId: 's1' },
    });
  });
});
