import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
const fetchDishImages = vi.hoisted(() => vi.fn());
const fetchDish = vi.hoisted(() => vi.fn());
vi.mock('@/api/dish.api.js', () => ({ fetchDishImages, fetchDish }));
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
  }),
  RouterLink: RouterLinkStub,
}));
import DishGalleryView from './DishGalleryView.vue';
beforeEach(() => {
  fetchDishImages.mockReset();
  fetchDish.mockReset();
  fetchDish.mockResolvedValue({ id: 'd1', diningHallId: 'c1', stallId: 's1' });
});
it('图册只展示分页接口批准的图片，翻页不沿用上页选中索引', async () => {
  const first = '/api/v1/media/00000000-0000-4000-8000-000000000001';
  const second = '/api/v1/media/00000000-0000-4000-8000-000000000002';
  fetchDishImages
    .mockResolvedValueOnce({
      items: [
        { id: '1', imageUrl: first },
        { id: '2', imageUrl: second },
      ],
      total: 21,
      page: 1,
      size: 20,
    })
    .mockResolvedValueOnce({
      items: [{ id: '3', imageUrl: first }],
      total: 21,
      page: 2,
      size: 20,
    });
  const wrapper = mount(DishGalleryView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  await wrapper.findAll('.dish-gallery__thumb')[1].trigger('click');
  expect(
    wrapper
      .get('.dish-gallery__stage')
      .findComponent({ name: 'MediaImage' })
      .props('src'),
  ).toBe(second);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '下一页')
    .trigger('click');
  await flushPromises();
  expect(
    wrapper
      .get('.dish-gallery__stage')
      .findComponent({ name: 'MediaImage' })
      .props('src'),
  ).toBe(first);
  expect(fetchDishImages.mock.calls.at(-1).slice(0, 2)).toEqual(['d1', 2]);
});
it('没有approved图片时展示空态', async () => {
  fetchDishImages.mockResolvedValue({ items: [], total: 0, page: 1, size: 20 });
  const wrapper = mount(DishGalleryView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  expect(wrapper.text()).toContain('还没有图片');
});
