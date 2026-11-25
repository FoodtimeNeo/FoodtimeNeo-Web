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

export function findMapRegion(regions, idOrHallId) {
  if (!idOrHallId) return null;
  return (
    regions.find(
      (r) =>
        r.id === idOrHallId ||
        (Array.isArray(r.diningHallIds) &&
          r.diningHallIds.includes(idOrHallId)),
    ) || null
  );
}

export function focusPointTransform(point, targetZoom, width, height) {
  const zoom = Math.max(1, Math.min(6, targetZoom));
  return clampMapTransform(
    {
      zoom,
      x: width / 2 - point.x * zoom,
      y: height / 2 - point.y * zoom,
    },
    width,
    height,
  );
}

export function focusBoundsTransform(bounds, width, height) {
  const spanX = Math.max(460, (bounds.maxX - bounds.minX) * 1.45);
  const spanY = Math.max(360, (bounds.maxY - bounds.minY) * 1.45);
  const zoom = Math.max(
    1,
    Math.min(4.2, Math.min(width / spanX, height / spanY)),
  );
  return focusPointTransform(
    {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    zoom,
    width,
    height,
  );
}
