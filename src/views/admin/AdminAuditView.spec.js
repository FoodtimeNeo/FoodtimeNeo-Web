import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
enableAutoUnmount(afterEach);
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
const render = () =>
  mount(AdminAuditView, {
    global: {
      stubs: {
        ElDialog: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
const button = (wrapper, label) =>
  wrapper.findAll('button').find((b) => b.text() === label);
beforeEach(() => {
  for (const mock of [
    ...Object.values(api),
    ...Object.values(replyApi),
    ...Object.values(communityApi),
  ])
    mock.mockReset();
  api.submitAudit.mockResolvedValue({ status: 'approved' });
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
  const w = render();
  await flushPromises();
  await button(w, '社区食记').trigger('click');
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
  const w = render();
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
  const wrapper = render();
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
  const wrapper = render();
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
  const wrapper = render();
  await flushPromises();
  expect(wrapper.text()).toContain('发布者名称：干饭达人');
  expect(wrapper.text()).not.toContain('目标 ID：');
});
it('点评、图片和新菜品展示 AI 建议，未出结论时保留待诊断提示', async () => {
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
  const wrapper = render();
  await flushPromises();
  const text = wrapper.text();
  expect(text).toContain('AI 分诊：');
  expect(text).toContain('LOW');
  expect(text).toContain('HIGH');
  expect(text).toContain('90%');
  expect(text).toContain('广告');
  expect(text.match(/AI 分诊/g) || []).toHaveLength(3);
});

it('状态与类型使用按钮，切换时回到第一页并把类型交给后端筛选', async () => {
  api.fetchAuditItems.mockImplementation((status, page) =>
    Promise.resolve({
      items: [{ id: 'd', type: 'dish', status, name: '面' }],
      total: 41,
      size: 20,
      page,
    }),
  );
  const w = render();
  await flushPromises();
  expect(w.find('select').exists()).toBe(false);
  await button(w, '下一页').trigger('click');
  await flushPromises();
  expect(api.fetchAuditItems).toHaveBeenLastCalledWith(
    'pending',
    2,
    expect.any(Object),
    undefined,
  );
  await button(w, '新菜品').trigger('click');
  await flushPromises();
  expect(api.fetchAuditItems).toHaveBeenLastCalledWith(
    'pending',
    1,
    expect.any(Object),
    'dish',
  );
  expect(button(w, '新菜品').attributes('aria-pressed')).toBe('true');
  await button(w, '已驳回').trigger('click');
  await flushPromises();
  expect(api.fetchAuditItems).toHaveBeenLastCalledWith(
    'rejected',
    1,
    expect.any(Object),
    'dish',
  );
});

it('旧详情请求完成不能解除另一个投稿的加载状态或显示旧内容', async () => {
  communityApi.fetchCommunityAudit.mockResolvedValue({
    items: [
      { id: 'a', type: 'community-post', status: 'pending' },
      { id: 'b', type: 'community-post', status: 'pending' },
    ],
    total: 2,
    page: 1,
    size: 20,
  });
  const waiting = {};
  communityApi.fetchCommunityAuditDetail.mockImplementation(
    (type, id) =>
      new Promise((resolve) => {
        waiting[id] = resolve;
      }),
  );
  const w = render();
  await flushPromises();
  await button(w, '社区食记').trigger('click');
  await flushPromises();
  await w
    .findAll('button')
    .filter((b) => b.text() === '通过')[0]
    .trigger('click');
  await button(w, '取消').trigger('click');
  await w
    .findAll('button')
    .filter((b) => b.text() === '通过')[1]
    .trigger('click');
  waiting.a({
    post: { title: '旧详情', content: '不应出现的正文', images: [] },
  });
  await flushPromises();
  expect(w.get('button[type=submit]').attributes('disabled')).toBeDefined();
  expect(w.text()).not.toContain('不应出现的正文');
  waiting.b({ post: { title: '当前详情', content: '正确正文', images: [] } });
  await flushPromises();
  expect(w.get('button[type=submit]').attributes('disabled')).toBeUndefined();
  expect(w.text()).toContain('正确正文');
});

it('重试完整详情保留已填审核说明', async () => {
  communityApi.fetchCommunityAudit.mockResolvedValue({
    items: [{ id: 'a', type: 'community-post', status: 'pending' }],
    total: 1,
    page: 1,
    size: 20,
  });
  communityApi.fetchCommunityAuditDetail
    .mockRejectedValueOnce(new Error('详情断网'))
    .mockResolvedValue({
      post: { title: '食记', content: '全文', images: [] },
    });
  const w = render();
  await flushPromises();
  await button(w, '社区食记').trigger('click');
  await flushPromises();
  await button(w, '驳回').trigger('click');
  await flushPromises();
  await w.get('textarea').setValue('保留这段说明');
  await button(w, '重试加载完整内容').trigger('click');
  await flushPromises();
  expect(w.get('textarea').element.value).toBe('保留这段说明');
  expect(w.get('button[type=submit]').attributes('disabled')).toBeUndefined();
});

it('取消后重新打开同一投稿保留未提交的价格和说明', async () => {
  const w = render();
  await flushPromises();
  await button(w, '通过').trigger('click');
  await w.get('input').setValue('6.50');
  await w.get('textarea').setValue('价格已核对');
  await button(w, '取消').trigger('click');
  await button(w, '通过').trigger('click');
  expect(w.get('input').element.value).toBe('6.50');
  expect(w.get('textarea').element.value).toBe('价格已核对');
});

it('社区详情未完成时关闭后打开菜品不会被旧加载状态锁住', async () => {
  communityApi.fetchCommunityAudit.mockResolvedValue({
    items: [{ id: 'a', type: 'community-post', status: 'pending' }],
    total: 1,
    page: 1,
    size: 20,
  });
  communityApi.fetchCommunityAuditDetail.mockImplementation(
    () => new Promise(() => {}),
  );
  const w = render();
  await flushPromises();
  await button(w, '社区食记').trigger('click');
  await flushPromises();
  await button(w, '通过').trigger('click');
  await button(w, '取消').trigger('click');
  await button(w, '新菜品').trigger('click');
  await flushPromises();
  await button(w, '通过').trigger('click');
  expect(w.get('button[type=submit]').attributes('disabled')).toBeUndefined();
});

it('审核已写入但刷新失败时明确成功结果，不要求重复审核', async () => {
  const w = render();
  await flushPromises();
  await button(w, '通过').trigger('click');
  await w.get('input').setValue('0');
  api.fetchAuditItems.mockRejectedValueOnce(new Error('列表暂不可用'));
  await w.get('form').trigger('submit');
  await flushPromises();
  expect(w.text()).toContain('审核已通过，但列表更新失败');
  expect(w.find('form').exists()).toBe(false);
  expect(api.submitAudit).toHaveBeenCalledOnce();
});

it('AI 或其他管理员清空末页后自动返回有效页码', async () => {
  api.fetchAuditItems.mockImplementation((status, page) =>
    Promise.resolve({
      items: page === 1 ? [{ id: 'd', type: 'dish', status }] : [],
      total: page === 1 ? 21 : 20,
      page,
      size: 20,
    }),
  );
  const w = render();
  await flushPromises();
  await button(w, '下一页').trigger('click');
  await flushPromises();
  expect(api.fetchAuditItems).toHaveBeenLastCalledWith(
    'pending',
    1,
    expect.any(Object),
    undefined,
  );
  expect(w.text()).toContain('第 1 / 2 页');
});

it('已审核内容可以打开全文，投稿 HTML 按文字显示', async () => {
  api.fetchAuditItems.mockResolvedValue({
    items: [
      {
        id: 'd',
        type: 'dish',
        status: 'rejected',
        content: '<img src=x onerror=alert(1)>',
      },
    ],
    total: 1,
    page: 1,
    size: 20,
  });
  const w = render();
  await flushPromises();
  await button(w, '查看完整内容').trigger('click');
  expect(w.find('form').exists()).toBe(false);
  expect(w.text()).toContain('<img src=x onerror=alert(1)>');
  expect(w.find('img[src=x]').exists()).toBe(false);
});
