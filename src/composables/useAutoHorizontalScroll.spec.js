import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useAutoHorizontalScroll } from './useAutoHorizontalScroll.js';

describe('useAutoHorizontalScroll', () => {
  it('正确提供 pause 与 resume 接口，且无 target 时安全返回', () => {
    let controller = null;
    const Comp = defineComponent({
      setup() {
        const elRef = ref(null);
        controller = useAutoHorizontalScroll(elRef, { speed: 10 });
        return () => h('div', { ref: elRef });
      },
    });

    const wrapper = mount(Comp);
    expect(controller).not.toBeNull();
    expect(typeof controller.pause).toBe('function');
    expect(typeof controller.resume).toBe('function');

    controller.pause();
    controller.resume();
    wrapper.unmount();
  });
});
