import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PaginationControls from './PaginationControls.vue';

const numbered = (wrapper, page) =>
  wrapper.get(`button[aria-label="第 ${page} 页"]`);
describe('numbered pagination', () => {
  it('jumps 1 → 3 → 5 and back without an input', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 1, total: 400 },
    });
    await numbered(wrapper, 3).trigger('click');
    expect(wrapper.emitted('change').at(-1)).toEqual([3]);
    await wrapper.setProps({ page: 3 });
    await numbered(wrapper, 5).trigger('click');
    expect(wrapper.emitted('change').at(-1)).toEqual([5]);
    await wrapper.setProps({ page: 5 });
    await numbered(wrapper, 3).trigger('click');
    await wrapper.setProps({ page: 3 });
    await numbered(wrapper, 1).trigger('click');
    expect(wrapper.emitted('change').map(([page]) => page)).toEqual([
      3, 5, 3, 1,
    ]);
  });
  it('moves the visible window near the end and keeps the current page announced', () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 19, total: 400 },
    });
    expect(
      wrapper.findAll('.pagination__numbers button').map((b) => b.text()),
    ).toEqual(['16', '17', '18', '19', '20']);
    expect(numbered(wrapper, 19).attributes('aria-current')).toBe('page');
  });
  it('disables every jump while a request is pending', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 3, total: 400, disabled: true },
    });
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('disabled')).toBeDefined();
      await button.trigger('click');
    }
    expect(wrapper.emitted('change')).toBeUndefined();
  });
  it('never requests an invalid or unchanged page for an empty result', async () => {
    const wrapper = mount(PaginationControls, { props: { page: 1, total: 0 } });
    await numbered(wrapper, 1).trigger('click');
    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.text()).toContain('第 1 / 1 页 · 0 条');
  });
  it('offers direct first and last page navigation', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 5, total: 400 },
    });
    for (const label of ['首页', '末页'])
      await wrapper
        .findAll('button')
        .find((b) => b.text() === label)
        .trigger('click');
    expect(wrapper.emitted('change')).toEqual([[1], [20]]);
  });
});
