import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const api = vi.hoisted(() => ({
  fetchManagedItems: vi.fn(),
  fetchManagedItem: vi.fn(),
  deleteManagedItem: vi.fn(),
  saveManagedItem: vi.fn(),
}));
vi.mock('@/api/admin-manage.api.js', () => api);
vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: { id: 'admin' } }),
}));
import AdminManageView from './AdminManageView.vue';
import CatalogEditor from '@/components/admin/CatalogEditor.vue';
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchManagedItems.mockResolvedValue({
    items: [{ id: 'h', name: '食堂', status: 'active' }],
    page: 1,
    size: 20,
    total: 1,
  });
});
it('删除有关联的目录时保留记录并显示服务端冲突', async () => {
  const wrapper = mount(AdminManageView);
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '删除')
    .trigger('click');
  api.deleteManagedItem.mockRejectedValueOnce(
    new Error('仍有关联记录，请先停用'),
  );
  await wrapper
    .findAll('button')
    .find((b) => b.text() === '确认删除')
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('仍有关联记录');
  expect(wrapper.text()).toContain('食堂');
  expect(api.deleteManagedItem).toHaveBeenCalledOnce();
});
it('编辑菜品固定原归属，零价允许保存，失败保留输入', async () => {
  const wrapper = mount(CatalogEditor, {
    props: {
      type: 'dishes',
      item: {
        id: 'd',
        parentId: 'original-stall',
        name: '面',
        description: '',
        price: 0,
        status: 'active',
      },
    },
  });
  expect(wrapper.find('select').element.value).toBe('active');
  api.saveManagedItem.mockRejectedValueOnce(new Error('保存冲突'));
  await wrapper.get('input[maxlength]').setValue('新面');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.saveManagedItem.mock.calls[0][2]).toMatchObject({
    parentId: 'original-stall',
    name: '新面',
    price: 0,
  });
  expect(wrapper.text()).toContain('保存冲突');
  expect(wrapper.get('input[maxlength]').element.value).toBe('新面');
  expect(wrapper.emitted('saved')).toBeUndefined();
});
