import { beforeEach, expect, it, vi } from 'vitest';
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
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: 'user' };
  api.fetchStalls.mockResolvedValue([{ id: 'stall', name: '面档' }]);
  api.uploadImage.mockResolvedValue({ imageUrl: 'reference' });
});
it('投稿失败保留草稿和已上传引用，重复提交期间仅写一次', async () => {
  const wrapper = mount(SubmissionCreateView, {
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
});
it('错误父级目标不能打开投稿表单', async () => {
  api.fetchStalls.mockResolvedValue([]);
  const wrapper = mount(SubmissionCreateView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  expect(wrapper.find('form').exists()).toBe(false);
  expect(wrapper.text()).toContain('目标不存在');
});
