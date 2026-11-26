/** Offline campus walking router using road-edge snapping, Dijkstra, and turn-by-turn guidance. */
import { formatDistance, walkingMinutes } from './campusProjection.js';

function compassWord(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? '向东' : '向西';
  return dy >= 0 ? '向南' : '向北';
}

function turnWord(dx1, dy1, dx2, dy2) {
  const l1 = Math.hypot(dx1, dy1);
  const l2 = Math.hypot(dx2, dy2);
  if (l1 < 1e-4 || l2 < 1e-4) return '继续直行';
  const cross = (dx1 * dy2 - dy1 * dx2) / (l1 * l2);
  const dot = (dx1 * dx2 + dy1 * dy2) / (l1 * l2);
  if (dot > 0.85) return '直行';
  if (cross > 0.28) return '右转';
  if (cross < -0.28) return '左转';
  return '前行';
}

export function createCampusNavigator(graph) {
  const walkSpeed =
    Number(graph?.walkSpeedMetersPerMin) > 10
      ? Number(graph.walkSpeedMetersPerMin)
      : 75;
  const nodes = new Map();
  const adjacency = new Map();
  for (const n of graph?.nodes || []) {
    nodes.set(n.id, n);
    adjacency.set(n.id, []);
  }
  const edges = [...(graph?.edges || [])];
  for (const e of edges) {
    if (!nodes.has(e.from) || !nodes.has(e.to)) continue;
    adjacency.get(e.from).push({
      to: e.to,
      roadName: e.roadName || '校内道路',
      distanceMeters: Number(e.distanceMeters) || 0,
      note: e.note || '',
    });
    adjacency.get(e.to).push({
      to: e.from,
      roadName: e.roadName || '校内道路',
      distanceMeters: Number(e.distanceMeters) || 0,
      note: e.note || '',
    });
  }

  function presetStartNodes() {
    return [...nodes.values()]
      .filter((n) => (n.presetOrder || 0) > 0)
      .sort((a, b) => a.presetOrder - b.presetOrder);
  }

  function findLink(from, to) {
    return (adjacency.get(from) || []).find((l) => l.to === to) || null;
  }

  function dijkstra(start, target, extraId = null, extraLinks = null) {
    const dist = new Map([[start, 0]]);
    const prev = new Map();
    const visited = new Set();
    const queue = [{ id: start, dist: 0 }];
    while (queue.length) {
      queue.sort((a, b) => a.dist - b.dist);
      const cur = queue.shift();
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);
      if (cur.id === target) break;
      const links =
        cur.id === extraId ? extraLinks : adjacency.get(cur.id) || [];
      for (const link of links) {
        const nd = cur.dist + link.distanceMeters;
        if (nd < (dist.get(link.to) ?? Infinity)) {
          dist.set(link.to, nd);
          prev.set(link.to, cur.id);
          queue.push({ id: link.to, dist: nd });
        }
      }
    }
    if (!dist.has(target)) return [];
    const path = [];
    for (let at = target; at; at = prev.get(at)) path.unshift(at);
    return path;
  }

  function buildPlan({
    polyline,
    segments,
    totalMeters,
    snappedFromRoad,
    startX,
    startY,
    startLabel,
    targetNodeId,
    targetName,
  }) {
    const steps = [];
    let i = 0;
    let prevDx = 0;
    let prevDy = 0;
    let hasPrev = false;
    while (i < segments.length) {
      const first = segments[i];
      const road = first.roadName;
      const note = first.note;
      let dist = first.distanceMeters;
      const sx = first.x1;
      const sy = first.y1;
      let ex = first.x2;
      let ey = first.y2;
      let j = i + 1;
      while (j < segments.length && !segments[j].note && !note) {
        const nxt = segments[j];
        const sameRoad = nxt.roadName === road;
        const microStraight =
          nxt.distanceMeters < 32 &&
          turnWord(ex - sx, ey - sy, nxt.x2 - nxt.x1, nxt.y2 - nxt.y1) ===
            '直行';
        if (!sameRoad && !microStraight) break;
        dist += nxt.distanceMeters;
        ex = nxt.x2;
        ey = nxt.y2;
        j++;
      }
      const curDx = ex - sx;
      const curDy = ey - sy;
      let instruction;
      if (note) {
        instruction = `${note}，沿 ${road} 步行 ${formatDistance(dist)}`;
      } else if (!hasPrev) {
        instruction = `从 ${startLabel} 出发，沿 ${road} ${compassWord(curDx, curDy)}步行 ${formatDistance(dist)}`;
      } else {
        instruction = `${turnWord(prevDx, prevDy, curDx, curDy)}进入 ${road}，步行 ${formatDistance(dist)}`;
      }
      steps.push({
        instruction,
        roadName: road,
        distanceMeters: dist,
        x: sx,
        y: sy,
      });
      prevDx = curDx;
      prevDy = curDy;
      hasPrev = true;
      i = j;
    }
    const endPt = polyline[polyline.length - 1];
    steps.push({
      instruction: `到达 ${targetName}`,
      roadName: '',
      distanceMeters: 0,
      x: endPt[0],
      y: endPt[1],
    });
    return {
      polyline,
      steps,
      totalMeters,
      walkMinutes: walkingMinutes(totalMeters, walkSpeed),
      snappedFromRoad,
      startX,
      startY,
      startLabel,
      targetNodeId,
      targetName,
    };
  }

  function routeFromNode(startNodeId, targetNodeId, targetName) {
    const start = nodes.get(startNodeId);
    const target = nodes.get(targetNodeId);
    if (!start || !target) return null;
    if (startNodeId === targetNodeId) {
      return {
        polyline: [[start.x, start.y]],
        steps: [
          {
            instruction: `您已在 ${targetName} 附近`,
            roadName: '',
            distanceMeters: 0,
            x: start.x,
            y: start.y,
          },
        ],
        totalMeters: 0,
        walkMinutes: 1,
        snappedFromRoad: false,
        startX: start.x,
        startY: start.y,
        startLabel: start.name,
        targetNodeId,
        targetName,
      };
    }
    const path = dijkstra(startNodeId, targetNodeId);
    if (!path.length) return null;
    const polyline = [];
    const segments = [];
    let totalMeters = 0;
    for (let i = 0; i < path.length; i++) {
      const cur = nodes.get(path[i]);
      polyline.push([cur.x, cur.y]);
      if (i + 1 < path.length) {
        const nxt = nodes.get(path[i + 1]);
        const link = findLink(cur.id, nxt.id);
        if (link) {
          totalMeters += link.distanceMeters;
          segments.push({
            roadName: link.roadName,
            distanceMeters: link.distanceMeters,
            note: link.note,
            x1: cur.x,
            y1: cur.y,
            x2: nxt.x,
            y2: nxt.y,
          });
        }
      }
    }
    return buildPlan({
      polyline,
      segments,
      totalMeters,
      snappedFromRoad: false,
      startX: start.x,
      startY: start.y,
      startLabel: start.name,
      targetNodeId,
      targetName,
    });
  }

  function routeFromPixel(
    startX,
    startY,
    startLabel,
    targetNodeId,
    targetName,
  ) {
    const target = nodes.get(targetNodeId);
    if (!target || !edges.length) return null;
    let bestEdge = null;
    let bestDist2 = Infinity;
    let bestPx = startX;
    let bestPy = startY;
    let bestT = 0;
    for (const e of edges) {
      const a = nodes.get(e.from);
      const b = nodes.get(e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t =
        len2 < 1e-6
          ? 0
          : Math.max(
              0,
              Math.min(1, ((startX - a.x) * dx + (startY - a.y) * dy) / len2),
            );
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      const d2 = (startX - px) ** 2 + (startY - py) ** 2;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestEdge = e;
        bestPx = px;
        bestPy = py;
        bestT = t;
      }
    }
    if (!bestEdge) return null;

    const ea = nodes.get(bestEdge.from);
    const eb = nodes.get(bestEdge.to);
    const edgePx = Math.hypot(eb.x - ea.x, eb.y - ea.y);
    const metersPerPx = edgePx > 1 ? bestEdge.distanceMeters / edgePx : 0.25;
    const connectorMeters = Math.sqrt(bestDist2) * metersPerPx;
    const toA = bestEdge.distanceMeters * bestT;
    const toB = bestEdge.distanceMeters * (1 - bestT);

    const virtualId = '__start__';
    const virtualLinks = [
      {
        to: bestEdge.from,
        roadName: bestEdge.roadName,
        distanceMeters: toA,
        note: '',
      },
      {
        to: bestEdge.to,
        roadName: bestEdge.roadName,
        distanceMeters: toB,
        note: '',
      },
    ];
    const path = dijkstra(virtualId, targetNodeId, virtualId, virtualLinks);
    if (!path.length) return null;

    const polyline = [[bestPx, bestPy]];
    const segments = [];
    let totalMeters = connectorMeters;
    const snappedFromRoad = Math.sqrt(bestDist2) > 8;
    if (path.length >= 2) {
      const first = nodes.get(path[1]);
      const segDist = path[1] === bestEdge.from ? toA : toB;
      if (segDist > 1) {
        totalMeters += segDist;
        segments.push({
          roadName: bestEdge.roadName,
          distanceMeters: segDist,
          note: '',
          x1: bestPx,
          y1: bestPy,
          x2: first.x,
          y2: first.y,
        });
      }
      polyline.push([first.x, first.y]);
      for (let i = 1; i + 1 < path.length; i++) {
        const cur = nodes.get(path[i]);
        const nxt = nodes.get(path[i + 1]);
        const link = findLink(cur.id, nxt.id);
        if (link) {
          totalMeters += link.distanceMeters;
          segments.push({
            roadName: link.roadName,
            distanceMeters: link.distanceMeters,
            note: link.note,
            x1: cur.x,
            y1: cur.y,
            x2: nxt.x,
            y2: nxt.y,
          });
        }
        polyline.push([nxt.x, nxt.y]);
      }
    }
    return buildPlan({
      polyline,
      segments,
      totalMeters,
      snappedFromRoad,
      startX,
      startY,
      startLabel,
      targetNodeId,
      targetName,
    });
  }

  function remainingMeters(plan, currentX, currentY) {
    if (!plan || plan.polyline.length < 2) return 0;
    const pts = plan.polyline;
    let bestIdx = 0;
    let bestDist2 = Infinity;
    let bestT = 0;
    let totalPx = 0;
    const segPx = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      const len = Math.sqrt(len2);
      segPx.push(len);
      totalPx += len;
      const t =
        len2 < 1e-6
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((currentX - a[0]) * dx + (currentY - a[1]) * dy) / len2,
              ),
            );
      const px = a[0] + t * dx;
      const py = a[1] + t * dy;
      const d2 = (currentX - px) ** 2 + (currentY - py) ** 2;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestIdx = i;
        bestT = t;
      }
    }
    const metersPerPx = totalPx > 1 ? plan.totalMeters / totalPx : 0.35;
    const offRoadMeters = Math.sqrt(bestDist2) * metersPerPx;
    if (totalPx < 1) return Math.max(0, offRoadMeters);
    let remPx = segPx[bestIdx] * (1 - bestT);
    for (let i = bestIdx + 1; i < segPx.length; i++) remPx += segPx[i];
    return Math.max(0, plan.totalMeters * (remPx / totalPx) + offRoadMeters);
  }

  function activeStepIndex(plan, currentX, currentY) {
    if (!plan?.steps?.length) return 0;
    let best = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < plan.steps.length; i++) {
      const s = plan.steps[i];
      const d2 = (s.x - currentX) ** 2 + (s.y - currentY) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  return {
    node: (id) => nodes.get(id) || null,
    presetStartNodes,
    routeFromNode,
    routeFromPixel,
    remainingMeters,
    activeStepIndex,
  };
}
