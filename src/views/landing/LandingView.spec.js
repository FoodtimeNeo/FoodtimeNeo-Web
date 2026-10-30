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

describe('LandingView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockReset();
  });

  it('渲染官网核心标题与交大干饭专线隐喻', () => {
    const wrapper = mount(LandingView);
    expect(wrapper.text()).toContain('北交干饭吧');
    expect(wrapper.text()).toContain('交大干饭专线');
    expect(wrapper.text()).toContain('全校食堂');
  });

  it('包含明显的“下载安卓安装包”下载按钮，且链接属性正确', () => {
    const wrapper = mount(LandingView);
    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    expect(heroBtn.exists()).toBe(true);
    expect(heroBtn.attributes('href')).toBe(
      '/downloads/FoodtimeNeo-Android.apk',
    );
    expect(heroBtn.attributes('download')).toBe('FoodtimeNeo-Android.apk');
    expect(heroBtn.text()).toContain('下载安卓安装包');

    // 检查导航栏与底部的下载按钮
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

  it('点击下载按钮时展示下载反馈 Toast', async () => {
    const wrapper = mount(LandingView);
    expect(wrapper.find('[data-testid="download-toast"]').exists()).toBe(false);

    const heroBtn = wrapper.find('[data-testid="hero-download-btn"]');
    await heroBtn.trigger('click');

    const toast = wrapper.find('[data-testid="download-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain('正在开始下载安卓安装包');
  });

  it('支持在校园专线站点之间交互切换', async () => {
    const wrapper = mount(LandingView);
    const stationTabs = wrapper.findAll('.station-node');
    expect(stationTabs.length).toBeGreaterThanOrEqual(4);

    // 初始第一个选中
    expect(stationTabs[0].classes()).toContain('is-active');

    // 点击第二个站点（第一食堂站）
    await stationTabs[1].trigger('click');
    expect(stationTabs[1].classes()).toContain('is-active');
    expect(wrapper.find('.station-heading').text()).toContain('第一食堂站');
  });

  it('FAQ 问答卡片支持点击折叠与展开', async () => {
    const wrapper = mount(LandingView);
    const faqButtons = wrapper.findAll('.faq-question');
    expect(faqButtons.length).toBeGreaterThan(0);

    // 点击第二个折叠的 FAQ
    await faqButtons[1].trigger('click');
    const faqItem = wrapper.findAll('.faq-item')[1];
    expect(faqItem.classes()).toContain('is-open');
  });

  it('点击网页版入口时，未登录跳转至登录页', async () => {
    const wrapper = mount(LandingView);
    const enterWebBtn = wrapper.find('[data-testid="enter-web-btn"]');
    await enterWebBtn.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });
});
