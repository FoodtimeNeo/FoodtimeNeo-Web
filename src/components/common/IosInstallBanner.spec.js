import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import IosInstallBanner from './IosInstallBanner.vue';

const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

describe('IosInstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('在非 iOS 环境中默认不渲染', () => {
    const wrapper = mount(IosInstallBanner);
    expect(wrapper.find('[data-testid="ios-install-banner"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it('在 iOS Safari 非独立模式下展示，可展开步骤并关闭记录冷却', async () => {
    vi.stubGlobal('navigator', {
      userAgent: IPHONE_SAFARI_UA,
      standalone: false,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );

    const wrapper = mount(IosInstallBanner);
    expect(wrapper.find('[data-testid="ios-install-banner"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('保存到主屏幕');

    await wrapper.get('[data-testid="ios-banner-toggle"]').trigger('click');
    expect(wrapper.text()).toContain('添加到主屏幕');

    await wrapper.get('[data-testid="ios-banner-close"]').trigger('click');
    expect(wrapper.find('[data-testid="ios-install-banner"]').exists()).toBe(
      false,
    );
    expect(
      localStorage.getItem('foodtime-ios-install-dismissed-at'),
    ).toBeTruthy();
    wrapper.unmount();
  });

  it('在主屏幕独立模式下不再重复展示安装引导', () => {
    vi.stubGlobal('navigator', {
      userAgent: IPHONE_SAFARI_UA,
      standalone: true,
    });
    const wrapper = mount(IosInstallBanner);
    expect(wrapper.find('[data-testid="ios-install-banner"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });
});
