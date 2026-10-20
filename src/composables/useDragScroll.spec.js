import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useDragScroll } from './useDragScroll.js';

describe('useDragScroll', () => {
  it('初始状态未拖拽', () => {
    const elRef = ref(null);
    const { isDragging, wasDragged } = useDragScroll(elRef);
    expect(isDragging.value).toBe(false);
    expect(wasDragged.value).toBe(false);
  });

  it('超过阈值判定为拖拽并滚动元素', () => {
    const mockEl = {
      scrollLeft: 10,
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      hasPointerCapture: () => true,
    };
    const elRef = ref(mockEl);
    const {
      isDragging,
      wasDragged,
      onPointerDown,
      onPointerMove,
      onPointerEnd,
    } = useDragScroll(elRef);

    // pointerdown
    onPointerDown({
      button: 0,
      clientX: 100,
      pointerId: 1,
    });
    expect(isDragging.value).toBe(true);
    expect(wasDragged.value).toBe(false);

    // 小幅移动不超过 6px 阈值
    onPointerMove({
      clientX: 103,
      pointerId: 1,
      preventDefault: () => {},
    });
    expect(wasDragged.value).toBe(false);
    expect(mockEl.scrollLeft).toBe(10);

    // 大幅移动超过阈值
    onPointerMove({
      clientX: 80,
      pointerId: 1,
      preventDefault: () => {},
    });
    expect(wasDragged.value).toBe(true);
    // startScrollLeft (10) - deltaX (-20) = 30
    expect(mockEl.scrollLeft).toBe(30);

    // pointerup
    onPointerEnd({ pointerId: 1 });
    expect(isDragging.value).toBe(false);
    expect(wasDragged.value).toBe(true);
  });
});
