import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
const mocks = vi.hoisted(() => ({
  edit: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  upload: vi.fn(),
  save: vi.fn(),
  load: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/api/community.api.js', () => ({
  editCommunityPost: mocks.edit,
  fetchCommunityPostDetail: mocks.detail,
  createCommunityPost: mocks.create,
}));
vi.mock('@/api/submission.api.js', () => ({ uploadImage: mocks.upload }));
vi.mock('@/utils/postDraft.js', () => ({
  saveDraft: mocks.save,
  loadDraft: mocks.load,
  deleteDraft: mocks.remove,
  isBlankDraft: () => false,
}));
vi.mock('element-plus', async (original) => ({
  ...(await original()),
  ElMessageBox: { confirm: mocks.confirm },
}));
import PostCreateModal from './PostCreateModal.vue';

const post = () => ({
  id: 'post-1',
  userId: 'owner',
  title: '原标题',
  content: '原正文',
  images: [{ url: '/api/v1/media/original' }],
  linkedDish: { id: 'dish-1', name: '原菜品' },
  contentRevision: 4,
});
function editor(data = post()) {
  return mount(PostCreateModal, {
    props: { modelValue: true, editPost: data, initialData: data },
    global: {
      stubs: {
        ElDialog: { template: '<div><slot /></div>' },
        DishPicker: true,
      },
    },
  });
}
async function submit(wrapper) {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}
async function addFile(wrapper) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [new File(['new'], 'new.png', { type: 'image/png' })],
  });
  await input.trigger('change');
}
describe('author post editing', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().user = { id: 'owner', role: 'user' };
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.confirm.mockResolvedValue(true);
  });
  it('preserves identity and revision, changes all editable fields without touching creation drafts', async () => {
    mocks.edit.mockResolvedValue({ id: 'post-1', revision: 5, changed: true });
    const wrapper = editor();
    await wrapper.find('#post-title').setValue('新标题');
    await wrapper.find('#post-content').setValue('新正文');
    await submit(wrapper);
    expect(mocks.edit).toHaveBeenCalledWith('post-1', {
      title: '新标题',
      content: '新正文',
      images: ['/api/v1/media/original'],
      dishId: 'dish-1',
      expectedRevision: 4,
      clientRequestId: expect.any(String),
    });
    expect(wrapper.emitted('edited')[0][0].revision).toBe(5);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('reuses the uploaded reference and request ID after a failed association', async () => {
    mocks.upload.mockResolvedValue({ imageUrl: '/api/v1/media/new' });
    mocks.edit
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({ changed: true });
    const wrapper = editor();
    await addFile(wrapper);
    await submit(wrapper);
    const first = mocks.edit.mock.calls[0][1];
    expect(wrapper.find('#post-content').element.value).toBe('原正文');
    await submit(wrapper);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.edit.mock.calls[1][1]).toEqual(first);
    wrapper.unmount();
  });
  it('requires explicit refresh after a revision conflict and never resubmits old content automatically', async () => {
    mocks.edit.mockRejectedValue(
      Object.assign(new Error('版本冲突'), { bizCode: 'POST_EDIT_CONFLICT' }),
    );
    const wrapper = editor();
    await submit(wrapper);
    await submit(wrapper);
    expect(mocks.edit).toHaveBeenCalledTimes(1);
    mocks.detail.mockResolvedValue({
      ...post(),
      title: '另一设备的新标题',
      contentRevision: 6,
    });
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('读取最新帖子'))
      .trigger('click');
    await flushPromises();
    expect(wrapper.find('#post-title').element.value).toBe('另一设备的新标题');
    expect(mocks.edit).toHaveBeenCalledTimes(1);
    mocks.edit.mockResolvedValue({ changed: true });
    await submit(wrapper);
    expect(mocks.edit.mock.calls[1][1].expectedRevision).toBe(6);
    wrapper.unmount();
  });
  it('stops an old upload from associating after switching accounts', async () => {
    let finish;
    mocks.upload.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = editor();
    await addFile(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    useAuthStore().user = { id: 'second', role: 'user' };
    await flushPromises();
    finish({ imageUrl: '/api/v1/media/late' });
    await flushPromises();
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(wrapper.emitted('edited')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false]);
    wrapper.unmount();
  });
  it('allows an imageless repost and renews the request ID when input changes after failure', async () => {
    mocks.edit
      .mockRejectedValueOnce(new Error('重试'))
      .mockResolvedValue({ changed: true });
    const wrapper = editor({
      ...post(),
      images: [],
      repostOfId: 'immutable-source',
    });
    await submit(wrapper);
    const first = mocks.edit.mock.calls[0][1];
    await wrapper.find('#post-title').setValue('更正转发');
    await submit(wrapper);
    expect(mocks.edit.mock.calls[1][1].clientRequestId).not.toBe(
      first.clientRequestId,
    );
    expect(mocks.edit.mock.calls[1][1].images).toEqual([]);
    expect(mocks.edit.mock.calls[1][1]).not.toHaveProperty('repostOfId');
    wrapper.unmount();
  });
});
