import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CanteenCarousel from './CanteenCarousel.vue';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('CanteenCarousel', () => {
  const mockCanteens = [
    {
      id: 'c1',
      name: '学一餐厅',
      rating: 4.8,
      stallsCount: 12,
      intro: '招牌瓦罐汤与热干面',
    },
    {
      id: 'c2',
      name: '明湖餐厅',
      rating: 4.6,
      stallsCount: 8,
      intro: '经典酸汤粉与自选快餐',
    },
  ];

  it('正确渲染滑动卡片并包含提示语', () => {
    const wrapper = mount(CanteenCarousel, {
      props: { canteens: mockCanteens },
    });

    expect(wrapper.text()).toContain('划划看');
    expect(wrapper.text()).toContain('学一餐厅');
    expect(wrapper.text()).toContain('明湖餐厅');
    expect(wrapper.text()).toContain('4.8');

    // 列表大于1项时复制循环，因此卡片数为 4
    const cards = wrapper.findAll('.canteen-card');
    expect(cards.length).toBe(4);
  });

  it('点击卡片触发 select 事件并导航到食堂详情', async () => {
    mockPush.mockReset();
    const wrapper = mount(CanteenCarousel, {
      props: { canteens: mockCanteens },
    });

    const firstCard = wrapper.find('.canteen-card');
    await firstCard.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')[0]).toEqual(['c1']);
    expect(mockPush).toHaveBeenCalledWith({
      name: 'canteenDetail',
      params: { canteenId: 'c1' },
    });
  });
});
