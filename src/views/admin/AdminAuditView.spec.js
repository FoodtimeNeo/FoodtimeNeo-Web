import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchAuditItems: vi.fn(),
  submitAudit: vi.fn(),
}));
vi.mock('@/api/admin-audit.api.js', () => api);
const replyApi = vi.hoisted(() => ({ removeReviewReplyAsAdmin: vi.fn() }));
vi.mock('@/api/review.api.js', () => replyApi);
const communityApi = vi.hoisted(() => ({
  fetchCommunityAudit: vi.fn(),
  fetchCommunityAuditDetail: vi.fn(),
  submitCommunityAudit: vi.fn(),
  removeCommunityAsAdmin: vi.fn(),
}));
vi.mock('@/api/community.api.js', () => communityApi);
import AdminAuditView from './AdminAuditView.vue';
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAuditItems.mockResolvedValue({
    items: [
      {
        id: 'd',
        type: 'dish',
        name: '面',
        status: 'pending',
        price: null,
        userId: 'u9',
        userDisplayName: '干饭达人',
      },
    ],
    page: 1,
    size: 20,
    total: 1,
  });
});
it('社区审核先加载完整图文，再提交人工决定', async () => {
  communityApi.fetchCommunityAudit.mockResolvedValue({
    items: [
      {
        id: 'post',
        type: 'community-post',
        name: '食记标题',
        status: 'pending',
        content: '食记正文',
      },
    ],
    page: 1,
    size: 20,
    total: 1,
  });
  let finish;
  communityApi.fetchCommunityAuditDetail.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  communityApi.submitCommunityAudit.mockResolvedValue({ status: 'approved' });
  const w = mount(AdminAuditView);
  await flushPromises();
  await w.findAll('select')[1].setValue('posts');
  await flushPromises();
  await w
    .findAll('button')
    .find((b) => b.text() === '通过')
    .trigger('click');
  await flushPromises();
  expect(w.get('button[type=submit]').attributes('disabled')).toBeDefined();
  finish({
    post: {
      title: '食记标题',
      content: '完整正文',
      images: [{ url: '/one' }, { url: '/two' }],
    },
    comment: null,
  });
  await flushPromises();
  expect(w.text()).toContain('完整正文');
  expect(w.findAll('.community-image-viewer__dot')).toHaveLength(2);
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(communityApi.submitCommunityAudit).toHaveBeenCalledWith(
    'posts',
    'post',
    { action: 'approve', reason: null },
  );
});
it('已通过回复可填写原因后删除', async () => {
  api.fetchAuditItems.mockResolvedValue({
    items: [
      {
        id: 'reply',
        type: 'dish-review-reply',
        status: 'approved',
        content: '违规回复',
      },
    ],
    page: 1,
    size: 20,
    total: 1,
  });
  const w = mount(AdminAuditView);
  await flushPromises();
  await w
    .findAll('button')
    .find((b) => b.text() === '删除违规回复')
    .trigger('click');
  await w.get('form').trigger('submit');
  expect(replyApi.removeReviewReplyAsAdmin).not.toHaveBeenCalled();
  await w.get('textarea').setValue('违规原因');
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(replyApi.removeReviewReplyAsAdmin).toHaveBeenCalledExactlyOnceWith(
    'reply',
    '违规原因',
  );
});
it('驳回必须填原因，通过空价菜品必须补价格', async () => {
  const wrapper = mount(AdminAuditView);
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '驳回')
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  expect(api.submitAudit).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('审核原因');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '取消')
    .trigger('click');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '通过')
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  expect(api.submitAudit).not.toHaveBeenCalled();
  await wrapper.get('input').setValue('0');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.submitAudit).toHaveBeenCalledWith('dish', 'd', {
    action: 'approve',
    reason: null,
    price: 0,
  });
});
it('审核冲突保留原内容，写入期间阻止重复提交', async () => {
  const wrapper = mount(AdminAuditView);
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '驳回')
    .trigger('click');
  await wrapper.get('textarea').setValue('说明');
  let reject;
  api.submitAudit.mockImplementation(
    () =>
      new Promise((resolve, fail) => {
        reject = fail;
      }),
  );
  await wrapper.get('form').trigger('submit');
  await wrapper.get('form').trigger('submit');
  expect(api.submitAudit).toHaveBeenCalledOnce();
  reject(new Error('已被他人审核'));
  await flushPromises();
  expect(wrapper.text()).toContain('已被他人审核');
  expect(wrapper.get('textarea').element.value).toBe('说明');
});
it('审核队列显示投稿者昵称，不展示内部目标 ID', async () => {
  const wrapper = mount(AdminAuditView);
  await flushPromises();
  expect(wrapper.text()).toContain('发布者名称：干饭达人');
  expect(wrapper.text()).not.toContain('目标 ID：');
});
it('点评与图片投稿显示 AI 分诊结论，菜品投稿不显示', async () => {
  api.fetchAuditItems.mockResolvedValue({
    items: [
      {
        id: 'r1',
        type: 'review',
        status: 'pending',
        userId: 'u1',
        content: '好吃',
        rating: 5,
        aiRiskLevel: 'LOW',
        aiConfidence: 0.9,
        aiLabels: [],
        aiReason: '正常点评',
        aiCheckedAt: '2026-10-16T08:00:00Z',
      },
      {
        id: 'p1',
        type: 'photo',
        status: 'pending',
        userId: 'u2',
        imageUrl: '/api/v1/media/x',
        aiRiskLevel: 'HIGH',
        aiConfidence: 0.95,
        aiLabels: ['广告'],
        aiReason: '推广二维码',
        aiCheckedAt: '2026-10-16T08:00:00Z',
      },
      { id: 'd', type: 'dish', name: '面', status: 'pending', userId: 'u9' },
    ],
    page: 1,
    size: 20,
    total: 3,
  });
  const wrapper = mount(AdminAuditView);
  await flushPromises();
  const text = wrapper.text();
  expect(text).toContain('AI 分诊：');
  expect(text).toContain('LOW');
  expect(text).toContain('HIGH');
  expect(text).toContain('90%');
  expect(text).toContain('广告');
  expect(text.match(/AI 分诊/g) || []).toHaveLength(2);
});
