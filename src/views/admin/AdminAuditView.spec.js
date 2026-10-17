import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchAuditItems: vi.fn(),
  submitAudit: vi.fn(),
}));
vi.mock('@/api/admin-audit.api.js', () => api);
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
  expect(wrapper.text()).toContain('投稿者：干饭达人');
  expect(wrapper.text()).not.toContain('目标 ID：');
});
