import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState.vue';
import EmptyState from './EmptyState.vue';
import ErrorState from './ErrorState.vue';

describe('内容状态组件', () => {
  it('加载态向辅助技术报告状态', () => {
    const wrapper = mount(LoadingState, {
      props: { message: '正在读取食堂' },
    });
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.text()).toContain('正在读取食堂');
  });

  it('空态显示说明与可选操作插槽', () => {
    const wrapper = mount(EmptyState, {
      props: { title: '暂无菜品', description: '稍后再来' },
      slots: { default: '<a href="/">回首页</a>' },
    });
    expect(wrapper.text()).toContain('暂无菜品');
    expect(wrapper.text()).toContain('稍后再来');
    expect(wrapper.find('a').attributes('href')).toBe('/');
  });

  it('错误态点击重试只发出一次 retry', async () => {
    const wrapper = mount(ErrorState);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
    expect(wrapper.attributes('role')).toBe('alert');
  });
});
