import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({ fetchModerationLogs: vi.fn() }));
vi.mock('@/api/admin-audit.api.js', () => api);
import ModerationLogsView from './ModerationLogsView.vue';
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchModerationLogs.mockResolvedValue({
    items: [
      {
        id: 'l1',
        submissionId: 's1',
        type: 'review',
        moderatorId: 'admin1',
        userId: 'publisher1',
        userEmail: '20260001@bjtu.edu.cn',
        userDisplayName: '发布者甲',
        content: '<b>原始内容</b>\n第二行',
        submittedAt: '2026-10-15T08:00:00Z',
        actor: 'human',
        aiModel: null,
        action: 'approve',
        reason: null,
        createdAt: '2026-10-16T08:00:00Z',
      },
      {
        id: 'l2',
        submissionId: 's2',
        type: 'review',
        moderatorId: null,
        actor: 'ai',
        aiModel: 'fake',
        action: 'reject',
        reason: '命中测试标记',
        createdAt: '2026-10-16T08:01:00Z',
      },
    ],
    page: 1,
    size: 20,
    total: 2,
  });
});
it('人工与 AI 日志分开显示', async () => {
  const wrapper = mount(ModerationLogsView);
  await flushPromises();
  expect(wrapper.text()).toContain('审核人 ID：admin1');
  expect(wrapper.text()).toContain('AI 审核');
  expect(wrapper.text()).not.toContain('审核人 ID：null');
});

it('日志展示发布者、原内容及独立的发布时间和审核时间', async () => {
  const wrapper = mount(ModerationLogsView);
  await flushPromises();
  expect(wrapper.text()).toContain('发布者名称：发布者甲');
  expect(wrapper.text()).toContain('发布者邮箱：20260001@bjtu.edu.cn');
  expect(wrapper.text()).toContain('发布者 ID：publisher1');
  expect(wrapper.text()).toContain('<b>原始内容</b>');
  expect(wrapper.find('.published-content b').exists()).toBe(false);
  expect(wrapper.text()).toContain('发布时间：');
  expect(wrapper.text()).toContain('审核时间：');
  expect(wrapper.text()).toContain('发布时间：—');
});

it('完整日志可展开与关闭，保留两种时间、标识、原始内容及审核原因', async () => {
  const wrapper = mount(ModerationLogsView, {
    global: {
      stubs: {
        ElDialog: {
          props: ['modelValue'],
          template:
            '<div v-if="modelValue" role="dialog"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '查看完整日志')
    .trigger('click');
  const dialog = wrapper.get('[role="dialog"]');
  for (const text of [
    '日志 ID：l1',
    '投稿 ID：s1',
    '发布者邮箱：20260001@bjtu.edu.cn',
    '发布者 ID：publisher1',
    '发布时间：',
    '审核时间：',
    '审核人 ID：admin1',
    '<b>原始内容</b>\n第二行',
  ]) {
    expect(dialog.text()).toContain(text);
  }
  expect(dialog.find('b').exists()).toBe(false);
  await dialog.get('button').trigger('click');
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  await wrapper
    .findAll('button')
    .filter((b) => b.text() === '查看完整日志')[1]
    .trigger('click');
  expect(wrapper.get('[role="dialog"]').text()).toContain(
    '审核说明：命中测试标记',
  );
  expect(wrapper.get('[role="dialog"]').text()).toContain('AI 审核（fake）');
});
