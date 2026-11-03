import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import StarRatingInput from './StarRatingInput.vue';

describe('StarRatingInput', () => {
  it('点击高分连续点亮前面的星，降低评分同步熄灭多余的星', async () => {
    const wrapper = mount(StarRatingInput, {
      props: {
        modelValue: 0,
        'onUpdate:modelValue': (value) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    await wrapper.get('[aria-label="5 星"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(5);
    expect(wrapper.get('output').text()).toBe('5 / 5');
    await wrapper.get('[aria-label="3 星"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(3);
    expect(wrapper.findAll('path[fill="none"]')).toHaveLength(2);
    expect(wrapper.findAll('[aria-checked="true"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it('悬停预览连续点亮但不提交分数，移出后恢复已选分数', async () => {
    const wrapper = mount(StarRatingInput, { props: { modelValue: 2 } });
    await wrapper
      .get('[aria-label="4 星"]')
      .trigger('pointerenter', { pointerType: 'mouse' });
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(4);
    expect(wrapper.get('output').text()).toContain('预览 4 / 5');
    expect(wrapper.get('[aria-label="2 星"]').attributes('aria-checked')).toBe(
      'true',
    );
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await wrapper.get('[role="radiogroup"]').trigger('pointerleave');
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(2);
    expect(wrapper.get('output').text()).toBe('2 / 5');
    wrapper.unmount();
  });

  it('触屏不保留悬停预览，禁用时不产生高亮预览', async () => {
    const wrapper = mount(StarRatingInput, { props: { modelValue: 1 } });
    await wrapper
      .get('[aria-label="5 星"]')
      .trigger('pointerenter', { pointerType: 'touch' });
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(1);
    await wrapper.setProps({ disabled: true });
    await wrapper
      .get('[aria-label="4 星"]')
      .trigger('pointerenter', { pointerType: 'mouse' });
    expect(wrapper.findAll('path[fill="currentColor"]')).toHaveLength(1);
    wrapper.unmount();
  });
  it('点击星星时通过 v-model 事件输出 1–5 的整数评分', async () => {
    const wrapper = mount(StarRatingInput, { props: { modelValue: 0 } });
    await wrapper.get('[aria-label="4 星"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[4]]);
  });

  it('方向键、Home 和 End 可以调整评分', async () => {
    const wrapper = mount(StarRatingInput, { props: { modelValue: 3 } });
    const group = wrapper.get('[role="radiogroup"]');
    await group.trigger('keydown', { key: 'ArrowRight' });
    await group.trigger('keydown', { key: 'Home' });
    await group.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')).toEqual([[4], [1], [5]]);
  });

  it('禁用时不能改变评分', async () => {
    const wrapper = mount(StarRatingInput, {
      props: { modelValue: 2, disabled: true },
    });
    await wrapper.get('[aria-label="5 星"]').trigger('click');
    await wrapper
      .get('[role="radiogroup"]')
      .trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('方向键使真实焦点与选中的星级一致，首尾循环且支持Home/End', async () => {
    const wrapper = mount(StarRatingInput, {
      attachTo: document.body,
      props: {
        modelValue: 1,
        'onUpdate:modelValue': (value) =>
          wrapper.setProps({ modelValue: value }),
      },
    });
    const one = wrapper.get('[aria-label="1 星"]');
    one.element.focus();
    await one.trigger('keydown', { key: 'ArrowRight' });
    await flushPromises();
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="2 星"]').element,
    );
    expect(document.activeElement.getAttribute('aria-checked')).toBe('true');
    await wrapper.get('[aria-label="2 星"]').trigger('keydown', { key: 'End' });
    await flushPromises();
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="5 星"]').element,
    );
    await wrapper
      .get('[aria-label="5 星"]')
      .trigger('keydown', { key: 'ArrowRight' });
    await flushPromises();
    expect(document.activeElement).toBe(one.element);
    await one.trigger('keydown', { key: 'ArrowLeft' });
    await flushPromises();
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="5 星"]').element,
    );
    await wrapper
      .get('[aria-label="5 星"]')
      .trigger('keydown', { key: 'Home' });
    await flushPromises();
    expect(document.activeElement).toBe(one.element);
    wrapper.unmount();
  });
});
