import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LandingView from './LandingView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/store/useAuthStore.js', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
  }),
}));

describe('LandingView (Zine Collage Style matching reference)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
  });

  it('渲染参考图手账核心大标题与标语', () => {
    const wrapper = mount(LandingView);
    expect(wrapper.text()).toContain('FoodTime Neo');
    expect(wrapper.text()).toContain('记录校园里的好味道');
    expect(wrapper.text()).toContain('下载');
    expect(wrapper.text()).toContain('FoodTime');
    expect(wrapper.text()).toContain('安卓版');
  });

  it('包含明显的“下载安卓安装包”下载按钮，且真实下载属性完整', () => {
    const wrapper = mount(LandingView);
    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    expect(heroBtn.exists()).toBe(true);
    expect(heroBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk?v=1.0.1-5',
    );
    expect(heroBtn.attributes('download')).toBe('FoodtimeNeo-Android.apk');
    expect(heroBtn.text()).toContain('下载安卓安装包');

    // 顶栏下载链接
    const navBtn = wrapper.find('[data-testid="nav-download-btn"]');
    expect(navBtn.exists()).toBe(true);
    expect(navBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk?v=1.0.1-5',
    );
  });

  it('渲染手机模型内部真实的 App 界面与食评内容', () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('.phone-screen-display').exists()).toBe(true);
    expect(wrapper.text()).toContain('第一食堂');
    expect(wrapper.text()).toContain('第二食堂');
    expect(wrapper.text()).toContain('吃货小明');
    expect(wrapper.text()).toContain('红烧肉');
  });

  it('渲染右侧黄色便签“Android APK”与圆形印章', () => {
    const wrapper = mount(LandingView);
    const stickyNote = wrapper.find('.yellow-sticky-note');
    expect(stickyNote.exists()).toBe(true);
    expect(stickyNote.text()).toContain('Android APK');
    expect(stickyNote.text()).toContain('校园美食指南');
    expect(wrapper.find('.circular-red-stamp').exists()).toBe(true);
  });

  it('渲染底部横跨的撕纸横幅文案与回形针', () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('.bottom-torn-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('今天吃什么，一眼找到');
    expect(wrapper.text()).toContain('这道值不值，一看就知道');
    expect(wrapper.text()).toContain('真实的点评');
    expect(wrapper.find('.paper-clip-decor').exists()).toBe(true);
  });

  it('点击“查看安装说明 ➔”可打开手账安装指南弹窗并关闭', async () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('.guide-modal-overlay').exists()).toBe(false);

    const guideBtn = wrapper.find('.install-guide-link');
    await guideBtn.trigger('click');
    expect(wrapper.find('.guide-modal-overlay').exists()).toBe(true);
    expect(wrapper.text()).toContain('安卓安装简明说明');

    // 点击关闭
    const closeBtn = wrapper.find('.guide-close-btn');
    await closeBtn.trigger('click');
    expect(wrapper.find('.guide-modal-overlay').exists()).toBe(false);
  });

  it('点击下载按钮时展示下载反馈 Toast', async () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('[data-testid="download-toast"]').exists()).toBe(false);

    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    await heroBtn.trigger('click');

    const toast = wrapper.find('[data-testid="download-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain('正在下载');
  });

  it('点击网页版入口时，未登录跳转至登录页', async () => {
    const wrapper = mount(LandingView);
    const enterWebBtn = wrapper.find('[data-testid="enter-web-btn"]');
    await enterWebBtn.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });
});
