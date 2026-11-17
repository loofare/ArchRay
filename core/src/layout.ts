/**
 * Planar layout. Projection-independent.
 *
 * 1. ELK (layered, DOWN, hierarchical) computes node/group boxes AND orthogonal edge routes in a flat plane.
 * 2. Architectural layers become horizontal bands (ELK partitioning keeps them in disjoint y ranges).
 * 3. Renderer projects this plane (flat / iso / stack). Any projection used is monotonic in y and affine
 *    within a band, so "no overlap / no crossing through boxes" proven here survives projection.
 */
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ArchLayer } from './schema';
import { indexGraph, layerOf, type GraphIndex, type VisibleGraph } from './graph';
import { measureText, t } from './i18n';

export interface Box { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }

export interface LaidNode extends Box { id: string; depth: number; isGroup: boolean; layer?: string }
export interface LaidEdge { id: string; source: string; target: string; points: Pt[] }
export interface LaidBand extends Box { layer: ArchLayer; index: number }

export interface PlanarLayout {
  nodes: LaidNode[];
  groups: LaidNode[];
  edges: LaidEdge[];
  bands: LaidBand[];
  bounds: Box;
}

export interface LayoutOptions {
  locale: string;
  defaultLocale: string;
  nodeHeight?: number;
  minNodeWidth?: number;
  maxNodeWidth?: number;
  bandGap?: number;
}

const elk = new ELK();

export const NODE_H = 68;
const GROUP_HEADER = 40;
const GROUP_PAD = 18;
const BAND_PAD_Y = 34;
const BAND_LABEL_W = 0; // labels are drawn inside band, above nodes (top-left)

export function nodeWidth(label: string, opts: LayoutOptions): number {
  const w = measureText(label, 15) + 76; // icon + paddings
  return Math.round(Math.min(opts.maxNodeWidth ?? 280, Math.max(opts.minNodeWidth ?? 168, w)));
}

export async function computeLayout(idx: GraphIndex, vis: VisibleGraph, opts: LayoutOptions): Promise<PlanarLayout> {
  const layers = [...(idx.graph.layers ?? [])].sort((a, b) => a.order - b.order);
  const usedLayers = new Set<string>();
  for (const n of [...vis.nodes, ...vis.groups]) if (vis.visibleParent.get(n.id) == null) {
    const l = layerOf(idx, n.id);
    if (l) usedLayers.add(l);
  }
  const activeLayers = layers.filter((l) => usedLayers.has(l.id));
  const partOf = new Map(activeLayers.map((l, i) => [l.id, i]));
  const hasBands = activeLayers.length > 0;

  // Build ELK hierarchy
  type ElkN = { id: string; width?: number; height?: number; children?: ElkN[]; layoutOptions?: Record<string, string>; labels?: unknown[] };
  const elkNodes = new Map<string, ElkN>();
  const roots: ElkN[] = [];
  const groupIds = new Set(vis.groups.map((g) => g.id));

  for (const n of [...vis.groups, ...vis.nodes]) {
    const label = t(n.name, opts.locale, opts.defaultLocale);
    const isGroup = groupIds.has(n.id);
    const en: ElkN = isGroup
      ? {
          id: n.id,
          children: [],
          layoutOptions: {
            'elk.padding': `[top=${GROUP_HEADER},left=${GROUP_PAD},bottom=${GROUP_PAD},right=${GROUP_PAD}]`,
            'elk.nodeSize.minimum': `(${nodeWidth(label, opts) + 40}, ${NODE_H + 60})`,
            'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          },
        }
      : { id: n.id, width: nodeWidth(label, opts), height: opts.nodeHeight ?? NODE_H };
    elkNodes.set(n.id, en);
  }
  for (const n of [...vis.groups, ...vis.nodes]) {
    const en = elkNodes.get(n.id)!;
    const p = vis.visibleParent.get(n.id);
    if (p && elkNodes.has(p)) elkNodes.get(p)!.children!.push(en);
    else {
      const l = layerOf(idx, n.id);
      if (hasBands) {
        en.layoutOptions = { ...(en.layoutOptions ?? {}), 'elk.partitioning.partition': String(l !== undefined ? partOf.get(l) ?? 0 : 0) };
      }
      roots.push(en);
    }
  }

  const elkGraph = {
    id: '__root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.partitioning.activate': hasBands ? 'true' : 'false',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.spacing.nodeNode': '44',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'elk.spacing.edgeNode': '22',
      'elk.spacing.edgeEdge': '12',
      'elk.layered.spacing.edgeNodeBetweenLayers': '22',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
      'elk.layered.mergeEdges': 'false',
      'elk.padding': '[top=20,left=20,bottom=20,right=20]',
    },
    children: roots,
    edges: vis.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const res: any = await elk.layout(elkGraph as any);

  // Flatten with absolute coords
  const laid = new Map<string, LaidNode>();
  const walk = (n: any, ox: number, oy: number, depth: number) => {
    for (const c of n.children ?? []) {
      const ax = ox + (c.x ?? 0);
      const ay = oy + (c.y ?? 0);
      laid.set(c.id, { id: c.id, x: ax, y: ay, w: c.width ?? 0, h: c.height ?? 0, depth, isGroup: groupIds.has(c.id), layer: layerOf(idx, c.id) });
      walk(c, ax, ay, depth + 1);
    }
  };
  walk(res, 0, 0, 0);

  // Edges: ELK (INCLUDE_CHILDREN) reports sections relative to the edge's container.
  const containerOffset = new Map<string, Pt>();
  containerOffset.set('__root', { x: 0, y: 0 });
  for (const [id, n] of laid) containerOffset.set(id, { x: n.x, y: n.y });
  const edges: LaidEdge[] = [];
  const collectEdges = (n: any) => {
    for (const e of n.edges ?? []) {
      const off = containerOffset.get(e.container ?? n.id) ?? { x: 0, y: 0 };
      const s = e.sections?.[0];
      if (!s) continue;
      const pts: Pt[] = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((p: Pt) => ({ x: p.x + off.x, y: p.y + off.y }));
      const ve = vis.edges.find((v) => v.id === e.id);
      if (ve) edges.push({ id: e.id, source: ve.source, target: ve.target, points: dedupe(pts) });
    }
    for (const c of n.children ?? []) collectEdges(c);
  };
  collectEdges(res);

  // Bands
  let bands: LaidBand[] = [];
  const all = [...laid.values()];
  const minX = Math.min(...all.map((n) => n.x), 0);
  const maxX = Math.max(...all.map((n) => n.x + n.w), 0);
  if (hasBands) {
    const tops = all.filter((n) => n.depth === 0);
    bands = activeLayers.map((layer, index) => {
      const members = tops.filter((n) => n.layer === layer.id);
      const y0 = Math.min(...members.map((n) => n.y));
      const y1 = Math.max(...members.map((n) => n.y + n.h));
      return { layer, index, x: minX - 60 - BAND_LABEL_W, y: y0 - BAND_PAD_Y - 22, w: maxX - minX + 120 + BAND_LABEL_W, h: y1 - y0 + BAND_PAD_Y * 2 + 22 };
    });
    // Resolve band overlaps by splitting gap midpoint (partitions are disjoint, but padding may overlap)
    for (let i = 1; i < bands.length; i++) {
      const a = bands[i - 1]!;
      const b = bands[i]!;
      const aBottom = a.y + a.h;
      if (aBottom > b.y) {
        const mid = (aBottom + b.y) / 2;
        a.h = mid - a.y - 4;
        const nb = b.y + b.h;
        b.y = mid + 4;
        b.h = nb - b.y;
      }
    }
  }

  const bx0 = Math.min(minX, ...bands.map((b) => b.x));
  const by0 = Math.min(...all.map((n) => n.y), ...bands.map((b) => b.y));
  const bx1 = Math.max(maxX, ...bands.map((b) => b.x + b.w));
  const by1 = Math.max(...all.map((n) => n.y + n.h), ...bands.map((b) => b.y + b.h));

  return {
    nodes: all.filter((n) => !n.isGroup),
    groups: all.filter((n) => n.isGroup).sort((a, b) => a.depth - b.depth),
    edges,
    bands,
    bounds: { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 },
  };
}

function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.5 || Math.abs(last.y - p.y) > 0.5) out.push(p);
  }
  return out;
}

/* ------------------------------------------------- geometric invariants */

export function boxesOverlap(a: Box, b: Box, margin = 0): boolean {
  return a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;
}

/** Does an orthogonal-ish polyline pass through the interior of box (shrunk by inset)? */
export function polylineHitsBox(points: Pt[], box: Box, inset = 2): boolean {
  const x0 = box.x + inset, x1 = box.x + box.w - inset, y0 = box.y + inset, y1 = box.y + box.h - inset;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]!, q = points[i + 1]!;
    // sample segment
    const steps = Math.max(2, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 4));
    for (let s = 0; s <= steps; s++) {
      const x = p.x + ((q.x - p.x) * s) / steps;
      const y = p.y + ((q.y - p.y) * s) / steps;
      if (x > x0 && x < x1 && y > y0 && y < y1) return true;
    }
  }
  return false;
}

export { indexGraph };
