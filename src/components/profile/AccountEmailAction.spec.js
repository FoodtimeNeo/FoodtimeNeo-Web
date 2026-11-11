import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  sendAccountActionCode: vi.fn(),
  confirmAccountAction: vi.fn(),
}));
const confirm = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ user: { id: 'one' }, role: 'user' }));
vi.mock('@/api/account-lifecycle.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => auth }));
vi.mock('element-plus', () => ({ ElMessageBox: { confirm } }));
import Action from './AccountEmailAction.vue';
let wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'one' };
  auth.role = 'user';
  api.sendAccountActionCode.mockResolvedValue({
    expiresAt: '2026-11-11T10:15:00Z',
    nextSendAt: '2026-11-11T16:00:00Z',
    verificationEmail: '123@bjtu.edu.cn',
  });
  confirm.mockResolvedValue('confirm');
  api.confirmAccountAction.mockResolvedValue({
    deleted: true,
    emailsReusableAt: '2026-11-11T11:00:00Z',
  });
});
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});
const render = (kind = 'delete', extra = {}) =>
  (wrapper = mount(Action, {
    props: { kind, email: '123@bjtu.edu.cn', ...extra },
  }));
const prepare = async () => {
  await wrapper.get('input[inputmode=numeric]').setValue('012345');
  await wrapper.get('input[type=checkbox]').setValue(true);
};
it('注销先提示不可撤销与一小时冷却，成功发码后禁止当天重发', async () => {
  render();
  expect(wrapper.text()).toContain('不继承旧账号数据');
  expect(wrapper.text()).toContain('每天只能成功发送一次');
  await wrapper.get('button[type=button]').trigger('click');
  await flushPromises();
  expect(api.sendAccountActionCode).toHaveBeenCalledWith('delete');
  expect(wrapper.get('button[type=button]').element.disabled).toBe(true);
  expect(api.confirmAccountAction).not.toHaveBeenCalled();
});
it('邮件发送失败可以重试，原验证码输入不会作为注册请求提交', async () => {
  api.sendAccountActionCode.mockRejectedValueOnce(new Error('邮件未送达'));
  render();
  await wrapper.get('button[type=button]').trigger('click');
  await flushPromises();
  expect(wrapper.get('[role=alert]').text()).toContain('未送达');
  expect(wrapper.get('button[type=button]').element.disabled).toBe(false);
  await wrapper.get('button[type=button]').trigger('click');
  await flushPromises();
  expect(api.sendAccountActionCode).toHaveBeenCalledTimes(2);
});
it('需要确认勾选、六位验证码与最终确认；取消不注销，失败保留验证码可重试', async () => {
  render();
  expect(wrapper.get('button[type=submit]').element.disabled).toBe(true);
  await prepare();
  confirm.mockRejectedValueOnce('cancel');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.confirmAccountAction).not.toHaveBeenCalled();
  api.confirmAccountAction.mockRejectedValueOnce(new Error('验证码错误'));
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.get('input[inputmode=numeric]').element.value).toBe('012345');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.emitted('done')).toHaveLength(1);
  expect(api.confirmAccountAction).toHaveBeenLastCalledWith('delete', '012345');
});
it('绑定邮箱发生变化时丢弃旧邮箱界面并要求重新读取', async () => {
  api.sendAccountActionCode.mockResolvedValue({
    expiresAt: '2026-11-11T10:15:00Z',
    nextSendAt: '2026-11-11T16:00:00Z',
    verificationEmail: 'changed@bjtu.edu.cn',
  });
  render();
  await wrapper.get('button[type=button]').trigger('click');
  await flushPromises();
  expect(wrapper.emitted('refresh')).toHaveLength(1);
  expect(api.confirmAccountAction).not.toHaveBeenCalled();
});
it('最终确认期间切换账号，不向新账号提交旧验证码', async () => {
  let resolve;
  confirm.mockImplementation(() => new Promise((r) => (resolve = r)));
  render();
  await prepare();
  await wrapper.get('form').trigger('submit');
  auth.user = { id: 'two' };
  resolve('confirm');
  await flushPromises();
  expect(api.confirmAccountAction).not.toHaveBeenCalled();
});
it('解绑使用独立用途，发送成功等待60秒且不改变注销额度', async () => {
  vi.useFakeTimers();
  render('unbind');
  await wrapper.get('button[type=button]').trigger('click');
  await flushPromises();
  expect(api.sendAccountActionCode).toHaveBeenCalledWith('unbind');
  expect(wrapper.get('button[type=button]').element.disabled).toBe(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(wrapper.get('button[type=button]').element.disabled).toBe(false);
  await prepare();
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.confirmAccountAction).toHaveBeenCalledWith('unbind', '012345');
});
it('管理员不能从残留组件发码或确认注销', async () => {
  render();
  auth.role = 'admin';
  await prepare();
  await wrapper.get('button[type=button]').trigger('click');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.sendAccountActionCode).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});
