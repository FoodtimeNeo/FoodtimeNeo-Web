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
