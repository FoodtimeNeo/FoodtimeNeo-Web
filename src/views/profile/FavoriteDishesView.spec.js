import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  fetchFavoriteDishes: vi.fn(),
  fetchFavoriteGroups: vi.fn(),
  fetchFavoriteGroupMemberships: vi.fn(),
  createFavoriteGroup: vi.fn(),
  addFavoriteGroupMember: vi.fn(),
  removeFavoriteGroupMember: vi.fn(),
  updateFavoriteGroup: vi.fn(),
  deleteFavoriteGroup: vi.fn(),
  prompt: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/api/dish.api.js', () => ({
  fetchFavoriteDishes: api.fetchFavoriteDishes,
}));
vi.mock('@/api/favoriteGroups.api.js', () => api);
vi.mock('element-plus', () => ({
  ElMessage: { error: api.error },
  ElMessageBox: { prompt: api.prompt },
}));
import FavoriteDishesView from './FavoriteDishesView.vue';
const mountView = () =>
  mount(FavoriteDishesView, {
    global: {
      stubs: {
        BackLink: true,
        DishLink: { template: '<div><slot /></div>' },
      },
    },
  });
describe('dish favorite default group and creation entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchFavoriteDishes.mockResolvedValue({
      items: [{ id: 'dish', name: '米饭', price: 3 }],
      total: 1,
      size: 20,
    });
    api.fetchFavoriteGroups.mockResolvedValue([]);
    api.fetchFavoriteGroupMemberships.mockResolvedValue({ groupIds: [] });
    api.createFavoriteGroup.mockResolvedValue({ id: 'new' });
  });
  it('offers default and create entries even with zero custom groups', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('直接收藏即可存入默认分组');
    const buttons = wrapper.findAll('.favorite-dishes__groups > button');
    await buttons
      .find((button) => button.text() === '默认分组')
      .trigger('click');
    await flushPromises();
    expect(api.fetchFavoriteDishes).toHaveBeenLastCalledWith(
      1,
      expect.anything(),
      { groupId: null, unfiled: true },
    );
    expect(wrapper.find('.favorite-dishes__create').exists()).toBe(true);
    wrapper.unmount();
  });
  it('creates a real dish group from the visible entry and selects it', async () => {
    api.prompt.mockResolvedValue({ value: '早餐' });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('.favorite-dishes__create').trigger('click');
    await flushPromises();
    expect(api.createFavoriteGroup).toHaveBeenCalledWith('dish', '早餐');
    expect(api.fetchFavoriteDishes).toHaveBeenLastCalledWith(
      1,
      expect.anything(),
      { groupId: 'new', unfiled: false },
    );
    wrapper.unmount();
  });
  it('moving to default removes only group relations and preserves the favorite', async () => {
    api.fetchFavoriteGroupMemberships.mockResolvedValue({
      groupIds: ['a', 'b'],
    });
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('.favorite-dishes__assign').trigger('click');
    await flushPromises();
    await wrapper.get('.favorite-dishes__memberships button').trigger('click');
    await flushPromises();
    expect(api.removeFavoriteGroupMember.mock.calls).toEqual([
      ['a', 'dish'],
      ['b', 'dish'],
    ]);
    expect(api.addFavoriteGroupMember).not.toHaveBeenCalled();
    expect(wrapper.find('li').text()).toContain('米饭');
    wrapper.unmount();
  });
  it('keeps creation visible when loading groups fails', async () => {
    api.fetchFavoriteGroups.mockRejectedValueOnce(new Error('分组读取失败'));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('分组读取失败');
    expect(wrapper.get('.favorite-dishes__create').isVisible()).toBe(true);
    wrapper.unmount();
  });
  it('does not claim default membership when membership loading fails', async () => {
    api.fetchFavoriteGroupMemberships.mockRejectedValueOnce(
      new Error('读取关系失败'),
    );
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('.favorite-dishes__assign').trigger('click');
    await flushPromises();
    expect(wrapper.find('.favorite-dishes__memberships button').exists()).toBe(
      false,
    );
    expect(
      wrapper.get('.favorite-dishes__memberships [role="alert"]').text(),
    ).toBe('读取关系失败');
    wrapper.unmount();
  });
});
