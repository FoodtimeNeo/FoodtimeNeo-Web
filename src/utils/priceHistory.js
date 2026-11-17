import { formatPrice } from './mediaUrl.js';

export const PRICE_UNITS = Object.freeze({
  unspecified: '未注明',
  serving: '份',
  piece: '个',
  bowl: '碗',
  jin: '斤',
  '100g': '100克',
  kg: '公斤',
});
export function recordedPrice(price, unit) {
  if (price === null || price === undefined) return '价格未知';
  return `${formatPrice(price)}${unit && unit !== 'unspecified' ? '/' + (PRICE_UNITS[unit] || '未注明') : ' · 单位未注明'}`;
}

export function axisAmount(value) {
  if (value >= 100000000) return `${Number((value / 100000000).toFixed(2))}亿`;
  if (value >= 10000) return `${Number((value / 10000).toFixed(2))}万`;
  return value.toFixed(2);
}

/** One run per uninterrupted unit/known-price interval; equal adjacent observations add no marker. */
export function priceRuns(history) {
  if (!history?.records?.length) return [];
  const start = history.windowStart ? Date.parse(history.windowStart) : null;
  const end = Date.parse(history.windowEnd);
  const runs = [];
  let active = null;
  for (const entry of history.records) {
    const time = Math.max(start ?? -Infinity, Date.parse(entry.recordedAt));
    if (active && (entry.price === null || entry.priceUnit !== active.unit)) {
      active.end = time;
      active = null;
    }
    if (entry.price === null) continue;
    const price = Number(entry.price);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(time))
      continue;
    if (!active) {
      active = { unit: entry.priceUnit, start: time, end, points: [] };
      runs.push(active);
    }
    const last = active.points.at(-1);
    if (!last || Math.round(last.price * 100) !== Math.round(price * 100))
      active.points.push({ entry, time, price });
  }
  return runs;
}

export function stepCoordinates(run, width = 360, height = 260, axisSize = 14) {
  const maximum = Math.max(1, ...run.points.map((p) => p.price)) * 1.1;
  const labelLength = Math.max(
    ...[0, maximum / 2, maximum].map((value) => axisAmount(value).length),
  );
  const left = Math.min(width - 80, Math.max(48, labelLength * axisSize + 16));
  const right = width - 16,
    top = 24,
    bottom = height - 38;
  const span = Math.max(1, run.end - run.start);
  const x = (time) => left + ((time - run.start) / span) * (right - left);
  const y = (price) => bottom - (price / maximum) * (bottom - top);
  const points = run.points.map((p) => ({ ...p, x: x(p.time), y: y(p.price) }));
  let path = '';
  for (const [i, point] of points.entries())
    path += i ? ` H ${point.x} V ${point.y}` : `M ${point.x} ${point.y}`;
  if (points.length) path += ` H ${right}`;
  return { path, points, left, right, top, bottom, maximum };
}
