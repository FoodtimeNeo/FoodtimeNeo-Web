import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import SearchHighlight from './SearchHighlight.vue';
it('highlights repeated literal matches without rendering markup', () => {
  const wrapper = mount(SearchHighlight, {
    props: { text: '<img>牛肉牛肉', keyword: '牛肉' },
  });
  expect(wrapper.findAll('mark').map((node) => node.text())).toEqual([
    '牛肉',
    '牛肉',
  ]);
  expect(wrapper.find('img').exists()).toBe(false);
  expect(wrapper.text()).toBe('<img>牛肉牛肉');
  wrapper.unmount();
});
