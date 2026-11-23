import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { pageIdentity } from '@/utils/pageIdentity.js';
import { useAuthStore } from '@/store/useAuthStore.js';

const storage = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/utils/postDraft.js', () => ({
  loadDraft: storage.load,
  saveDraft: storage.save,
  deleteDraft: storage.remove,
  isBlankDraft: ({ title = '', content = '', images = [] } = {}) =>
    !title.trim() && !content.trim() && !images.length,
}));
vi.mock('@/api/community.api.js', () => ({
  createCommunityPost: vi.fn(),
  editCommunityPost: vi.fn(),
  fetchCommunityPostDetail: vi.fn(),
}));
vi.mock('@/api/submission.api.js', () => ({ uploadImage: vi.fn() }));
import PostCreateModal from './PostCreateModal.vue';

const wrappers = [];
const existing = () => ({
  title: '原草稿',
  content: '原正文',
  linkedDish: { id: 'dish', name: '原菜品' },
  images: [{ id: 'one', url: '/api/v1/media/original' }],
  localRevision: 3,
});
const stubs = {
  ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
  DishPicker: true,
};
function editor() {
  const wrapper = mount(PostCreateModal, {
    props: { modelValue: true },
    global: { stubs },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function button(wrapper, label) {
  return wrapper.findAll('button').find((item) => item.text() === label);
}
async function exit(wrapper) {
  await button(wrapper, '取消').trigger('click');
  await flushPromises();
}
beforeEach(() => {
  setActivePinia(createPinia());
  useAuthStore().user = { id: 'owner', role: 'user' };
  Object.values(storage).forEach((mock) => mock.mockReset());
  storage.load.mockResolvedValue(null);
  storage.save.mockImplementation(async (origin, ownerId, draft) => ({
    ...draft,
    ownerId,
    localRevision: 4,
  }));
  storage.remove.mockResolvedValue();
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

it('does not autosave edits; discard keeps the committed draft and its images intact', async () => {
  const original = existing();
  storage.load.mockResolvedValue(original);
  const wrapper = editor();
  await flushPromises();
  await wrapper.get('#post-title').setValue('本次修改');
  await wrapper.find('.photo-card__remove-btn').trigger('click');
  vi.useFakeTimers();
  await vi.advanceTimersByTimeAsync(700);
  vi.useRealTimers();
  expect(storage.save).not.toHaveBeenCalled();
  await exit(wrapper);
  expect(button(wrapper, '保存草稿')).toBeTruthy();
  expect(button(wrapper, '继续编辑')).toBeTruthy();
  await button(wrapper, '不保存').trigger('click');
  await flushPromises();
  expect(wrapper.emitted('update:modelValue')).toContainEqual([false]);
  expect(storage.save).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
  expect(original.title).toBe('原草稿');
  expect(original.images).toHaveLength(1);
});
it('continue editing retains input, while explicit save commits once before closing', async () => {
  const wrapper = editor();
  await flushPromises();
  await wrapper.get('#post-title').setValue('新草稿');
  await exit(wrapper);
  await button(wrapper, '继续编辑').trigger('click');
  expect(wrapper.get('#post-title').element.value).toBe('新草稿');
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  await exit(wrapper);
  await button(wrapper, '保存草稿').trigger('click');
  await flushPromises();
  expect(storage.save).toHaveBeenCalledOnce();
  expect(storage.save).toHaveBeenCalledWith(
    window.location.origin,
    'owner',
    expect.objectContaining({ title: '新草稿' }),
  );
  expect(wrapper.emitted('update:modelValue')).toContainEqual([false]);
});
it('discarding a new draft creates no stored draft; an empty new editor exits directly', async () => {
  const wrapper = editor();
  await flushPromises();
  await wrapper.get('#post-content').setValue('不保存的内容');
  await exit(wrapper);
  await button(wrapper, '不保存').trigger('click');
  await flushPromises();
  expect(storage.save).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
  const blank = editor();
  await flushPromises();
  await exit(blank);
  expect(blank.emitted('update:modelValue')).toContainEqual([false]);
  expect(button(blank, '保存草稿')).toBeUndefined();
});
it('save failure keeps editor and original draft, and a retry does not double-close', async () => {
  storage.load.mockResolvedValue(existing());
  storage.save.mockRejectedValueOnce(new Error('QuotaExceeded'));
  const wrapper = editor();
  await flushPromises();
  await wrapper.get('#post-title').setValue('修改待保存');
  await exit(wrapper);
  await button(wrapper, '保存草稿').trigger('click');
  await flushPromises();
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  expect(wrapper.text()).toContain('草稿保存失败');
  expect(wrapper.get('#post-title').element.value).toBe('修改待保存');
  expect(storage.remove).not.toHaveBeenCalled();
  await button(wrapper, '保存草稿').trigger('click');
  await flushPromises();
  expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
});
it('ignores an old restore after switching accounts and cancels the pending exit', async () => {
  let resolve;
  storage.load.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const wrapper = editor();
  await flushPromises();
  useAuthStore().user = { id: 'another', role: 'user' };
  await flushPromises();
  resolve(existing());
  await flushPromises();
  expect(wrapper.get('#post-title').element.value).toBe('');
  expect(storage.save).not.toHaveBeenCalled();
});
it('route navigation uses the same three choices and continues only after the decision', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: {
          components: { PostCreateModal },
          template: '<PostCreateModal :model-value="true" />',
        },
      },
      { path: '/elsewhere', component: { template: '<p>别的页面</p>' } },
    ],
  });
  await router.push('/');
  const wrapper = mount(
    { template: '<router-view />' },
    { global: { plugins: [router], stubs } },
  );
  wrappers.push(wrapper);
  await flushPromises();
  await wrapper.get('#post-title').setValue('路由切换草稿');
  const leaving = router.push('/elsewhere');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/');
  await button(wrapper, '不保存').trigger('click');
  await leaving;
  expect(router.currentRoute.value.path).toBe('/elsewhere');
  expect(storage.save).not.toHaveBeenCalled();
});

it('consuming the draft command retains its editor; query navigation still asks before remounting', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/community',
        name: 'community',
        component: {
          components: { PostCreateModal },
          template: '<PostCreateModal :model-value="true" />',
        },
      },
    ],
  });
  await router.push('/community?action=new');
  const wrapper = mount(
    {
      setup: () => ({ pageIdentity }),
      template:
        '<router-view v-slot="{ Component, route }"><component :is="Component" :key="pageIdentity(route)" /></router-view>',
    },
    { global: { plugins: [router], stubs } },
  );
  wrappers.push(wrapper);
  await flushPromises();
  await wrapper.get('#post-title').setValue('入口草稿');
  const input = wrapper.get('#post-title').element;
  await router.replace('/community');
  expect(wrapper.get('#post-title').element).toBe(input);
  expect(input.value).toBe('入口草稿');
  const changing = router.push('/community?tab=favorites');
  await flushPromises();
  expect(router.currentRoute.value.query.tab).toBeUndefined();
  expect(button(wrapper, '保存草稿')).toBeDefined();
  await button(wrapper, '不保存').trigger('click');
  await changing;
  expect(router.currentRoute.value.query.tab).toBe('favorites');
});
