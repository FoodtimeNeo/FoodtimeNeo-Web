import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AuditContent from './AuditContent.vue';

it('餐厅详情保留列表发布者资料，完整内容包含全部 AI 诊断信息', () => {
  const row = {
    id: 'submission',
    type: 'hall-review',
    userId: 'author-id',
    userDisplayName: '发布者',
    userEmail: '20260001@bjtu.edu.cn',
    content: '<script>danger()</script>',
    aiRiskLevel: 'MEDIUM',
    aiConfidence: 0.8,
    aiLabels: ['待核实'],
    aiReason: '完整建议',
    aiCheckedAt: '2026-11-03T08:00:00Z',
  };
  const wrapper = mount(AuditContent, {
    props: {
      row,
      full: true,
      details: {
        venue: { name: '食堂' },
        submission: { content: '本次提交全文', rating: 4 },
      },
    },
  });
  expect(wrapper.text()).toContain('发布者名称：发布者');
  expect(wrapper.text()).toContain('发布者邮箱：20260001@bjtu.edu.cn');
  expect(wrapper.text()).toContain('发布者 ID：author-id');
  expect(wrapper.text()).toContain('本次提交全文');
  expect(wrapper.text()).toContain('诊断时间：');
  expect(wrapper.text()).toContain('待核实');
  expect(wrapper.find('script').exists()).toBe(false);
});
