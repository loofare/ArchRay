import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  ArchEdge,
  ArchLayer,
  ArchNode,
  IsoLayoutResult,
  Point2D,
  PositionedEdge,
  PositionedLayerPlane,
  PositionedNode,
} from '../types/archray';

const ISO_ANGLE_RAD = (26 * Math.PI) / 180;
const COS_ISO = Math.cos(ISO_ANGLE_RAD);
const SIN_ISO = Math.sin(ISO_ANGLE_RAD);

// Minimum non-overlapping footprint in screen coordinates
const MIN_SCREEN_DX = 232;
const MIN_SCREEN_DY = 166;

const NODE_CARD_WIDTH = 200;
const NODE_CARD_HEIGHT = 136;

const LAYER_COLORS = ['#38BDF8', '#818CF8', '#C084FC', '#34D399', '#F59E0B', '#F472B6'];

const elk = new ELK();

export function isoToScreen(u: number, v: number): Point2D {
  return {
    x: (u - v) * COS_ISO,
    y: (u + v) * SIN_ISO,
  };
}

export function screenToIso(x: number, y: number): { u: number; v: number } {
  const xTerm = x / COS_ISO;
  const yTerm = y / SIN_ISO;
  return {
    u: 0.5 * (xTerm + yTerm),
    v: 0.5 * (yTerm - xTerm),
  };
}

function buildFilletedPath(points: Point2D[], cornerRadius = 12): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  const segments: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) {
      segments.push(`L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`);
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.4, len2 * 0.4);
    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;

    segments.push(
      `L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`
    );
  }

  const last = points[points.length - 1];
  segments.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  return segments.join(' ');
}

function getPolylineMidpoint(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let totalLength = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return points[0];
  let target = totalLength * 0.5;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const t = segLengths[i] > 0 ? target / segLengths[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    target -= segLengths[i];
  }
  return points[Math.floor(points.length / 2)];
}

async function computeElkLayerOrdering(
  nodes: ArchNode[],
  edges: ArchEdge[],
  layerOrderMap: Map<string, number>
): Promise<Map<string, number>> {
  const orderScore = new Map<string, number>();
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target);

  try {
    const elkGraph = {
      id: 'archray-root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.partitioning.activate': 'true',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.spacing.nodeNode': '80',
        'elk.layered.spacing.nodeNodeBetweenLayers': '110',
      },
      children: nodes.map((n) => ({
        id: n.id,
        width: NODE_CARD_WIDTH,
        height: NODE_CARD_HEIGHT,
        layoutOptions: {
          'elk.partitioning.partition': String(layerOrderMap.get(n.layerId) ?? 0),
        },
      })),
      edges: validEdges.map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
    };

    const laidOut = await elk.layout(elkGraph);
    for (const child of laidOut.children ?? []) {
      if (typeof child.x === 'number') {
        orderScore.set(child.id, child.x);
      }
    }
  } catch {
    // Deterministic topological degree fallback if ELK layout encounters degenerate graphs
    nodes.forEach((n, idx) => {
      const degree = validEdges.filter((e) => e.source === n.id || e.target === n.id).length;
      orderScore.set(n.id, idx * 100 - degree * 5);
    });
  }

  return orderScore;
}

function resolveScreenCollisions(placed: PositionedNode[]): void {
  const maxIterations = 80;
  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < MIN_SCREEN_DX && absDy < MIN_SCREEN_DY) {
          moved = true;
          const overlapX = MIN_SCREEN_DX - absDx;
          const overlapY = MIN_SCREEN_DY - absDy;

          // Resolve along the isometric U axis when nodes share a layer, or push apart cleanly
          if (a.layerOrder === b.layerOrder || overlapX <= overlapY * 1.45) {
            const sign = dx >= 0 ? 1 : -1;
            const shiftU = (overlapX / (2 * COS_ISO)) + 12;
            a.isoU -= sign * shiftU;
            b.isoU += sign * shiftU;
          } else {
            const signV = b.isoV >= a.isoV ? 1 : -1;
            const shiftV = (overlapY / (2 * SIN_ISO)) + 12;
            a.isoV -= signV * shiftV;
            b.isoV += signV * shiftV;
          }

          const sa = isoToScreen(a.isoU, a.isoV);
          const sb = isoToScreen(b.isoU, b.isoV);
          a.x = sa.x;
          a.y = sa.y;
          b.x = sb.x;
          b.y = sb.y;
        }
      }
    }

    if (!moved) break;
  }
}

export async function computeIsoLayout(
  layers: ArchLayer[],
  nodes: ArchNode[],
  edges: ArchEdge[]
): Promise<IsoLayoutResult> {
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
  const usedLayerIds = new Set(nodes.map((n) => n.layerId));
  const activeLayers = sortedLayers.filter((l) => usedLayerIds.has(l.id));
  const effectiveLayers = activeLayers.length > 0 ? activeLayers : sortedLayers;

  const layerOrderMap = new Map<string, number>();
  effectiveLayers.forEach((layer, idx) => {
    layerOrderMap.set(layer.id, idx);
  });

  const elkOrdering = await computeElkLayerOrdering(nodes, edges, layerOrderMap);

  // Group nodes by effective layer index
  const layerBuckets = new Map<number, ArchNode[]>();
  effectiveLayers.forEach((_, idx) => layerBuckets.set(idx, []));

  for (const node of nodes) {
    const idx = layerOrderMap.get(node.layerId) ?? 0;
    const bucket = layerBuckets.get(idx) ?? [];
    bucket.push(node);
    layerBuckets.set(idx, bucket);
  }

  const uSpacing = 278;
  const vSpacing = 315;
  const positionedNodes: PositionedNode[] = [];

  for (let r = 0; r < effectiveLayers.length; r++) {
    const bucket = layerBuckets.get(r) ?? [];
    bucket.sort((a, b) => {
      const scoreA = elkOrdering.get(a.id) ?? 0;
      const scoreB = elkOrdering.get(b.id) ?? 0;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.id.localeCompare(b.id);
    });

    const count = bucket.length;
    bucket.forEach((node, c) => {
      // Stagger odd layers slightly along U so vertical connections separate naturally
      const stagger = (r % 2 === 1 && count % 2 === 0) ? 0 : (r % 2 === 1 ? 0.18 : 0);
      const isoU = (c - (count - 1) / 2 + stagger) * uSpacing;
      const isoV = r * vSpacing;
      const screen = isoToScreen(isoU, isoV);

      positionedNodes.push({
        node,
        x: screen.x,
        y: screen.y,
        isoU,
        isoV,
        layerOrder: r,
        width: NODE_CARD_WIDTH,
        height: NODE_CARD_HEIGHT,
      });
    });
  }

  // Enforce strict screen-space non-overlap guarantee
  resolveScreenCollisions(positionedNodes);

  // Compute global bounds across all nodes and layer trays
  const nodeMap = new Map<string, PositionedNode>();
  positionedNodes.forEach((pn) => nodeMap.set(pn.node.id, pn));

  // Build isometric parallelogram trays per active layer
  const padU = 175;
  const padV = 120;
  let globalMinU = Infinity;
  let globalMaxU = -Infinity;
  positionedNodes.forEach((pn) => {
    globalMinU = Math.min(globalMinU, pn.isoU);
    globalMaxU = Math.max(globalMaxU, pn.isoU);
  });
  if (!Number.isFinite(globalMinU)) {
    globalMinU = -200;
    globalMaxU = 200;
  }

  const positionedLayers: PositionedLayerPlane[] = effectiveLayers.map((layer, r) => {
    const layerNodes = positionedNodes.filter((pn) => pn.layerOrder === r);
    const localMinU = layerNodes.length > 0
      ? Math.min(...layerNodes.map((n) => n.isoU))
      : globalMinU;
    const localMaxU = layerNodes.length > 0
      ? Math.max(...layerNodes.map((n) => n.isoU))
      : globalMaxU;

    const uStart = Math.min(localMinU, globalMinU * 0.55) - padU;
    const uEnd = Math.max(localMaxU, globalMaxU * 0.55) + padU;
    const centerV = layerNodes.length > 0
      ? layerNodes.reduce((acc, n) => acc + n.isoV, 0) / layerNodes.length
      : r * vSpacing;
    const vStart = centerV - padV;
    const vEnd = centerV + padV;

    const pTopLeft = isoToScreen(uStart, vStart);
    const pTopRight = isoToScreen(uEnd, vStart);
    const pBottomRight = isoToScreen(uEnd, vEnd);
    const pBottomLeft = isoToScreen(uStart, vEnd);

    const labelAnchor = isoToScreen(uStart + 20, vStart + 24);
    const accentColor = layer.color ?? LAYER_COLORS[r % LAYER_COLORS.length];

    return {
      layer,
      polygonPoints: [pTopLeft, pTopRight, pBottomRight, pBottomLeft],
      labelAnchor,
      accentColor,
    };
  });

  // Route edges orthogonally along isometric (u, v) grid with sibling lane separation
  const edgeLaneMap = new Map<string, number>();
  const sourceGroups = new Map<string, ArchEdge[]>();
  edges.forEach((e) => {
    const list = sourceGroups.get(e.source) ?? [];
    list.push(e);
    sourceGroups.set(e.source, list);
  });
  sourceGroups.forEach((list) => {
    list.forEach((edge, idx) => {
      edgeLaneMap.set(edge.id, (idx - (list.length - 1) / 2) * 16);
    });
  });

  const positionedEdges: PositionedEdge[] = [];
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const dst = nodeMap.get(edge.target);
    if (!src || !dst) continue;

    const laneOffset = edgeLaneMap.get(edge.id) ?? 0;
    const u1 = src.isoU + laneOffset * 0.5;
    const v1 = src.isoV;
    const u2 = dst.isoU - laneOffset * 0.5;
    const v2 = dst.isoV;

    // Anchor edge endpoints near the 3D prism pedestal base
    const rawPts: Point2D[] = [];
    const dv = v2 - v1;

    if (Math.abs(dv) < 30) {
      // Same layer: route cleanly around the layer corridor in V
      const detourV = v1 + (laneOffset >= 0 ? -95 - Math.abs(laneOffset) : 95 + Math.abs(laneOffset));
      rawPts.push(
        isoToScreen(u1, v1),
        isoToScreen(u1, detourV),
        isoToScreen(u2, detourV),
        isoToScreen(u2, v2)
      );
    } else if (Math.abs(u2 - u1) < 18) {
      // Aligned along V axis
      rawPts.push(isoToScreen(u1, v1), isoToScreen(u2, v2));
    } else {
      const midV = (v1 + v2) * 0.5 + laneOffset * 1.1;
      rawPts.push(
        isoToScreen(u1, v1),
        isoToScreen(u1, midV),
        isoToScreen(u2, midV),
        isoToScreen(u2, v2)
      );
    }

    const pathD = buildFilletedPath(rawPts, 14);
    const midpoint = getPolylineMidpoint(rawPts);

    positionedEdges.push({
      edge,
      points: rawPts,
      pathD,
      midpoint,
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  positionedLayers.forEach((pl) => {
    pl.polygonPoints.forEach((pt) => {
      minX = Math.min(minX, pt.x - 80);
      minY = Math.min(minY, pt.y - 100);
      maxX = Math.max(maxX, pt.x + 80);
      maxY = Math.max(maxY, pt.y + 120);
    });
  });

  positionedNodes.forEach((pn) => {
    minX = Math.min(minX, pn.x - 140);
    minY = Math.min(minY, pn.y - 140);
    maxX = Math.max(maxX, pn.x + 140);
    maxY = Math.max(maxY, pn.y + 140);
  });

  if (!Number.isFinite(minX)) {
    minX = -400;
    minY = -300;
    maxX = 400;
    maxY = 300;
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    layers: positionedLayers,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
