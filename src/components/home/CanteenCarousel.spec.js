import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
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

  it.each([undefined, null, 0, NaN])(
    '食堂没有有效评分（%s）时显示无评分，不生成分数或口碑标签',
    (rating) => {
      const wrapper = mount(CanteenCarousel, {
        props: { canteens: [{ id: 'empty', name: '空白食堂', rating }] },
      });

      expect(wrapper.get('.zine-rating-stamp').text()).toBe('无评分');
      expect(wrapper.text()).not.toContain('4.5');
      expect(wrapper.text()).not.toContain('超高口碑');
      expect(wrapper.text()).not.toContain('大众推荐');
      wrapper.unmount();
    },
  );

  it('真实评分保留一位小数和口碑标签', () => {
    const wrapper = mount(CanteenCarousel, {
      props: { canteens: [{ id: 'rated', name: '有评分食堂', rating: 4.86 }] },
    });

    expect(wrapper.get('.zine-rating-stamp').text()).toBe('4.9');
    expect(wrapper.text()).toContain('超高口碑');
    wrapper.unmount();
  });

  it('鼠标滚轮在组件范围内上下滑动时，转换为组件左右滑动并阻止页面垂直滚动', async () => {
    const wrapper = mount(CanteenCarousel, {
      props: { canteens: mockCanteens },
      attachTo: document.body,
    });

    const track = wrapper.find('.canteen-carousel__track').element;
    Object.defineProperty(track, 'scrollWidth', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(track, 'clientWidth', {
      value: 800,
      configurable: true,
    });
    track.scrollLeft = 0;

    // 模拟向下滚动（deltaY > 0）
    const wheelDownEvent = new WheelEvent('wheel', {
      deltaY: 120,
      deltaX: 0,
      cancelable: true,
      bubbles: true,
    });
    wrapper.element.dispatchEvent(wheelDownEvent);

    expect(wheelDownEvent.defaultPrevented).toBe(true);
    await nextTick();
    expect(wrapper.find('.canteen-carousel__track').classes()).toContain(
      'is-wheeling',
    );

    // 等待动画帧执行更新位移
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(track.scrollLeft).toBeGreaterThan(0);

    // 容器不可滚动时（scrollWidth <= clientWidth）不拦截默认行为
    Object.defineProperty(track, 'scrollWidth', {
      value: 800,
      configurable: true,
    });
    const wheelNormalEvent = new WheelEvent('wheel', {
      deltaY: 100,
      deltaX: 0,
      cancelable: true,
      bubbles: true,
    });
    wrapper.element.dispatchEvent(wheelNormalEvent);
    expect(wheelNormalEvent.defaultPrevented).toBe(false);

    wrapper.unmount();
  });

  it('用户按下鼠标指针时应立即终止滚轮惯性动画', async () => {
    const wrapper = mount(CanteenCarousel, {
      props: { canteens: mockCanteens },
      attachTo: document.body,
    });

    const track = wrapper.find('.canteen-carousel__track');
    const trackEl = track.element;
    Object.defineProperty(trackEl, 'scrollWidth', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(trackEl, 'clientWidth', {
      value: 800,
      configurable: true,
    });

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 150,
      cancelable: true,
      bubbles: true,
    });
    wrapper.element.dispatchEvent(wheelEvent);
    await nextTick();
    expect(track.classes()).toContain('is-wheeling');

    // 用户按下指针进行抓取
    await track.trigger('pointerdown', { button: 0 });
    await nextTick();
    expect(track.classes()).not.toContain('is-wheeling');

    wrapper.unmount();
  });
});
