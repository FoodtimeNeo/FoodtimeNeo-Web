import { computed, onScopeDispose, ref, watch } from 'vue';

/** Share drag tracking and settling between the inline and full-screen galleries. */
export function useImageCarousel({ images, viewport, index, onChange }) {
  const currentIndex = ref(index?.() || 0);
  const track = ref(null);
  const offset = ref(0);
  const dragging = ref(false);
  const settling = ref(false);
  const retained = ref([]);
  let start;
  let timer;
  let suppressClick = false;
  const trackStyle = computed(() => ({
    transform: offset.value
      ? `translateX(calc(-${currentIndex.value * 100}% + ${offset.value}px))`
      : `translateX(-${currentIndex.value * 100}%)`,
  }));

  function settled() {
    window.clearTimeout(timer);
    settling.value = false;
    retained.value = [];
  }

  function animateTo(next, notify = true) {
    const bounded = Math.max(0, Math.min(images().length - 1, next));
    if (!images().length) return;
    retained.value = [...new Set([...retained.value, currentIndex.value])];
    dragging.value = false;
    settling.value = true;
    offset.value = 0;
    if (bounded !== currentIndex.value) {
      currentIndex.value = bounded;
      if (notify) onChange?.(bounded);
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(settled, 340);
  }

  function begin(x, y) {
    const width =
      viewport.value?.clientWidth ||
      viewport.value?.getBoundingClientRect().width ||
      0;
    // A new gesture can take over an in-flight animation without jumping to its target.
    let initial = 0;
    if (settling.value && track.value && width) {
      const matrix = getComputedStyle(track.value).transform;
      if (matrix.startsWith('matrix('))
        initial =
          Number(matrix.slice(7, -1).split(',')[4]) +
          currentIndex.value * width;
      else if (matrix.startsWith('matrix3d('))
        initial =
          Number(matrix.slice(9, -1).split(',')[12]) +
          currentIndex.value * width;
    }
    window.clearTimeout(timer);
    settling.value = false;
    offset.value = initial;
    dragging.value = Boolean(initial);
    start = { x, y, width, initial, axis: '' };
    suppressClick = false;
  }

  function move(x, y) {
    if (!start) return false;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.hypot(dx, dy) > 8) suppressClick = true;
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8)
      start.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (start.axis !== 'x' || images().length < 2) return false;
    const distance = start.initial + dx;
    const atEdge =
      (currentIndex.value === 0 && distance > 0) ||
      (currentIndex.value === images().length - 1 && distance < 0);
    const limit = start.width || Math.abs(distance);
    offset.value =
      Math.max(-limit, Math.min(limit, distance)) * (atEdge ? 0.25 : 1);
    dragging.value = true;
    return true;
  }

  function end() {
    if (!start) return;
    const threshold = Math.min(80, Math.max(40, start.width * 0.18));
    const direction =
      start.axis === 'x' && Math.abs(offset.value) > threshold
        ? offset.value < 0
          ? 1
          : -1
        : 0;
    start = null;
    if (dragging.value) animateTo(currentIndex.value + direction);
    else settled();
  }

  function cancel() {
    start = null;
    suppressClick = true;
    if (dragging.value) animateTo(currentIndex.value);
    else settled();
  }

  function reset(next = 0) {
    start = null;
    settled();
    offset.value = 0;
    dragging.value = false;
    currentIndex.value = next;
  }

  function nearCurrent(page) {
    const neighbor = currentIndex.value + (offset.value < 0 ? 1 : -1);
    return (
      page === currentIndex.value ||
      retained.value.includes(page) ||
      (dragging.value && page === neighbor) ||
      (Math.abs(page - currentIndex.value) === 1 &&
        !navigator.connection?.saveData &&
        !/2g/.test(navigator.connection?.effectiveType || ''))
    );
  }

  function consumeClick() {
    const suppressed = suppressClick;
    suppressClick = false;
    return suppressed;
  }

  if (index)
    watch(
      index,
      (next) => {
        if (next !== currentIndex.value) animateTo(next, false);
      },
      { flush: 'sync' },
    );
  onScopeDispose(() => window.clearTimeout(timer));
  return {
    currentIndex,
    track,
    trackStyle,
    dragging,
    settling,
    nearCurrent,
    begin,
    move,
    end,
    cancel,
    reset,
    goTo: animateTo,
    settled,
    consumeClick,
  };
}
