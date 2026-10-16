import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CatalogSearch from './CatalogSearch.vue';

describe('目录搜索交互', () => {
  it('关联标签与结果计数，支持键盘清除且不提交请求', async () => {
    const wrapper = mount(CatalogSearch, {
      props: {
        modelValue: '排骨',
        label: '搜索菜品',
        count: 2,
        total: 10,
        unit: '道菜品',
      },
    });
    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('input').attributes('id'),
    );
    expect(wrapper.get('[role="status"]').text()).toBe('找到 2 / 10 道菜品');
    await wrapper.get('input').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
  });
});
