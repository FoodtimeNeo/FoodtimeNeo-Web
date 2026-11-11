import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { useAuthStore } from '@/store/useAuthStore.js';
import CatalogImageManager from './CatalogImageManager.vue';
const api = vi.hoisted(() => ({
  fetchManagedImages: vi.fn(),
  addManagedImage: vi.fn(),
  deleteManagedImage: vi.fn(),
}));
const upload = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/api/admin-manage.api.js', () => api);
vi.mock('@/api/submission.api.js', () => ({ uploadImage: upload }));
vi.mock('element-plus', async (original) => ({
  ...(await original()),
  ElMessageBox: { confirm },
}));
beforeEach(() => {
  setActivePinia(createPinia());
  useAuthStore().user = { id: 'root', role: 'superadmin' };
  vi.clearAllMocks();
  api.fetchManagedImages.mockResolvedValue({
    items: [{ id: 'image', imageUrl: '/api/v1/media/photo' }],
    total: 1,
  });
});
it('移除所选图片前要求确认，并局部刷新图片列表', async () => {
  const wrapper = mount(CatalogImageManager, {
    props: { type: 'stalls', id: 'stall' },
    global: { stubs: { MediaImage: true, ImageFileField: true } },
  });
  await flushPromises();
  confirm.mockRejectedValueOnce('cancel');
  await wrapper.get('li button').trigger('click');
  await flushPromises();
  expect(api.deleteManagedImage).not.toHaveBeenCalled();
  confirm.mockResolvedValue(true);
  api.deleteManagedImage.mockResolvedValue(undefined);
  api.fetchManagedImages.mockResolvedValueOnce({ items: [], total: 0 });
  await wrapper.get('li button').trigger('click');
  await flushPromises();
  expect(api.deleteManagedImage).toHaveBeenCalledExactlyOnceWith(
    'stalls',
    'stall',
    'image',
  );
  expect(wrapper.emitted('changed')).toHaveLength(1);
  expect(wrapper.text()).toContain('暂未添加图片');
  wrapper.unmount();
});
it('上传期间切换账号后不将旧账号的图片关联到目录', async () => {
  const wrapper = mount(CatalogImageManager, {
    props: { type: 'dishes', id: 'dish' },
    global: { stubs: { MediaImage: true, ImageFileField: true } },
  });
  await flushPromises();
  let finish;
  upload.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  wrapper
    .findComponent({ name: 'ImageFileField' })
    .vm.$emit('change', new File(['x'], 'photo.jpg'));
  await flushPromises();
  await wrapper.get('.button-ink').trigger('click');
  useAuthStore().user = { id: 'other', role: 'superadmin' };
  finish({ imageUrl: '/api/v1/media/old-upload' });
  await flushPromises();
  expect(api.addManagedImage).not.toHaveBeenCalled();
  wrapper.unmount();
});
