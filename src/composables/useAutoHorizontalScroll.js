import { onMounted, onUnmounted, unref } from 'vue';

/**
 * 为横向溢出容器提供平滑自动滚动，并在鼠标悬浮或拖拽时暂停。
 * @param {import('vue').Ref<HTMLElement|null>} targetRef 容器引用
 * @param {Object} [options] 配置项
 * @param {number} [options.speed=14] 滚动速度（像素/秒）
 * @param {import('vue').Ref<boolean>|boolean} [options.pauseWhen] 外部暂停信号（如拖拽中）
 * @param {import('vue').Ref<number>|number} [options.loopItemCount] 原始循环项数量
 * @param {boolean} [options.pauseOnHover=true] 鼠标悬停时暂停
 * @param {boolean} [options.pauseOnTouch=true] 粗指针/触控设备时暂停
 * @returns {{ pause: () => void, resume: () => void }}
 */
export function useAutoHorizontalScroll(targetRef, options = {}) {
  const speed = Number(options.speed ?? 14);
  const pauseOnHover = options.pauseOnHover ?? true;
  const pauseOnTouch = options.pauseOnTouch ?? true;
  let frameId = 0;
  let lastTime = 0;
  let isPausedByApi = false;
  let isPausedByHover = false;
  let isFocusInside = false;
  let reducedMotionQuery = null;
  let coarsePointerQuery = null;

  function shouldPause() {
    return (
      isPausedByApi ||
      isPausedByHover ||
      isFocusInside ||
      Boolean(unref(options.pauseWhen)) ||
      Boolean(reducedMotionQuery?.matches) ||
      (pauseOnTouch && Boolean(coarsePointerQuery?.matches))
    );
  }

  function getFrameApi() {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      return null;
    }

    return {
      request: window.requestAnimationFrame.bind(window),
      cancel: window.cancelAnimationFrame.bind(window),
    };
  }

  function getLoopDistance(target) {
    const loopItemCount = Math.max(
      0,
      Number(unref(options.loopItemCount) ?? 0),
    );
    const firstLoopItem = target.children[0];
    const secondLoopItem = target.children[loopItemCount];

    if (loopItemCount > 0 && firstLoopItem && secondLoopItem) {
      const loopDistance = secondLoopItem.offsetLeft - firstLoopItem.offsetLeft;
      if (Number.isFinite(loopDistance) && loopDistance > 1) {
        return loopDistance;
      }
    }

    const fallbackDistance = target.scrollWidth - target.clientWidth;
    return Number.isFinite(fallbackDistance)
      ? Math.max(0, fallbackDistance)
      : 0;
  }

  function step(time) {
    const frameApi = getFrameApi();
    if (!frameApi) {
      return;
    }

    frameId = frameApi.request(step);
    const target = targetRef.value;
    if (!target) {
      lastTime = time;
      return;
    }

    const loopDistance = getLoopDistance(target);
    if (loopDistance <= 1 || shouldPause()) {
      lastTime = time;
      return;
    }

    const deltaSeconds = Math.min((time - lastTime) / 1000, 0.08);
    target.scrollLeft += speed * deltaSeconds;

    if (target.scrollLeft >= loopDistance) {
      target.scrollLeft -= loopDistance;
    }

    lastTime = time;
  }

  function start() {
    const frameApi = getFrameApi();
    if (!frameApi || frameId) {
      return;
    }

    lastTime = typeof performance !== 'undefined' ? performance.now() : 0;
    frameId = frameApi.request(step);
  }

  function stop() {
    const frameApi = getFrameApi();
    if (frameApi && frameId) {
      frameApi.cancel(frameId);
      frameId = 0;
    }
  }

  function onPointerEnter() {
    if (pauseOnHover) {
      isPausedByHover = true;
    }
  }

  function onPointerLeave() {
    if (pauseOnHover) {
      isPausedByHover = false;
    }
  }

  function onFocusIn() {
    isFocusInside = true;
  }

  function onFocusOut() {
    isFocusInside = false;
  }

  onMounted(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      );
      coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    }

    const target = targetRef.value;
    if (target) {
      target.addEventListener('pointerenter', onPointerEnter);
      target.addEventListener('pointerleave', onPointerLeave);
      target.addEventListener('focusin', onFocusIn);
      target.addEventListener('focusout', onFocusOut);
    }

    start();
  });

  onUnmounted(() => {
    stop();
    const target = targetRef.value;
    if (target) {
      target.removeEventListener('pointerenter', onPointerEnter);
      target.removeEventListener('pointerleave', onPointerLeave);
      target.removeEventListener('focusin', onFocusIn);
      target.removeEventListener('focusout', onFocusOut);
    }
  });

  return {
    pause() {
      isPausedByApi = true;
    },
    resume() {
      isPausedByApi = false;
    },
  };
}
