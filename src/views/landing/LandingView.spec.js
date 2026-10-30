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

describe('LandingView (Single-Screen High-end Redesign)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
  });

  it('渲染单屏官网核心品牌标语与主要标题', () => {
    const wrapper = mount(LandingView);
    expect(wrapper.text()).toContain('北交干饭吧');
    expect(wrapper.text()).toContain('掌上美食指南');
    expect(wrapper.text()).toContain('安卓官方客户端');
  });

  it('包含显眼的“下载安卓安装包”下载按钮，且真实下载属性完整', () => {
    const wrapper = mount(LandingView);
    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    expect(heroBtn.exists()).toBe(true);
    expect(heroBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk',
    );
    expect(heroBtn.attributes('download')).toBe('FoodtimeNeo-Android.apk');
    expect(heroBtn.text()).toContain('下载安卓安装包');

    // 顶栏与底栏的下载链接
    const navBtn = wrapper.find('[data-testid="nav-download-btn"]');
    expect(navBtn.exists()).toBe(true);
    expect(navBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk',
    );

    const bottomBtn = wrapper.find('[data-testid="bottom-download-btn"]');
    expect(bottomBtn.exists()).toBe(true);
    expect(bottomBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk',
    );
  });

  it('渲染 3D 拟物机身并内嵌大模型真实 UI 截图', () => {
    const wrapper = mount(LandingView);
    const screenImg = wrapper.find('.screen-render-img');
    expect(screenImg.exists()).toBe(true);
    expect(screenImg.attributes('alt')).toBe('北交干饭吧客户端界面');

    // 包含扫码微卡
    const qrCard = wrapper.find('[data-testid="qr-float-card"]');
    expect(qrCard.exists()).toBe(true);
    expect(qrCard.text()).toContain('手机扫码下载');
  });

  it('点击下载按钮时展示下载反馈 Toast', async () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('[data-testid="download-toast"]').exists()).toBe(false);

    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    await heroBtn.trigger('click');

    const toast = wrapper.find('[data-testid="download-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain('已启动安装包下载');
  });

  it('点击网页版入口时，未登录跳转至登录页', async () => {
    const wrapper = mount(LandingView);
    const enterWebBtn = wrapper.find('[data-testid="enter-web-btn"]');
    await enterWebBtn.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });

  it('支持鼠标在视口移动时动态更新 3D 视差变换', async () => {
    const wrapper = mount(LandingView);
    const viewport = wrapper.find('.landing-viewport');
    await viewport.trigger('mousemove', { clientX: 200, clientY: 100 });
    const stand = wrapper.find('.device-stand');
    expect(stand.attributes('style')).toContain('perspective(1200px)');
  });
});
