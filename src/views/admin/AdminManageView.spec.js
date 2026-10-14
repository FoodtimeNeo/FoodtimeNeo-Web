import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const api = vi.hoisted(() => ({
  fetchManagedCanteens: vi.fn(),
  fetchManagedStalls: vi.fn(),
  saveCanteen: vi.fn(),
  saveStall: vi.fn(),
  saveDish: vi.fn(),
  deleteCanteen: vi.fn(),
  deleteStall: vi.fn(),
  deleteDish: vi.fn(),
}));
const message = vi.hoisted(() => ({
  success: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/api/admin-manage.api.js', () => api);
vi.mock('element-plus', () => ({
  ElMessage: { success: message.success },
  ElMessageBox: { confirm: message.confirm },
}));

import AdminManageView from './AdminManageView.vue';

function button(wrapper, label) {
  return wrapper.findAll('button').find((item) => item.text() === label);
}

describe('AdminManageView', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    message.success.mockReset();
    message.confirm.mockReset();
    api.fetchManagedCanteens.mockResolvedValue([{ id: 'c1', name: '一食堂' }]);
    api.fetchManagedStalls.mockResolvedValue([
      {
        id: 's1',
        name: '面档',
        canteenId: 'c1',
        dishes: [{ id: 'd1', name: '牛肉面', price: 12 }],
      },
    ]);
    api.saveCanteen.mockResolvedValue({ id: 'c2' });
    api.saveStall.mockResolvedValue({ id: 's2' });
    api.saveDish.mockResolvedValue({ id: 'd2' });
    api.deleteDish.mockResolvedValue({});
  });

  it('按食堂、档口、菜品展示层级数据', async () => {
    const wrapper = mount(AdminManageView);
    await flushPromises();
    expect(wrapper.text()).toContain('一食堂');
    await button(wrapper, '档口').trigger('click');
    await flushPromises();
    expect(api.fetchManagedStalls).toHaveBeenCalledWith('c1');
    expect(wrapper.text()).toContain('面档');
    await button(wrapper, '菜品').trigger('click');
    expect(wrapper.text()).toContain('牛肉面');
  });

  it('阻止空名称和负价格，并仅发送一次合法新增请求', async () => {
    let resolveSave;
    api.saveDish.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const wrapper = mount(AdminManageView);
    await flushPromises();
    await button(wrapper, '菜品').trigger('click');
    await button(wrapper, '新增').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('名称');
    await wrapper.get('#manage-name').setValue('红烧肉');
    await wrapper.get('#manage-price').setValue('-1');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('价格');
    expect(api.saveDish).not.toHaveBeenCalled();
    await wrapper.get('#manage-price').setValue('18.5');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(api.saveDish).toHaveBeenCalledTimes(1);
    expect(api.saveDish).toHaveBeenCalledWith('', {
      name: '红烧肉',
      price: 18.5,
      value_note: '',
      description: '',
      canteen_id: 'c1',
      stall_id: 's1',
    });
    resolveSave({ id: 'd2' });
    await flushPromises();
    expect(message.success).toHaveBeenCalledWith('创建成功');
  });

  it('编辑时只发送该实体字段，保存后刷新列表', async () => {
    const wrapper = mount(AdminManageView);
    await flushPromises();
    await button(wrapper, '档口').trigger('click');
    await flushPromises();
    await button(wrapper, '编辑').trigger('click');
    await wrapper.get('#manage-name').setValue('新面档');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(api.saveStall).toHaveBeenCalledWith('c1', 's1', {
      name: '新面档',
      avg_price: '',
      summary: '',
    });
    expect(api.fetchManagedStalls).toHaveBeenCalledTimes(2);
  });

  it('删除先二次确认，取消不发送请求，确认后刷新', async () => {
    const wrapper = mount(AdminManageView);
    await flushPromises();
    await button(wrapper, '菜品').trigger('click');
    message.confirm.mockRejectedValueOnce(new Error('cancel'));
    await button(wrapper, '删除').trigger('click');
    await flushPromises();
    expect(api.deleteDish).not.toHaveBeenCalled();
    message.confirm.mockResolvedValueOnce('confirm');
    await button(wrapper, '删除').trigger('click');
    await flushPromises();
    expect(message.confirm).toHaveBeenCalledTimes(2);
    expect(api.deleteDish).toHaveBeenCalledWith('d1');
    expect(api.fetchManagedStalls).toHaveBeenCalledTimes(2);
  });

  it('列表请求失败时显示错误并可重试', async () => {
    api.fetchManagedCanteens.mockRejectedValueOnce(new Error('加载失败'));
    const wrapper = mount(AdminManageView);
    await flushPromises();
    expect(wrapper.text()).toContain('加载失败');
    await button(wrapper, '重试').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('一食堂');
  });
});
