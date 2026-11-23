import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SearchDiscovery from './SearchDiscovery.vue';
import { fetchDailyRecommendations } from '@/api/recommendation.api.js';
vi.mock('@/api/recommendation.api.js', () => ({
  fetchDailyRecommendations: vi.fn(),
}));
let wrapper;
const card = {
  id: 's1',
  name: '现做面食',
  canteenName: '明湖食堂',
  intro: '口碑档口',
  coverImageUrl: '/media/a.webp',
  route: { name: 'stallDetail', params: { canteenId: 'h1', stallId: 's1' } },
};
function render() {
  wrapper = mount(SearchDiscovery, {
    props: { ownerId: 'one' },
    global: {
      stubs: {
        RouterLink: {
          name: 'RouterLink',
          props: ['to'],
          template: '<a><slot /></a>',
        },
        MediaImage: { props: ['src'], template: '<div class="media-image" />' },
      },
    },
  });
}
beforeEach(() =>
  fetchDailyRecommendations.mockReset().mockResolvedValue([card]),
);
afterEach(() => wrapper?.unmount());
it('daily stalls provide discovery chips and image cards that open the same stall', async () => {
  render();
  await flushPromises();
  expect(wrapper.text()).toContain('发现');
  expect(wrapper.text()).toContain('猜你想搜');
  const links = wrapper.findAllComponents({ name: 'RouterLink' });
  expect(links).toHaveLength(2);
  expect(links.every((link) => link.props('to')?.name === 'stallDetail')).toBe(
    true,
  );
  expect(wrapper.find('.search-discovery__card').text()).toContain('明湖食堂');
  expect(wrapper.text()).not.toContain('¥');
});
it('old account response cannot replace the new account recommendations', async () => {
  let resolve;
  fetchDailyRecommendations
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce([{ ...card, id: 's2', name: '新账号档口' }]);
  render();
  await wrapper.setProps({ ownerId: 'two' });
  await flushPromises();
  resolve([card]);
  await flushPromises();
  expect(wrapper.text()).toContain('新账号档口');
  expect(wrapper.text()).not.toContain('现做面食');
});
it('recommendation failure keeps a retry instead of making up items', async () => {
  fetchDailyRecommendations.mockRejectedValueOnce(
    new Error('暂时无法读取推荐'),
  );
  render();
  await flushPromises();
  expect(wrapper.text()).toContain('暂时无法读取推荐');
  expect(wrapper.find('.search-discovery__card').exists()).toBe(false);
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('现做面食');
});
