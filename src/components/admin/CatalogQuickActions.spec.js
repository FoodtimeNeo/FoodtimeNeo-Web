import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { useAuthStore } from '@/store/useAuthStore.js';
import CatalogQuickActions from './CatalogQuickActions.vue';
const api = vi.hoisted(() => ({
  fetchManagedItem: vi.fn(),
  deleteManagedItem: vi.fn(),
}));
const replace = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/api/admin-manage.api.js', () => api);
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }));
vi.mock('element-plus', async (original) => ({
  ...(await original()),
  ElMessageBox: { confirm },
}));
function render(role = 'superadmin') {
  const auth = useAuthStore();
  auth.user = { id: 'root', role };
  return mount(CatalogQuickActions, {
    props: { type: 'dishes', id: 'dish', backTo: { name: 'stallDetail' } },
    global: {
      stubs: {
        ElDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue" role="dialog"><slot /></div>',
        },
        CatalogEditorForm: true,
        CatalogImageManager: true,
      },
    },
  });
}
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  api.fetchManagedItem.mockResolvedValue({
    id: 'dish',
    name: '面',
    status: 'active',
  });
});
it('普通用户和管理员没有快捷管理入口，也不读取管理接口', () => {
  for (const role of ['user', 'admin']) {
    const wrapper = render(role);
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.unmount();
  }
  expect(api.fetchManagedItem).not.toHaveBeenCalled();
});
it('超级管理员在详情页打开对应记录，取消删除不请求，关联冲突保留面板', async () => {
  const wrapper = render();
  expect(api.fetchManagedItem).not.toHaveBeenCalled();
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(api.fetchManagedItem).toHaveBeenCalledWith('dishes', 'dish');
  confirm.mockRejectedValueOnce('cancel');
  await wrapper.get('.catalog-quick-actions__delete').trigger('click');
  await flushPromises();
  expect(api.deleteManagedItem).not.toHaveBeenCalled();
  confirm.mockResolvedValueOnce(true);
  api.deleteManagedItem.mockRejectedValueOnce(
    new Error('仍有关联记录，请先停用'),
  );
  await wrapper.get('.catalog-quick-actions__delete').trigger('click');
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('请先停用');
  expect(replace).not.toHaveBeenCalled();
  useAuthStore().user = { id: 'student', role: 'user' };
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  wrapper.unmount();
});
