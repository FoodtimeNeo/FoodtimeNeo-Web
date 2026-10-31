import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppFooter from './AppFooter.vue';

describe('AppFooter', () => {
  it('展示页脚标语并包含指向官网的链接', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/landing',
          name: 'landing',
          component: { template: '<div />' },
        },
      ],
    });

    const wrapper = mount(AppFooter, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain('北交干饭吧');
    const portalLink = wrapper.find('.app-footer__portal-link');
    expect(portalLink.exists()).toBe(true);
    expect(portalLink.text()).toContain('进入官网');
    expect(portalLink.attributes('href')).toBe('/landing');
  });
});
