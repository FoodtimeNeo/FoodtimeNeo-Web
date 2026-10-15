import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  changePassword: vi.fn(),
  replace: vi.fn(),
  clear: vi.fn(),
  fetchOwnReviews: vi.fn(),
  deleteOwnReview: vi.fn(),
  fetchProfile: vi.fn(),
  setSession: vi.fn(),
}));
vi.mock('@/api/auth.api.js', () => api);
vi.mock('@/api/profile.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => api }));
vi.mock('vue-router', () => ({
  useRouter: () => api,
  RouterLink: RouterLinkStub,
}));
import ChangePasswordView from './ChangePasswordView.vue';
import MyReviewsView from './MyReviewsView.vue';
import ProfileView from './ProfileView.vue';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});
const view = (component) =>
  mount(component, { global: { stubs: { RouterLink: RouterLinkStub } } });
describe('个人记录与改密', () => {
  it('空头像用一个完整字符占位，并说明评论与投稿记录的区别', async () => {
    api.fetchProfile.mockResolvedValue({
      id: 'u1',
      displayName: '🍜同学',
      role: 'user',
    });
    const wrapper = view(ProfileView);
    await flushPromises();
    expect(wrapper.get('[role="img"][aria-label="个人头像"]').text()).toBe(
      '🍜',
    );
    expect(wrapper.text()).not.toContain('未设置头像');
    expect(wrapper.text()).toContain('已发布的点评');
    expect(wrapper.text()).toContain('投稿记录与审核结果');
    wrapper.unmount();
  });
  it('没有已发布评论时可直接查看点评审核记录', async () => {
    api.fetchOwnReviews.mockResolvedValue({ items: [], total: 0, size: 20 });
    const wrapper = view(MyReviewsView);
    await flushPromises();
    const link = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.text() === '查看点评审核记录');
    expect(link.props('to')).toEqual({
      name: 'mySubmissions',
      query: { kind: 'review' },
    });
    expect(wrapper.find('nav[aria-label="分页"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it('改密失败保留输入与身份，成功后清除身份并要求重新登录', async () => {
    const wrapper = view(ChangePasswordView);
    await wrapper
      .get('input[autocomplete="current-password"]')
      .setValue('Old2026!');
    await wrapper
      .get('input[autocomplete="new-password"]')
      .setValue('New2026!');
    api.changePassword.mockRejectedValueOnce(new Error('旧密码错误'));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('旧密码错误');
    expect(api.clear).not.toHaveBeenCalled();
    expect(
      wrapper.get('input[autocomplete="new-password"]').element.value,
    ).toBe('New2026!');
    api.changePassword.mockResolvedValueOnce(null);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.changePassword).toHaveBeenLastCalledWith({
      oldPassword: 'Old2026!',
      newPassword: 'New2026!',
    });
    expect(api.clear).toHaveBeenCalledOnce();
    expect(api.replace).toHaveBeenCalledWith({ name: 'login' });
  });
  it('删除失败仍保留原评论，取消确认不发请求', async () => {
    api.fetchOwnReviews.mockResolvedValue({
      items: [{ id: 'r1', dishName: '面', rating: 4, content: '原评论' }],
      page: 1,
      size: 20,
      total: 1,
    });
    const wrapper = view(MyReviewsView);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '删除')
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '取消')
      .trigger('click');
    expect(api.deleteOwnReview).not.toHaveBeenCalled();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '删除')
      .trigger('click');
    api.deleteOwnReview.mockRejectedValueOnce(new Error('删除失败'));
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '确认删除')
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('原评论');
    expect(wrapper.text()).toContain('删除失败');
  });
  it('正文与审核原因按文本显示，空价格不伪造为零', () => {
    const wrapper = mount(SubmissionRecord, {
      props: {
        kind: 'dish',
        row: {
          id: 's1',
          name: '投稿',
          status: 'rejected',
          price: null,
          description: '<img onerror="alert(1)">',
          reviewReason: '<b>原因</b>',
        },
      },
    });
    expect(wrapper.text()).toContain('<b>原因</b>');
    expect(wrapper.text()).toContain('价格未填写');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('b').exists()).toBe(false);
  });
});
