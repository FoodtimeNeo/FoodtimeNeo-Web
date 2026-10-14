import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StarRatingInput from './StarRatingInput.vue';

describe('StarRatingInput', () => {
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
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
