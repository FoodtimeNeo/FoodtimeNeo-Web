import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import MySubmissionsView from './MySubmissionsView.vue';

const api = vi.hoisted(() => ({ fetchOwnSubmissions: vi.fn() }));
vi.mock('@/api/profile.api.js', () => api);
const host = defineComponent({
  components: { RouterView },
  template:
    '<RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.fullPath" /></RouterView>',
});
let wrapper;
async function open(query = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/profile/submissions',
        name: 'mySubmissions',
        component: MySubmissionsView,
      },
      {
        path: '/profile',
        name: 'profile',
        component: { template: '<p>我的</p>' },
      },
      {
        path: '/canteens',
        name: 'canteenList',
        component: { template: '<p>食堂</p>' },
      },
    ],
  });
  await router.push({ name: 'mySubmissions', query });
  await router.isReady();
  wrapper = mount(host, { global: { plugins: [router] } });
  await flushPromises();
  return router;
}
beforeEach(() => {
  api.fetchOwnSubmissions
    .mockReset()
    .mockResolvedValue({ items: [], total: 0, size: 20 });
});
afterEach(() => wrapper?.unmount());

describe('投稿类型与页面地址', () => {
  it('直接打开图片类型读取图片记录，刷新后仍保持类型', async () => {
    const router = await open({ kind: 'photo' });
    expect(wrapper.get('select').element.value).toBe('photo');
    expect(api.fetchOwnSubmissions).toHaveBeenLastCalledWith(
      'photo',
      1,
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('暂无图片投稿记录');
    expect(wrapper.get('a[href="/canteens"]').text()).toBe('去逛食堂');
    const query = { ...router.currentRoute.value.query };
    wrapper.unmount();
    await open(query);
    expect(wrapper.get('select').element.value).toBe('photo');
  });

  it.each([
    { kind: 'unknown' },
    { kind: ['photo', 'dish'] },
    { kind: '__proto__' },
  ])('非法类型安全回退到点评：%o', async (query) => {
    await open(query);
    expect(api.fetchOwnSubmissions).toHaveBeenCalledOnce();
    expect(api.fetchOwnSubmissions).toHaveBeenCalledWith(
      'review',
      1,
      expect.any(Object),
    );
  });

  it('从第二页切换类型更新地址并只读取新类型第一页', async () => {
    api.fetchOwnSubmissions.mockResolvedValue({
      items: [{ id: 'r1', name: '点评' }],
      total: 21,
      size: 20,
    });
    const router = await open();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '下一页')
      .trigger('click');
    await flushPromises();
    expect(api.fetchOwnSubmissions).toHaveBeenLastCalledWith(
      'review',
      2,
      expect.any(Object),
    );
    api.fetchOwnSubmissions
      .mockClear()
      .mockResolvedValue({ items: [], total: 0, size: 20 });
    await wrapper.get('select').setValue('dish');
    await flushPromises();
    expect(router.currentRoute.value.query.kind).toBe('dish');
    expect(api.fetchOwnSubmissions).toHaveBeenCalledOnce();
    expect(api.fetchOwnSubmissions).toHaveBeenCalledWith(
      'dish',
      1,
      expect.any(Object),
    );
    expect(wrapper.find('nav[aria-label="分页"]').exists()).toBe(false);
  });
});
