import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  enableAutoUnmount,
  mount,
  flushPromises,
  RouterLinkStub,
} from '@vue/test-utils';
enableAutoUnmount(afterEach);
afterEach(() => vi.restoreAllMocks());
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
  userDisplayName: '干饭达人',
  userEmail: '20260001@bjtu.edu.cn',
  dishName: '例汤',
  diningHallName: '食堂',
  stallName: '汤档',
  content: '真实评论',
  rating: 4,
  createdAt: '2026-10-16T08:00:00Z',
  aiRiskLevel: 'LOW',
  aiConfidence: 0.9,
  aiLabels: [],
  aiReason: '正常点评',
  aiCheckedAt: '2026-10-16T08:00:00Z',
};
const mountPage = () =>
  mount(ManagedReviewsView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        ElDialog: {
          name: 'ElDialog',
          props: ['modelValue', 'closeOnPressEscape', 'showClose'],
          emits: ['update:modelValue'],
          template:
            '<div v-if="modelValue" role="dialog"><slot /><slot name="footer" /></div>',
        },
      },
    },
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
  expect(wrapper.text()).toContain('发布者名称：干饭达人');
  expect(wrapper.text()).toContain('发布者 ID：u1');
  expect(wrapper.text()).toContain('发布者邮箱：20260001@bjtu.edu.cn');
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
it('正式评论显示 AI 分诊结论，无结论时显示占位', async () => {
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.text()).toContain('AI 分诊');
  expect(wrapper.text()).toContain('LOW');
  expect(wrapper.text()).toContain('90%');
});

it('完整弹窗保留全文、发布者、更新时间与全部 AI 信息，正文不执行 HTML', async () => {
  api.fetchManagedReviews.mockResolvedValue({
    items: [
      {
        ...row,
        content: '<img src=x onerror="attack()">\n完整末尾',
        updatedAt: '2026-10-17T08:00:00Z',
        aiLabels: ['正常文本'],
      },
    ],
    total: 1,
    size: 20,
  });
  const wrapper = mountPage();
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看完整内容')
    .trigger('click');
  const dialog = wrapper.get('[role="dialog"]');
  for (const text of [
    '发布者名称：干饭达人',
    '发布者邮箱：20260001@bjtu.edu.cn',
    '发布者 ID：u1',
    '发布时间：',
    '点评 ID：r1',
    '更新时间：',
    '诊断时间：',
    '正常文本',
    '完整末尾',
    '食堂 / 汤档',
  ])
    expect(dialog.text()).toContain(text);
  expect(dialog.find('img').exists()).toBe(false);
  expect(dialog.find('.managed-review-content__preview').exists()).toBe(false);
  expect(dialog.findAll('svg.is-filled')).toHaveLength(4);
  expect(dialog.find('textarea').exists()).toBe(false);
  await dialog
    .findAll('button')
    .find((b) => b.text() === '删除违规评论')
    .trigger('click');
  expect(wrapper.get('textarea').attributes('aria-required')).toBe('true');
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '取消')
    .trigger('click');
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  expect(api.deleteManagedReview).not.toHaveBeenCalled();
});

it('删除提交期间禁止重复提交和关闭，失败后保留详情及输入', async () => {
  let rejectDelete;
  api.deleteManagedReview.mockReturnValue(
    new Promise((resolve, reject) => {
      rejectDelete = reject;
    }),
  );
  const wrapper = mountPage();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '删除违规评论')
    .trigger('click');
  await wrapper.get('textarea').setValue('处理原因');
  await wrapper.get('#managed-review-decision').trigger('submit');
  await wrapper.get('#managed-review-decision').trigger('submit');
  const dialogComponent = wrapper.findComponent({ name: 'ElDialog' });
  expect(api.deleteManagedReview).toHaveBeenCalledOnce();
  expect(dialogComponent.props('closeOnPressEscape')).toBe(false);
  expect(dialogComponent.props('showClose')).toBe(false);
  expect(
    wrapper
      .findAll('button')
      .find((b) => b.text() === '取消')
      .attributes('disabled'),
  ).toBeDefined();
  dialogComponent.vm.$emit('update:modelValue', false);
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  rejectDelete(new Error('服务暂时不可用'));
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('处理原因');
  expect(wrapper.get('[role="alert"]').text()).toBe('服务暂时不可用');
  expect(dialogComponent.props('closeOnPressEscape')).toBe(true);
});

it('删除完成但列表刷新失败时明确区分结果，避免重复删除', async () => {
  const wrapper = mountPage();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '删除违规评论')
    .trigger('click');
  await wrapper.get('textarea').setValue('处理原因');
  api.deleteManagedReview.mockResolvedValue(null);
  api.fetchManagedReviews.mockRejectedValue(new Error('列表暂时不可用'));
  await wrapper.get('#managed-review-decision').trigger('submit');
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  expect(wrapper.text()).toContain('评论已删除，但列表更新失败');
  expect(wrapper.findAll('.review-card')).toHaveLength(0);
  expect(api.deleteManagedReview).toHaveBeenCalledOnce();
});

it('删除末页唯一评论后回到上一页，并保留用户查询条件', async () => {
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
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '删除违规评论')
    .trigger('click');
  await wrapper.get('textarea').setValue('处理原因');
  api.deleteManagedReview.mockResolvedValue(null);
  api.fetchManagedReviews.mockResolvedValue({
    items: [row],
    total: 20,
    size: 20,
  });
  await wrapper.get('#managed-review-decision').trigger('submit');
  await flushPromises();
  expect(api.fetchManagedReviews).toHaveBeenLastCalledWith(
    1,
    'u1',
    expect.any(Object),
  );
  expect(wrapper.text()).toContain('第 1 / 1 页');
});
