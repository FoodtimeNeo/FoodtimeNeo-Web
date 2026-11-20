/** Map-image geometry only; these coordinates are not longitude/latitude. */
export function mapTransformAt(state, zoom, point, width, height) {
  const nextZoom = Math.max(1, Math.min(6, zoom));
  const ratio = nextZoom / state.zoom;
  return clampMapTransform(
    {
      zoom: nextZoom,
      x: point.x - (point.x - state.x) * ratio,
      y: point.y - (point.y - state.y) * ratio,
    },
    width,
    height,
  );
}

export function clampMapTransform(state, width, height) {
  return {
    zoom: state.zoom,
    x: Math.max(width * (1 - state.zoom), Math.min(0, state.x)),
    y: Math.max(height * (1 - state.zoom), Math.min(0, state.y)),
  };
}

export function availableMapHalls(region, halls) {
  const ids = new Set(region?.diningHallIds || []);
  return halls.filter(
    (hall) =>
      ids.has(hall.id) && hall.active !== false && hall.status !== 'inactive',
  );
}
