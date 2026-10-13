import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';

const fetchDish = vi.fn();
vi.mock('@/api/dish.api.js', () => ({
  fetchDish: (...a) => fetchDish(...a),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { canteenId: 'c1', dishId: 'd1' } }),
  RouterLink: RouterLinkStub,
}));

import DishGalleryView from './DishGalleryView.vue';

function mountView() {
  return mount(DishGalleryView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DishGalleryView', () => {
  beforeEach(() => {
    fetchDish.mockReset();
  });

  it('合并主图与图册并去重，点击缩略图切换大图', async () => {
    fetchDish.mockResolvedValue({
      id: 'd1',
      name: '红烧牛肉面',
      imageUrl: '/d1.jpg',
      gallery: ['/d1.jpg', '/d2.jpg'],
    });
    const wrapper = mountView();
    await flushPromises();
    const thumbs = wrapper.findAll('.dish-gallery__thumb');
    // 主图 /d1.jpg 与 gallery 的 /d1.jpg 去重后共 2 张
    expect(thumbs).toHaveLength(2);
    const stage = () =>
      wrapper.find('.dish-gallery__stage img').attributes('src');
    expect(stage()).toBe('/d1.jpg');
    await thumbs[1].trigger('click');
    expect(stage()).toBe('/d2.jpg');
  });

  it('无图片时显示空态', async () => {
    fetchDish.mockResolvedValue({
      id: 'd1',
      name: '面',
      imageUrl: '',
      gallery: [],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('还没有图片');
  });
});
