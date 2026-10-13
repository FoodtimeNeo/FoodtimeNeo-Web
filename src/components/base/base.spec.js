import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PaperCard from './PaperCard.vue';
import InkButton from './InkButton.vue';
import StampBadge from './StampBadge.vue';
import WashiTape from './WashiTape.vue';

describe('基础组件', () => {
  it('纸张卡片显示默认插槽并切换纸色', () => {
    const wrapper = mount(PaperCard, {
      props: { variant: 'warm' },
      slots: { default: '本周菜单' },
    });
    expect(wrapper.text()).toBe('本周菜单');
    expect(wrapper.classes()).toContain('paper-card--warm');
  });

  it('墨色按钮发出点击事件，禁用后不能点击', async () => {
    const wrapper = mount(InkButton, { slots: { default: '查看' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.text()).toBe('查看');

    await wrapper.setProps({ disabled: true });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.element.disabled).toBe(true);
  });

  it('印章显示插槽并可选择蓝色', () => {
    const wrapper = mount(StampBadge, {
      props: { tone: 'blue' },
      slots: { default: '推荐' },
    });
    expect(wrapper.text()).toBe('推荐');
    expect(wrapper.classes()).toContain('stamp-badge--blue');
  });

  it('纸胶带仅作为装饰', () => {
    const wrapper = mount(WashiTape, { props: { color: 'blue' } });
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(wrapper.classes()).toContain('washi-tape--blue');
  });
});
