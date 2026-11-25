/** Pure-JS WGS84 <-> illustrated campus map TPS projection and walking distance helpers. */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tpsBasis(r2) {
  return r2 <= 1e-18 ? 0 : 0.5 * r2 * Math.log(r2);
}

function solveLinear(a, b) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const div = m[col][col];
    if (Math.abs(div) < 1e-15) continue;
    for (let j = col; j <= n; j++) m[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      for (let j = col; j <= n; j++) m[r][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}

function fitTps(u, v, dst, reg = 1e-6) {
  const n = u.length;
  const size = n + 3;
  const mat = Array.from({ length: size }, () => Array(size).fill(0));
  const rhs = Array(size).fill(0);
  for (let i = 0; i < n; i++) {
    rhs[i] = dst[i];
    for (let j = 0; j < n; j++) {
      const du = u[i] - u[j];
      const dv = v[i] - v[j];
      mat[i][j] = tpsBasis(du * du + dv * dv) + (i === j ? reg : 0);
    }
    mat[i][n] = 1;
    mat[i][n + 1] = u[i];
    mat[i][n + 2] = v[i];
    mat[n][i] = 1;
    mat[n + 1][i] = u[i];
    mat[n + 2][i] = v[i];
  }
  return solveLinear(mat, rhs);
}

function evalTps(u, v, w, pu, pv) {
  const n = u.length;
  let val = w[n] + w[n + 1] * pu + w[n + 2] * pv;
  for (let i = 0; i < n; i++) {
    const du = pu - u[i];
    const dv = pv - v[i];
    val += w[i] * tpsBasis(du * du + dv * dv);
  }
  return val;
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(clamp(a, 0, 1)));
}

export function walkingMinutes(meters, speedMetersPerMin = 75) {
  const speed = speedMetersPerMin > 10 ? speedMetersPerMin : 75;
  return Math.max(1, Math.ceil(Math.max(0, meters) / speed));
}

export function formatDistance(meters) {
  const safe = Math.max(0, Number(meters) || 0);
  if (safe < 1000) return `${Math.round(safe)}m`;
  return `${(safe / 1000).toFixed(1)}km`;
}

export function formatWalkSummary(meters, speedMetersPerMin = 75) {
  return `${formatDistance(meters)} · 约${walkingMinutes(meters, speedMetersPerMin)}分钟`;
}

export function hallDistanceMeters(hall, fix) {
  if (
    !hall ||
    !fix ||
    !Number.isFinite(hall.latitude) ||
    !Number.isFinite(hall.longitude) ||
    !Number.isFinite(fix.latitude) ||
    !Number.isFinite(fix.longitude)
  ) {
    return null;
  }
  return distanceMeters(
    fix.latitude,
    fix.longitude,
    hall.latitude,
    hall.longitude,
  );
}

export function createCampusProjection(calibration) {
  const anchors = calibration?.anchors || [];
  if (anchors.length < 3) {
    throw new Error('At least 3 calibration anchors are required');
  }
  const width = Number(calibration.width) || 5032;
  const height = Number(calibration.height) || 3579;
  const centerLat = Number(calibration.campusCenter?.lat);
  const centerLng = Number(calibration.campusCenter?.lng);
  const campusRadiusMeters = Number(calibration.campusRadiusMeters) || 1400;
  const bounds = calibration.bounds || null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const a of anchors) {
    minLat = Math.min(minLat, a.lat);
    maxLat = Math.max(maxLat, a.lat);
    minLng = Math.min(minLng, a.lng);
    maxLng = Math.max(maxLng, a.lng);
  }
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);

  const srcU = anchors.map((a) => (a.lng - minLng) / lngSpan);
  const srcV = anchors.map((a) => (a.lat - minLat) / latSpan);
  const weightsX = fitTps(
    srcU,
    srcV,
    anchors.map((a) => a.x),
  );
  const weightsY = fitTps(
    srcU,
    srcV,
    anchors.map((a) => a.y),
  );

  function toPixel(lat, lng) {
    const u = (lng - minLng) / lngSpan;
    const v = (lat - minLat) / latSpan;
    return {
      x: clamp(evalTps(srcU, srcV, weightsX, u, v), 0, width),
      y: clamp(evalTps(srcU, srcV, weightsY, u, v), 0, height),
    };
  }

  function isOnCampus(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (
      bounds &&
      (lat < bounds.minLat ||
        lat > bounds.maxLat ||
        lng < bounds.minLng ||
        lng > bounds.maxLng)
    ) {
      return false;
    }
    return distanceMeters(lat, lng, centerLat, centerLng) <= campusRadiusMeters;
  }

  function distanceToCampusCenter(lat, lng) {
    return distanceMeters(lat, lng, centerLat, centerLng);
  }

  return {
    width,
    height,
    anchors,
    toPixel,
    isOnCampus,
    distanceToCampusCenter,
  };
}
