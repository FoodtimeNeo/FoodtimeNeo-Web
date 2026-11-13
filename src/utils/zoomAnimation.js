/** 双击/键盘缩放动画的纯几何与缓动计算，供全屏看图复用。 */
export const ZOOM_DURATION_MS = 260;
export const MIN_SCALE = 1;
export const MAX_SCALE = 5;

export function clampScale(value) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

export function easeOutCubic(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return 1 - (1 - t) ** 3;
}

/**
 * 以画布中的触点为锚点计算目标变换；与现有 zoom() 的几何一致。
 * 返回值尚未做边界钳制，调用方在每帧/终点执行 moveWithinCanvas()。
 */
export function zoomTarget({ scale, x, y, rect, anchor, nextScale }) {
  const bounded = clampScale(nextScale);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const ratio = bounded / scale;
  return {
    scale: bounded,
    x: anchor.x - cx - (anchor.x - cx - x) * ratio,
    y: anchor.y - cy - (anchor.y - cy - y) * ratio,
  };
}

export function interpolateTransform(from, to, progress) {
  const t = Math.max(0, Math.min(1, progress));
  return {
    scale: from.scale + (to.scale - from.scale) * t,
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}
