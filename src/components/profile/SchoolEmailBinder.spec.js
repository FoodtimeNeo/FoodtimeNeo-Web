import { expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
vi.mock('@/api/school-email.api.js', () => ({
  bindSchoolEmail: vi.fn(),
  sendSchoolEmailCode: vi.fn(),
}));
import SchoolEmailBinder from './SchoolEmailBinder.vue';
it.each(['user', 'visitor'])(
  '绑定入口保留邮箱验证，不再根据 %s 角色描述互动权限',
  async (role) => {
    setActivePinia(createPinia());
    useAuthStore().setSession({
      user: { id: 'owner', email: 'member@gmail.com', role },
    });
    const view = mount(SchoolEmailBinder);
    expect(view.text()).not.toContain('只读访客');
    expect(view.find('input[type=email]').exists()).toBe(true);
    const send = view
      .findAll('button')
      .find((button) => button.text() === '发送验证码');
    expect(send.attributes('disabled')).toBeDefined();
    await view.get('input[type=email]').setValue('20260001@bjtu.edu.cn');
    expect(send.attributes('disabled')).toBeUndefined();
    view.unmount();
  },
);
