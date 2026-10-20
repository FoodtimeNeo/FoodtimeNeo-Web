import { ref } from 'vue';

/**
 * 提供横向滚动容器的鼠标与指针拖拽滚动能力。
 * @param {import('vue').Ref<HTMLElement|null>} targetRef 滚动容器引用
 * @returns {Object} 拖拽状态与 pointer 事件处理方法
 */
export function useDragScroll(targetRef) {
  const DRAG_THRESHOLD = 6;
  const isDragging = ref(false);
  const wasDragged = ref(false);
  let startX = 0;
  let startScrollLeft = 0;
  let activePointerId = null;
  let hasCapturedPointer = false;

  function resetDragState(pointerId = null) {
    const target = targetRef.value;
    if (
      target &&
      hasCapturedPointer &&
      pointerId !== null &&
      target.hasPointerCapture?.(pointerId)
    ) {
      target.releasePointerCapture(pointerId);
    }

    isDragging.value = false;
    activePointerId = null;
    hasCapturedPointer = false;
  }

  function onPointerDown(event) {
    const target = targetRef.value;
    if (!target || event.button > 0) {
      return;
    }

    isDragging.value = true;
    wasDragged.value = false;
    startX = event.clientX;
    startScrollLeft = target.scrollLeft;
    activePointerId = event.pointerId;
    hasCapturedPointer = false;
  }

  function onPointerMove(event) {
    const target = targetRef.value;
    if (!target || !isDragging.value || event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - startX;
    if (!wasDragged.value && Math.abs(deltaX) <= DRAG_THRESHOLD) {
      return;
    }

    if (!hasCapturedPointer) {
      target.setPointerCapture?.(event.pointerId);
      hasCapturedPointer = true;
    }

    wasDragged.value = true;
    event.preventDefault();
    target.scrollLeft = startScrollLeft - deltaX;
  }

  function onPointerEnd(event) {
    if (!isDragging.value || event.pointerId !== activePointerId) {
      return;
    }

    resetDragState(event.pointerId);
  }

  function onPointerLeave() {
    if (!isDragging.value) {
      return;
    }

    resetDragState(activePointerId);
  }

  function onLostPointerCapture(event) {
    if (!isDragging.value || event.pointerId !== activePointerId) {
      return;
    }

    resetDragState(event.pointerId);
  }

  return {
    isDragging,
    wasDragged,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onPointerLeave,
    onLostPointerCapture,
  };
}
