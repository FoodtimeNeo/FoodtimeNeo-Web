import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchStalls: vi.fn(),
  uploadImage: vi.fn(),
  submitDish: vi.fn(),
  user: { id: 'user' },
}));
vi.mock('@/api/canteen.api.js', () => ({
  fetchStalls: api.fetchStalls,
  fetchCanteen: vi.fn(),
}));
vi.mock('@/api/submission.api.js', () => ({
  ...api,
  submitPhoto: vi.fn(),
  submitStall: vi.fn(),
}));
vi.mock('@/store/useAuthStore.js', () => ({ useAuthStore: () => api }));
vi.mock('vue-router', () => ({
  useRoute: () => ({
    meta: { submissionKind: 'dish' },
    params: { canteenId: 'hall', stallId: 'stall' },
  }),
  RouterLink: RouterLinkStub,
}));
import SubmissionCreateView from './SubmissionCreateView.vue';
import ImageFileField from '@/components/submission/ImageFileField.vue';
let wrapper;
afterEach(() => wrapper?.unmount());
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: 'user' };
  api.fetchStalls.mockResolvedValue([{ id: 'stall', name: '面档' }]);
  api.uploadImage.mockResolvedValue({ imageUrl: 'reference' });
  api.submitDish.mockReset().mockResolvedValue(null);
});
it('投稿失败保留草稿和已上传引用，重复提交期间仅写一次', async () => {
  wrapper = mount(SubmissionCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  await wrapper.get('input[maxlength]').setValue('测试面');
  wrapper
    .findComponent(ImageFileField)
    .vm.$emit('change', new File(['x'], 'a.png', { type: 'image/png' }));
  api.submitDish.mockRejectedValueOnce(new Error('暂不可用'));
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('暂不可用');
  expect(wrapper.get('input[maxlength]').element.value).toBe('测试面');
  let resolve;
  api.submitDish.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await wrapper.get('form').trigger('submit');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.uploadImage).toHaveBeenCalledOnce();
  expect(api.submitDish).toHaveBeenCalledTimes(2);
  expect(api.submitDish).toHaveBeenLastCalledWith('stall', {
    name: '测试面',
    description: null,
    price: null,
    imageUrl: 'reference',
  });
  resolve();
  await flushPromises();
  expect(wrapper.text()).toContain('等待审核');
  const link = wrapper
    .findAllComponents(RouterLinkStub)
    .find((link) => link.text() === '查看我的提交');
  expect(link.props('to')).toEqual({
    name: 'mySubmissions',
    query: { kind: 'dish' },
  });
});
it('错误父级目标不能打开投稿表单', async () => {
  api.fetchStalls.mockResolvedValue([]);
  wrapper = mount(SubmissionCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  expect(wrapper.find('form').exists()).toBe(false);
  expect(wrapper.text()).toContain('目标不存在');
});
it('无效表单聚焦错误摘要，点击提示能聚焦字段且不会上传', async () => {
  wrapper = mount(SubmissionCreateView, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  await wrapper.get('input[inputmode="decimal"]').setValue('-1');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(document.activeElement).toBe(wrapper.get('[tabindex="-1"]').element);
  expect(wrapper.get('input[maxlength]').attributes('aria-invalid')).toBe(
    'true',
  );
  expect(
    wrapper.get('input[inputmode="decimal"]').attributes('aria-invalid'),
  ).toBe('true');
  await wrapper.get('[tabindex="-1"] button').trigger('click');
  expect(document.activeElement).toBe(wrapper.get('input[maxlength]').element);
  expect(api.uploadImage).not.toHaveBeenCalled();
  expect(api.submitDish).not.toHaveBeenCalled();
});
it('图片检查期间禁用提交，检查完可恢复操作', async () => {
  wrapper = mount(SubmissionCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  wrapper.findComponent(ImageFileField).vm.$emit('checking', true);
  await flushPromises();
  expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true);
  await wrapper.get('form').trigger('submit');
  expect(api.uploadImage).not.toHaveBeenCalled();
  wrapper.findComponent(ImageFileField).vm.$emit('checking', false);
  await flushPromises();
  expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false);
});
