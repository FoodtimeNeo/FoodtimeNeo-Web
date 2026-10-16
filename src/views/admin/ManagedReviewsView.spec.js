import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchManagedReviews: vi.fn(),
  deleteManagedReview: vi.fn(),
}));
vi.mock('@/api/admin-manage.api.js', () => api);
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }));
import ManagedReviewsView from './ManagedReviewsView.vue';
const row = {
  id: 'r1',
  userId: 'u1',
  dishName: '例汤',
  diningHallName: '食堂',
  stallName: '汤档',
  content: '真实评论',
  rating: 4,
  createdAt: '2026-10-16T08:00:00Z',
};
const mountPage = () =>
  mount(ManagedReviewsView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
beforeEach(() => {
  vi.resetAllMocks();
  api.fetchManagedReviews.mockResolvedValue({
    items: [row],
    total: 1,
    size: 20,
  });
});
it('按用户查询并清除筛选，空结果可恢复全部评论', async () => {
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.text()).toContain('真实评论');
  api.fetchManagedReviews.mockResolvedValue({ items: [], total: 0, size: 20 });
  await wrapper.get('input').setValue(' u1 ');
  await wrapper.get('form.search').trigger('submit');
  await flushPromises();
  expect(api.fetchManagedReviews).toHaveBeenLastCalledWith(
    1,
    'u1',
    expect.any(Object),
  );
  expect(wrapper.text()).toContain('没有找到该用户的评论');
  api.fetchManagedReviews.mockResolvedValue({
    items: [row],
    total: 1,
    size: 20,
  });
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看全部评论')
    .trigger('click');
  await flushPromises();
  expect(api.fetchManagedReviews).toHaveBeenLastCalledWith(
    1,
    '',
    expect.any(Object),
  );
  expect(wrapper.text()).toContain('真实评论');
});
it('删除必须填写原因，失败保留原因和评论，成功重新加载', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '删除违规评论')
    .trigger('click');
  const form = wrapper.get('textarea').element.closest('form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flushPromises();
  expect(api.deleteManagedReview).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('删除须填写处理原因');
  await wrapper.get('textarea').setValue('无关内容');
  api.deleteManagedReview.mockRejectedValueOnce(new Error('暂时无法删除'));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('无关内容');
  expect(wrapper.text()).toContain('暂时无法删除');
  expect(wrapper.text()).toContain('真实评论');
  api.deleteManagedReview.mockResolvedValueOnce(null);
  api.fetchManagedReviews.mockResolvedValue({ items: [], total: 0, size: 20 });
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flushPromises();
  expect(api.deleteManagedReview).toHaveBeenLastCalledWith('r1', '无关内容');
  expect(wrapper.text()).toContain('暂无正式评论');
});
it('分页保留用户条件，修改查询后回到第一页', async () => {
  api.fetchManagedReviews.mockResolvedValue({
    items: [row],
    total: 21,
    size: 20,
  });
  const wrapper = mountPage();
  await flushPromises();
  await wrapper.get('input').setValue('u1');
  await wrapper.get('form.search').trigger('submit');
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '下一页')
    .trigger('click');
  await flushPromises();
  expect(api.fetchManagedReviews).toHaveBeenLastCalledWith(
    2,
    'u1',
    expect.any(Object),
  );
  await wrapper.get('input').setValue('u2');
  await wrapper.get('form.search').trigger('submit');
  await flushPromises();
  expect(api.fetchManagedReviews).toHaveBeenLastCalledWith(
    1,
    'u2',
    expect.any(Object),
  );
});
