export function previewColumns(width) {
  return Math.max(2, Math.min(6, Math.floor((width + 8) / 84)));
}
export function distanceLabel(meters) {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 100) return '直线 <100m';
  return meters < 1000
    ? `直线 ${Math.round(meters / 10) * 10}m`
    : `直线 ${(meters / 1000).toFixed(1)}km`;
}
