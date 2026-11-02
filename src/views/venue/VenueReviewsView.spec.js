import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { clearVenueDrafts } from '@/utils/venueDrafts.js';
const api = vi.hoisted(() => ({
  fetchVenueRating: vi.fn(),
  fetchVenueReviews: vi.fn(),
  fetchOwnVenueReview: vi.fn(),
  submitVenueReview: vi.fn(),
  fetchVenueStatus: vi.fn(),
}));
const routing = vi.hoisted(() => ({ route: null, replace: vi.fn() }));
vi.mock('@/api/venue-review.api.js', () => api);
vi.mock('vue-router', () => ({
  useRoute: () => routing.route,
  useRouter: () => routing,
}));
import View from './VenueReviewsView.vue';
let wrapper;
const row = (
  status = 'pending',
  content = '本人待审 <script>alert(1)</script>',
) => ({
  id: 'root',
  submissionId: 'sub',
  userId: 'one',
  userDisplayName: '同学',
  rating: 4,
  content,
  status,
  ownedByMe: true,
  createdAt: '2026-11-02T00:00:00Z',
});
const render = async () => {
  wrapper = mount(View, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        VenueReplySection: { template: '<div><slot name="actions" /></div>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
beforeEach(() => {
  vi.clearAllMocks();
  clearVenueDrafts();
  setActivePinia(createPinia());
  useAuthStore().setSession({
    user: { id: 'one', role: 'user', displayName: '同学' },
  });
  routing.route = reactive({
    name: 'venueReviews',
    params: { type: 'hall', targetId: 'hall-id' },
    query: {},
  });
  api.fetchVenueRating.mockResolvedValue({
    name: '学苑餐厅',
    averageScore: null,
    reviewCount: 0,
  });
  api.fetchVenueReviews.mockResolvedValue({
    items: [],
    total: 0,
    hasMore: false,
  });
  api.fetchOwnVenueReview.mockResolvedValue({
    publicVersion: null,
    privateSubmission: null,
  });
});
afterEach(() => wrapper?.unmount());
describe('餐厅/档口点评', () => {
  it('本人待审内容内联显示，不改变公开人数，文本不会被执行', async () => {
    api.fetchOwnVenueReview.mockResolvedValue({ privateSubmission: row() });
    await render();
    expect(wrapper.get('[data-private-review]').text()).toContain(
      '审核中 · 仅自己可见',
    );
    expect(wrapper.findAll('[data-public-review]')).toHaveLength(0);
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.text()).toContain('暂无评分');
  });
  it('公开列表失败仍保留成功读取的本人待审内容', async () => {
    api.fetchVenueReviews.mockRejectedValue(new Error('网络中断'));
    api.fetchOwnVenueReview.mockResolvedValue({ privateSubmission: row() });
    await render();
    expect(wrapper.get('[data-private-review]').text()).toContain('本人待审');
    expect(wrapper.text()).toContain('网络中断');
  });
  it('修改待审时旧评价继续公开，通过后同一楼只显示一次', async () => {
    const old = row('approved', '原公开正文');
    api.fetchVenueReviews.mockResolvedValue({ items: [old], total: 1 });
    api.fetchOwnVenueReview.mockResolvedValue({
      publicVersion: old,
      privateSubmission: row(),
    });
    await render();
    expect(wrapper.get('[data-public-review]').text()).toContain('原公开正文');
    expect(wrapper.find('[data-private-review]').exists()).toBe(true);
    api.fetchVenueReviews.mockResolvedValue({
      items: [row('approved', '新公开正文')],
      total: 1,
    });
    api.fetchOwnVenueReview.mockResolvedValue({
      publicVersion: row('approved'),
      privateSubmission: null,
    });
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '刷新')
      .trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-public-review]')).toHaveLength(1);
    expect(wrapper.find('[data-private-review]').exists()).toBe(false);
  });
  it('驳回重提恢复正文与星级，失败重试沿用操作 ID，草稿不丢失', async () => {
    routing.route.name = 'venueReviewCreate';
    api.fetchOwnVenueReview.mockResolvedValue({
      privateSubmission: row('rejected', '修改这段正文'),
    });
    api.submitVenueReview.mockRejectedValue(new Error('网络中断'));
    await render();
    expect(wrapper.get('textarea').element.value).toBe('修改这段正文');
    expect(wrapper.get('[aria-label="4 星"]').attributes('aria-checked')).toBe(
      'true',
    );
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.submitVenueReview).toHaveBeenCalledTimes(2);
    expect(api.submitVenueReview.mock.calls[0][2].clientRequestId).toBe(
      api.submitVenueReview.mock.calls[1][2].clientRequestId,
    );
    expect(wrapper.get('textarea').element.value).toBe('修改这段正文');
  });
  it('不允许空评分提交，访客没有投稿操作', async () => {
    routing.route.name = 'venueReviewCreate';
    await render();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.submitVenueReview).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('请选择1–5星');
    useAuthStore().setSession({ user: { id: 'one', role: 'visitor' } });
    await flushPromises();
    expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true);
  });
  it('切换账号清空待审内容，延迟响应不能回填', async () => {
    let resolve;
    api.fetchOwnVenueReview.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    wrapper = mount(View, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    useAuthStore().setSession({ user: { id: 'two', role: 'user' } });
    resolve({ privateSubmission: row() });
    await flushPromises();
    expect(wrapper.text()).not.toContain('本人待审');
  });
});
