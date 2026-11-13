import { expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/store/useAuthStore.js';
vi.mock('@/api/school-email.api.js', () => ({
  bindSchoolEmail: vi.fn(),
  sendSchoolEmailCode: vi.fn(),
}));
import SchoolEmailBinder from './SchoolEmailBinder.vue';
it.each([
  ['user', '当前账号已可参与互动，学校邮箱绑定为可选认证。'],
  ['visitor', '当前为只读访客，绑定学校邮箱后可参与互动。'],
])('学校绑定提示跟随服务器返回的 %s 权限', (role, message) => {
  setActivePinia(createPinia());
  useAuthStore().setSession({
    user: { id: 'owner', email: 'member@gmail.com', role },
  });
  const view = mount(SchoolEmailBinder);
  expect(view.text()).toContain(message);
  expect(view.find('input[type=email]').exists()).toBe(true);
  view.unmount();
});
