import { useEffect, useMemo, useRef, useState } from 'react';
import {
  graphLayerCategory, measureText, t, ui,
  type ArchNode, type GraphIndex, type LaidBand, type LaidNode, type PlanarLayout,
  type Pt, type ScenarioDiff, type VisibleGraph,
} from '@archray/core';
import { kindLabel, kindSpec } from './kinds';
import { alpha, LAYER_FALLBACK, type Theme } from './theme';
import { brandFor, BrandGlyph } from './brands';

export type Lens = 'topology' | 'health' | 'replaceability' | 'flow';

export interface Camera { x: number; y: number; zoom: number; rotate?: number }

export interface SceneProps {
  camera: Camera;
  cameraEpoch?: number;
  onCamera(c: Camera): void;
  idx: GraphIndex;
  vis?: VisibleGraph;
  layout: PlanarLayout;
  theme: Theme;
  locale: string;
  lens: Lens;
  motion: 'full' | 'calm' | 'off';
  selected: string | null;
  highlight: Set<string> | null;
  context: Set<string> | null;
  activeEdges: Set<string> | null;
  diff: ScenarioDiff | null;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
  onToggleExpand?(id: string): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function fit(text: string, size: number, width: number, maxLines = 1): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of Array.from(text)) {
    if (measureText(cur + ch, size) > width) {
      if (lines.length + 1 >= maxLines) {
        while (cur && measureText(cur + '…', size) > width) cur = cur.slice(0, -1);
        lines.push(cur + '…');
        return lines;
      }
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  lines.push(cur);
  return lines;
}

interface BentoZone {
  band: LaidBand;
  x: number;
  y: number;
  w: number;
  h: number;
  external?: boolean;
  topHeader?: boolean;
}

interface BentoSceneData {
  zones: BentoZone[];
  nodes: LaidNode[];
  groups: LaidNode[];
  boxById: Map<string, { x: number; y: number; w: number; h: number }>;
  extIds: Set<string>;
  bounds: { x: number; y: number; w: number; h: number };
}

function build2DBento(idx: GraphIndex, layout: PlanarLayout): BentoSceneData {
  const bands = layout.bands;
  const externalBands = bands.filter((b) => graphLayerCategory(idx.graph, b.layer.id) === 'external');
  const mainBands = bands.filter((b) => graphLayerCategory(idx.graph, b.layer.id) !== 'external');

  // Relocate external third-party band into a clean dashed right-hand boundary zone
  // whenever internal bands exist and no expanded group wraps an external band node.
  const canSplitExternal =
    externalBands.length === 1 &&
    mainBands.length >= 2 &&
    !layout.groups.some((g) => externalBands[0] && layout.nodes.some((n) => n.layer === externalBands[0]!.layer.id && g.x <= n.x && g.x + g.w >= n.x + n.w && g.y <= n.y && g.y + g.h >= n.y + n.h));

  const extBandId = canSplitExternal ? externalBands[0]!.layer.id : null;
  const extNodesOrig = extBandId ? layout.nodes.filter((n) => n.layer === extBandId) : [];
  const extIdSet = new Set(extNodesOrig.map((n) => n.id));
  const useExtWing = extIdSet.size > 0;
  const cutY = useExtWing && externalBands[0] ? externalBands[0].y : Infinity;
  const shiftUp = useExtWing && externalBands[0] ? externalBands[0].h + 12 : 0;
  const adjY = (y: number) => (y > cutY ? y - shiftUp : y);

  const nodes: LaidNode[] = [];
  const groups: LaidNode[] = layout.groups.map((g) => ({ ...g, y: adjY(g.y) }));
  const boxById = new Map<string, { x: number; y: number; w: number; h: number }>();

  for (const n of layout.nodes) {
    if (extIdSet.has(n.id)) continue;
    const adjusted: LaidNode = { ...n, y: adjY(n.y) };
    nodes.push(adjusted);
    boxById.set(n.id, adjusted);
  }
  for (const g of groups) boxById.set(g.id, g);

  const zones: BentoZone[] = bands
    .filter((b) => !(useExtWing && b.layer.id === extBandId))
    .map((b) => ({ band: b, x: b.x, y: adjY(b.y), w: b.w, h: b.h }))
    .sort((a, b) => a.y - b.y);

  // Assign each main node and group to its pre-reflow zone so child nodes inside expanded groups stay locked to their group's zone.
  const zoneForY = (yMid: number) => {
    let best = 0;
    let bestDist = Infinity;
    zones.forEach((z, zi) => {
      if (yMid >= z.y - 1 && yMid <= z.y + z.h + 1) {
        best = zi;
        bestDist = -1;
      } else if (bestDist >= 0) {
        const d = Math.abs(yMid - (z.y + z.h / 2));
        if (d < bestDist) {
          bestDist = d;
          best = zi;
        }
      }
    });
    return best;
  };
  const zoneNodesMap = zones.map(() => [] as LaidNode[]);
  const zoneGroupsMap = zones.map(() => [] as LaidNode[]);
  if (zones.length > 0) {
    for (const g of groups) zoneGroupsMap[zoneForY(g.y + g.h / 2)]!.push(g);
    for (const n of nodes) zoneNodesMap[zoneForY(n.y + n.h / 2)]!.push(n);
  }

  let shiftDown = 0;
  zones.forEach((z, zi) => {
    const zNodes = zoneNodesMap[zi]!;
    const zGroups = zoneGroupsMap[zi]!;
    if (shiftDown !== 0) {
      z.y += shiftDown;
      for (const g of zGroups) {
        g.y += shiftDown;
        boxById.set(g.id, g);
      }
      for (const n of zNodes) {
        n.y += shiftDown;
        boxById.set(n.id, n);
      }
    }

    if (zGroups.length === 0 && zNodes.length > 6) {
      const sorted = [...zNodes].sort((a, b) => Math.round(a.y / 40) - Math.round(b.y / 40) || a.x - b.x);
      const count = sorted.length;
      const cols = count <= 10 ? Math.ceil(count / 2) : Math.min(6, Math.ceil(Math.sqrt(count * 1.55)));
      const rows = Math.ceil(count / cols);
      const gapX = 34;
      const gapY = 32;
      const padTop = 32;
      const padBottom = 32;
      const leftContentX = z.x + 216;
      const colWidths = new Array<number>(cols).fill(0);
      const rowHeights = new Array<number>(rows).fill(0);

      sorted.forEach((n, idxN) => {
        const r = Math.floor(idxN / cols);
        const c = idxN % cols;
        colWidths[c] = Math.max(colWidths[c]!, n.w);
        rowHeights[r] = Math.max(rowHeights[r]!, n.h);
      });

      const colX: number[] = [];
      let curX = leftContentX;
      for (let c = 0; c < cols; c++) {
        colX.push(curX);
        curX += colWidths[c]! + gapX;
      }
      const rowY: number[] = [];
      let curY = z.y + padTop;
      for (let r = 0; r < rows; r++) {
        rowY.push(curY);
        curY += rowHeights[r]! + gapY;
      }

      sorted.forEach((n, idxN) => {
        const r = Math.floor(idxN / cols);
        const c = idxN % cols;
        n.x = colX[c]! + (colWidths[c]! - n.w) / 2;
        n.y = rowY[r]! + (rowHeights[r]! - n.h) / 2;
        boxById.set(n.id, n);
      });

      const totalRowsH = rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rows - 1) * gapY;
      const newH = padTop + totalRowsH + padBottom;
      const deltaH = newH - z.h;
      z.h = newH;
      shiftDown += deltaH;
    }
  });

  // Align main band right edges tightly around the reflowed content so single-node layers don't stretch wide.
  let contentMaxX = -Infinity;
  for (const g of groups) contentMaxX = Math.max(contentMaxX, g.x + g.w);
  for (const n of nodes) contentMaxX = Math.max(contentMaxX, n.x + n.w);
  if (Number.isFinite(contentMaxX)) {
    const targetRight = contentMaxX + 56;
    for (const z of zones) {
      z.w = Math.max(420, targetRight - z.x);
    }
  }

  let mainMaxX = -Infinity;
  let mainMinY = Infinity;
  let mainMaxY = -Infinity;
  for (const z of zones) {
    mainMaxX = Math.max(mainMaxX, z.x + z.w);
    mainMinY = Math.min(mainMinY, z.y);
    mainMaxY = Math.max(mainMaxY, z.y + z.h);
  }
  for (const n of nodes) {
    mainMaxX = Math.max(mainMaxX, n.x + n.w);
    mainMinY = Math.min(mainMinY, n.y);
    mainMaxY = Math.max(mainMaxY, n.y + n.h);
  }
  if (!Number.isFinite(mainMaxX)) mainMaxX = layout.bounds.x + layout.bounds.w;
  if (!Number.isFinite(mainMinY)) mainMinY = layout.bounds.y;
  if (!Number.isFinite(mainMaxY)) mainMaxY = layout.bounds.y + layout.bounds.h;

  if (useExtWing && externalBands[0]) {
    const extBand = externalBands[0];
    const maxW = Math.max(240, ...extNodesOrig.map((n) => n.w));
    const wingW = maxW + 52;
    const wingX = mainMaxX + 54;
    const headerH = 62;
    const stepY = 120;
    const contentH = headerH + Math.max(1, extNodesOrig.length) * stepY;
    const wingY = mainMinY;
    const wingH = Math.max(contentH, Math.min(mainMaxY - mainMinY, Math.max(contentH, 320)));
    const startY = wingY + headerH + Math.max(0, (wingH - contentH) * 0.25);

    extNodesOrig.forEach((n, i) => {
      const moved: LaidNode = {
        ...n,
        x: wingX + (wingW - n.w) / 2,
        y: startY + i * stepY,
      };
      nodes.push(moved);
      boxById.set(n.id, moved);
    });
    zones.push({
      band: extBand,
      x: wingX,
      y: wingY,
      w: wingW,
      h: wingH,
      external: true,
      topHeader: true,
    });
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const cover = (b: { x: number; y: number; w: number; h: number }) => {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  };
  zones.forEach(cover);
  nodes.forEach(cover);
  groups.forEach(cover);
  if (!Number.isFinite(x0)) return { zones, nodes, groups, boxById, extIds: extIdSet, bounds: layout.bounds };
  const padLeft = zones.length > 1 ? 268 : 68;
  const padRight = 68;
  const padTop = 88;
  const padBottom = 90;
  return {
    zones,
    nodes,
    groups,
    boxById,
    extIds: extIdSet,
    bounds: { x: x0 - padLeft, y: y0 - padTop, w: x1 - x0 + padLeft + padRight, h: y1 - y0 + padTop + padBottom },
  };
}

export function Scene(p: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(p.camera);
  cameraRef.current = p.camera;
  const [dragging, setDragging] = useState<'pan' | 'rotate' | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const moved = useRef(false);
  const nodePress = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    mode: 'pan' | 'rotate'; x: number; y: number; px: number; py: number; cx: number; cy: number; rot: number;
    kx: number; ky: number; vx: number; vy: number; last: number;
  } | null>(null);
  const inertia = useRef<number | null>(null);

  const { idx, vis, layout, theme: th, locale } = p;
  const def = idx.graph.meta.defaultLocale ?? idx.graph.meta.locales[0] ?? 'en';
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, def);
  const U = (k: Parameters<typeof ui>[0]) => ui(k, locale);

  const bento = useMemo(() => build2DBento(idx, layout), [idx, layout]);
  const vb = bento.bounds;
  const rot = p.camera.rotate ?? 0;
  const center = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };

  const layerColor = useMemo(() => {
    const m = new Map<string, string>();
    (idx.graph.layers ?? []).forEach((l, i) => m.set(l.id, l.color ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!));
    return m;
  }, [idx]);

  const bandNodeCount = useMemo(() => {
    const counts = new Map<string, number>();
    const firstLayer = layout.bands[0]?.layer.id;
    for (const n of layout.nodes) {
      const lid = n.layer ?? firstLayer;
      if (lid) counts.set(lid, (counts.get(lid) ?? 0) + 1);
    }
    return counts;
  }, [layout.nodes, layout.bands]);

  const edgeMeta = useMemo(() => {
    const m = new Map<string, NonNullable<VisibleGraph['edges']>[number]>();
    for (const ve of vis?.edges ?? []) m.set(ve.id, ve);
    return m;
  }, [vis]);

  const hoverInfo = useMemo(() => {
    if (!hovered || p.activeEdges) return null;
    const nodes = new Set<string>([hovered]);
    const edges = new Set<string>();
    for (const e of layout.edges) {
      if (e.source === hovered || e.target === hovered) {
        edges.add(e.id);
        nodes.add(e.source);
        nodes.add(e.target);
      }
    }
    return { nodes, edges };
  }, [hovered, p.activeEdges, layout.edges]);

  const status = (n: ArchNode): string => {
    if (p.diff?.added.has(n.id)) return th.planned;
    if (p.diff?.removed.has(n.id)) return th.critical;
    if (p.lens === 'health') return th[n.health?.level ?? 'unknown'];
    if (p.lens === 'replaceability') {
      const r = n.alternatives?.replaceability;
      return r === 'high' ? th.good : r === 'medium' ? th.warn : r === 'low' ? th.critical : th.unknown;
    }
    return kindSpec(n.kind).hue;
  };

  const dim = (id: string) =>
    (p.highlight !== null && !p.highlight.has(id)) ||
    (p.context?.has(id) === true && p.highlight?.has(id) !== true) ||
    (hoverInfo !== null && !hoverInfo.nodes.has(id));

  const particleStep = Math.max(1, Math.ceil(layout.edges.length / 18));

  const clientToView = (clientX: number, clientY: number): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  };

  const zoomAt = (clientX: number, clientY: number, deltaY: number) => {
    const loc = clientToView(clientX, clientY);
    if (!loc) return;
    stopInertia();
    const c = cameraRef.current;
    const z0 = Math.max(0.1, c.zoom);
    const z1 = clamp(z0 * Math.exp(-deltaY * 0.0016), 0.1, 20);
    if (Math.abs(z1 - z0) < 0.0001) return;
    const w0 = vb.w / z0, h0 = vb.h / z0;
    const x0 = vb.x + c.x + (vb.w - w0) / 2;
    const y0 = vb.y + c.y + (vb.h - h0) / 2;
    const fx = clamp((loc.x - x0) / w0, 0, 1);
    const fy = clamp((loc.y - y0) / h0, 0, 1);
    const w1 = vb.w / z1, h1 = vb.h / z1;
    p.onCamera({
      ...c, zoom: z1,
      x: loc.x - fx * w1 - vb.x - (vb.w - w1) / 2,
      y: loc.y - fy * h1 - vb.y - (vb.h - h1) / 2,
    });
  };

  const stopInertia = () => {
    if (inertia.current !== null) cancelAnimationFrame(inertia.current);
    inertia.current = null;
  };
  useEffect(() => stopInertia, []);
  useEffect(() => { stopInertia(); }, [p.cameraEpoch]);
  useEffect(() => {
    if (p.camera.x === 0 && p.camera.y === 0 && p.camera.zoom === 1 && (p.camera.rotate ?? 0) === 0) stopInertia();
  }, [p.camera.x, p.camera.y, p.camera.zoom, p.camera.rotate]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 2) return;
    const target = e.target as Element;
    if (e.button === 0 && !e.altKey && target.closest('[data-node]')) {
      moved.current = false;
      nodePress.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    const ctm = svg?.getScreenCTM();
    if (!rect || !rect.width || !rect.height || !ctm) return;
    const a = svg!.createSVGPoint(), b = svg!.createSVGPoint();
    a.x = 0; a.y = 0; b.x = 1; b.y = 1;
    const inv = ctm.inverse();
    const pa = a.matrixTransform(inv), pb = b.matrixTransform(inv);
    const kx = pb.x - pa.x, ky = pb.y - pa.y;
    stopInertia();
    moved.current = false;
    const mode = e.button === 2 || e.altKey ? 'rotate' : 'pan';
    setDragging(mode);
    drag.current = {
      mode, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, cx: p.camera.x, cy: p.camera.y,
      rot, kx, ky, vx: 0, vy: 0, last: performance.now(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (nodePress.current) {
      if (Math.hypot(e.clientX - nodePress.current.x, e.clientY - nodePress.current.y) > 3) moved.current = true;
      return;
    }
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    const dt = Math.max(1, now - d.last);
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 3) moved.current = true;
    if (d.mode === 'rotate') {
      p.onCamera({ ...p.camera, rotate: clamp(d.rot + dx * 0.22, -30, 30) });
    } else {
      const stepX = e.clientX - d.px, stepY = e.clientY - d.py;
      p.onCamera({ ...p.camera, x: d.cx - dx * d.kx, y: d.cy - dy * d.ky });
      d.vx = clamp(-stepX * d.kx / dt, -0.8, 0.8);
      d.vy = clamp(-stepY * d.ky / dt, -0.8, 0.8);
      d.px = e.clientX; d.py = e.clientY;
    }
    d.last = now;
  };

  const onPointerUp = () => {
    nodePress.current = null;
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d || d.mode !== 'pan') return;
    let vx = d.vx, vy = d.vy;
    if (Math.hypot(vx, vy) < 0.02) return;
    let cx = cameraRef.current.x, cy = cameraRef.current.y;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(32, now - last);
      last = now;
      cx += vx * dt; cy += vy * dt;
      vx *= 0.90; vy *= 0.90;
      p.onCamera({ ...cameraRef.current, x: cx, y: cy });
      if (Math.hypot(vx, vy) > 0.002) inertia.current = requestAnimationFrame(tick);
      else inertia.current = null;
    };
    inertia.current = requestAnimationFrame(tick);
  };

  // Precompute Bezier ribbons + port fan offsets so parallel edges don't stack identically.
  const ribbons = useMemo(() => {
    const outCounts = new Map<string, number>();
    const inCounts = new Map<string, number>();
    const outIdx = new Map<string, number>();
    const inIdx = new Map<string, number>();

    for (const e of layout.edges) {
      outCounts.set(e.source, (outCounts.get(e.source) ?? 0) + 1);
      inCounts.set(e.target, (inCounts.get(e.target) ?? 0) + 1);
    }

    return layout.edges.map((e) => {
      const a = bento.boxById.get(e.source);
      const b = bento.boxById.get(e.target);
      if (!a || !b) return null;

      const oi = outIdx.get(e.source) ?? 0;
      outIdx.set(e.source, oi + 1);
      const ii = inIdx.get(e.target) ?? 0;
      inIdx.set(e.target, ii + 1);

      const oc = outCounts.get(e.source) ?? 1;
      const ic = inCounts.get(e.target) ?? 1;
      const spreadA = oc > 1 ? ((oi / (oc - 1)) - 0.5) * Math.min(72, a.w * 0.44) : 0;
      const spreadB = ic > 1 ? ((ii / (ic - 1)) - 0.5) * Math.min(72, b.w * 0.44) : 0;

      const toExt = bento.extIds.has(e.target) !== bento.extIds.has(e.source);
      const sameRow = Math.abs((a.y + a.h / 2) - (b.y + b.h / 2)) < 46;

      let x1: number, y1: number, x2: number, y2: number, c1x: number, c1y: number, c2x: number, c2y: number;
      if (toExt) {
        const goRight = b.x >= a.x;
        x1 = goRight ? a.x + a.w : a.x;
        y1 = a.y + a.h / 2 + spreadA * 0.32;
        x2 = goRight ? b.x : b.x + b.w;
        y2 = b.y + b.h / 2 + spreadB * 0.32;
        const dx = Math.max(54, Math.abs(x2 - x1) * 0.52);
        c1x = x1 + (goRight ? dx : -dx);
        c1y = y1;
        c2x = x2 + (goRight ? -dx : dx);
        c2y = y2;
      } else if (sameRow) {
        const goRight = b.x >= a.x;
        x1 = goRight ? a.x + a.w : a.x;
        y1 = a.y + a.h / 2;
        x2 = goRight ? b.x : b.x + b.w;
        y2 = b.y + b.h / 2;
        const arch = Math.min(72, Math.max(28, Math.abs(x2 - x1) * 0.18)) + (oi % 3) * 10;
        c1x = (x1 + x2) / 2;
        c1y = y1 - arch;
        c2x = (x1 + x2) / 2;
        c2y = y2 - arch;
      } else {
        const goDown = b.y >= a.y;
        x1 = a.x + a.w / 2 + spreadA;
        y1 = goDown ? a.y + a.h : a.y;
        x2 = b.x + b.w / 2 + spreadB;
        y2 = goDown ? b.y : b.y + b.h;
        const dy = Math.max(42, Math.abs(y2 - y1) * 0.52);
        c1x = x1;
        c1y = y1 + (goDown ? dy : -dy);
        c2x = x2;
        c2y = y2 + (goDown ? -dy : dy);
      }

      const midX = (x1 + 3 * c1x + 3 * c2x + x2) / 8;
      const midY = (y1 + 3 * c1y + 3 * c2y + y2) / 8;
      const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      return { e, x1, y1, x2, y2, midX, midY, d };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [layout.edges, bento]);

  const viewBox = `${vb.x + p.camera.x + vb.w * (1 - 1 / p.camera.zoom) / 2} ${vb.y + p.camera.y + vb.h * (1 - 1 / p.camera.zoom) / 2} ${vb.w / p.camera.zoom} ${vb.h / p.camera.zoom}`;
  const miniX = vb.x + p.camera.x + (vb.w - vb.w / p.camera.zoom) / 2;
  const miniY = vb.y + p.camera.y + (vb.h - vb.h / p.camera.zoom) / 2;

  const contentBox = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const cover = (x: number, y: number, w: number, h: number) => {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + w);
      y1 = Math.max(y1, y + h);
    };
    bento.zones.forEach((z) => cover(z.x, z.y, z.w, z.h));
    bento.groups.forEach((g) => cover(g.x, g.y, g.w, g.h));
    bento.nodes.forEach((n) => cover(n.x, n.y, n.w, n.h));
    ribbons.forEach((r) => {
      x0 = Math.min(x0, r.x1, r.x2, r.midX - 38);
      x1 = Math.max(x1, r.x1, r.x2, r.midX + 38);
      y0 = Math.min(y0, r.y1, r.y2, r.midY - 16);
      y1 = Math.max(y1, r.y1, r.y2, r.midY + 16);
    });
    if (!Number.isFinite(x0)) return vb;
    if (rot) {
      const rad = (rot * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const;
      x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
      for (const [px, py] of corners) {
        const dx = px - center.x, dy = py - center.y;
        const rx = center.x + dx * cos - dy * sin;
        const ry = center.y + dx * sin + dy * cos;
        x0 = Math.min(x0, rx); y0 = Math.min(y0, ry);
        x1 = Math.max(x1, rx); y1 = Math.max(y1, ry);
      }
    }
    const pad = 48;
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
  }, [bento, ribbons, rot, center.x, center.y, vb]);

  return (
    <div className="ar-scene-wrap">
      <svg
        id="archray-scene"
        ref={svgRef}
        data-content-box={`${contentBox.x.toFixed(1)} ${contentBox.y.toFixed(1)} ${contentBox.w.toFixed(1)} ${contentBox.h.toFixed(1)}`}
        onWheel={(e) => zoomAt(e.clientX, e.clientY, e.deltaY)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => {
          if (moved.current) { moved.current = false; return; }
          p.onSelect(null);
        }}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <marker id="ar-arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 1 2 L 8 5 L 1 8" fill="none" stroke="context-stroke" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <linearGradient id="ar-card-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={th.isDark ? '#FFFFFF' : '#FFFFFF'} stopOpacity={th.isDark ? 0.08 : 0.35} />
            <stop offset="100%" stopColor={th.isDark ? '#020617' : '#CBD5E1'} stopOpacity={th.isDark ? 0.14 : 0.12} />
          </linearGradient>
        </defs>

        <g transform={rot ? `rotate(${rot.toFixed(2)} ${center.x.toFixed(2)} ${center.y.toFixed(2)})` : undefined}>
          {/* 1. Style B Bento Layer Zones */}
          {bento.zones.map((z, i) => {
            const c = z.band.layer.color ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!;
            const layerTitle = L(z.band.layer.name) || z.band.layer.id;
            const count = bandNodeCount.get(z.band.layer.id) ?? 0;
            const countText = `${count} ${U('common.nodes')}`;
            const badgeText = `L${z.band.layer.order ?? i}`;
            const titleLines = fit(layerTitle, 12.5, z.topHeader ? z.w - 92 : 148, z.topHeader ? 1 : 2);

            return (
              <g key={z.band.layer.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={24}
                  fill={alpha(c, th.bandAlpha)}
                  stroke={alpha(c, z.external ? 0.44 : 0.24)}
                  strokeWidth={z.external ? 1.4 : 1.1}
                  strokeDasharray={z.external ? '7 5' : undefined} />
                <line x1={z.x + 22} y1={z.y + 1} x2={z.x + z.w - 22} y2={z.y + 1}
                  stroke={th.specular} strokeOpacity={th.isDark ? 0.22 : 0.65} strokeWidth={1} />
                {z.topHeader ? (
                  <g transform={`translate(${(z.x + 18).toFixed(1)}, ${(z.y + 18).toFixed(1)})`}>
                    <rect x={0} y={0} width={34} height={20} rx={10} fill={alpha(c, 0.18)} stroke={alpha(c, 0.48)} strokeWidth={0.9} />
                    <text x={17} y={13.5} fontSize={10.5} fontWeight={800} textAnchor="middle" fill={c}>{badgeText}</text>
                    <text x={42} y={14} fontSize={12.5} fontWeight={700} fill={th.text}>{titleLines[0]}</text>
                    <text x={z.w - 36} y={13.5} fontSize={10.5} textAnchor="end" fill={th.faint}>{countText}</text>
                  </g>
                ) : (
                  <>
                    <rect x={z.x + 8} y={z.y + 8} width={174} height={z.h - 16} rx={18}
                      fill={alpha(c, th.isDark ? 0.045 : 0.035)} stroke={alpha(c, 0.14)} strokeWidth={0.9} />
                    <line x1={z.x + 188} y1={z.y + 16} x2={z.x + 188} y2={z.y + z.h - 16}
                      stroke={alpha(c, 0.18)} strokeWidth={1} strokeDasharray="4 4" />
                    <g transform={`translate(${(z.x + 18).toFixed(1)}, ${(z.y + 20).toFixed(1)})`}>
                      <rect x={0} y={0} width={36} height={20} rx={10} fill={alpha(c, 0.18)} stroke={alpha(c, 0.48)} strokeWidth={0.9} />
                      <text x={18} y={13.5} fontSize={10.5} fontWeight={800} textAnchor="middle" fill={c}>{badgeText}</text>
                      {titleLines.map((line, li) => (
                        <text key={li} x={0} y={38 + li * 17} fontSize={12.5} fontWeight={700} fill={th.text}>{line}</text>
                      ))}
                      <text x={0} y={38 + titleLines.length * 17 + 4} fontSize={10.5} fill={th.faint}>{countText}</text>
                    </g>
                  </>
                )}
              </g>
            );
          })}

          {/* 2. Expanded Groups */}
          {bento.groups.map((g) => {
            const n = idx.byId.get(g.id);
            if (!n) return null;
            const childCount = idx.children.get(g.id)?.length ?? 0;
            const sel = p.selected === g.id;
            const groupHue = kindSpec(n.kind).hue;
            return (
              <g key={g.id} opacity={dim(g.id) ? 0.26 : 1} style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); p.onSelect(g.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); p.onOpen(g.id); }}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={22}
                  fill={th.groupFill} stroke={sel ? th.accent : alpha(groupHue, 0.42)} strokeWidth={sel ? 1.8 : 1.2} strokeDasharray="6 5" />
                <text x={g.x + 16} y={g.y + 24} fontSize={12.5} fontWeight={700} fill={th.text}>{L(n.name)}</text>
                {p.onToggleExpand && (
                  <g transform={`translate(${g.x + g.w - 64}, ${g.y + 10})`}
                    onClick={(e) => { e.stopPropagation(); p.onToggleExpand?.(g.id); }}>
                    <rect x={0} y={0} width={48} height={20} rx={10} fill={alpha(groupHue, 0.14)} stroke={alpha(groupHue, 0.34)} strokeWidth={0.85} />
                    <text x={24} y={13.5} fontSize={10} fontWeight={700} textAnchor="middle" fill={groupHue}>{`− ${childCount}`}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 3. Smooth Bundled Cubic Bezier Ribbons */}
          {ribbons.map((r, edgeIndex) => {
            const { e, x1, y1, x2, y2, midX, midY, d } = r;
            const ve = edgeMeta.get(e.id);
            const rawEdge = idx.edgeById.get(e.id) ?? ve?.members[0];
            const isAsync = rawEdge?.mode === 'async' || rawEdge?.protocol === 'ws' || rawEdge?.protocol === 'sse' || rawEdge?.protocol === 'kafka';
            const onFlow = p.activeEdges?.has(e.id);
            const onHover = hoverInfo?.edges.has(e.id);
            const onSel = p.selected !== null && (e.source === p.selected || e.target === p.selected);
            const hasFocus = !!(p.activeEdges || hoverInfo || p.selected || p.highlight);
            const lit = Boolean(onFlow || onHover || onSel || (p.highlight !== null && p.highlight.has(e.source) && p.highlight.has(e.target)));

            const srcColor = layerColor.get(idx.byId.get(e.source)?.layer ?? '') ?? th.accent;
            const strokeColor = onFlow
              ? th.accent
              : onHover || onSel
                ? th.accent
                : isAsync ? '#F59E0B' : bento.extIds.has(e.target) ? '#EC4899' : (lit || th.isDark ? srcColor : th.edge);
            const op = hasFocus ? (lit ? 0.94 : 0.10) : layout.edges.length > 24 ? 0.44 : 0.64;
            const sw = onFlow || onHover || onSel ? 2.4 : ve?.aggregated ? 2.1 : 1.5;
            const trunkText = ve?.aggregated && ve.members.length > 1
              ? `${rawEdge?.protocol ? rawEdge.protocol.toUpperCase() + ' ' : ''}×${ve.members.length}`
              : (lit && rawEdge?.protocol ? rawEdge.protocol.toUpperCase() : '');

            return (
              <g key={e.id} opacity={op}>
                {(lit || !hasFocus) && (
                  <path d={d} fill="none" stroke={alpha(strokeColor, lit ? 0.24 : 0.10)} strokeWidth={sw + 4} strokeLinecap="round" />
                )}
                <path id={`e-${e.id}`} d={d} fill="none" stroke={strokeColor} strokeWidth={sw}
                  strokeDasharray={isAsync ? '6 5' : undefined} strokeLinecap="round" markerEnd="url(#ar-arrow)" />
                {p.motion !== 'off' && (onFlow || (!p.activeEdges && edgeIndex % particleStep === 0)) && (
                  <path d={d} fill="none" stroke={strokeColor} strokeWidth={sw + 0.3}
                    className="ar-current" strokeDasharray={onFlow ? '10 18' : '4 24'}
                    style={{ animationDuration: onFlow ? '1.3s' : '11s' }} />
                )}
                {p.motion === 'full' && (onFlow || (!p.activeEdges && edgeIndex % particleStep === 0)) && (
                  <circle r={onFlow ? 3.5 : 2.3} fill={th.text} className="ar-particle" opacity={onFlow ? 0.95 : 0.65}>
                    <animateMotion dur={onFlow ? '1.8s' : `${4.4 + (edgeIndex % 3)}s`} repeatCount="indefinite">
                      <mpath href={`#e-${e.id}`} />
                    </animateMotion>
                  </circle>
                )}
                {/* Glowing circular port handles */}
                {(!hasFocus || lit) && (
                  <>
                    <circle cx={x1} cy={y1} r={3.2} fill={th.bg} stroke={strokeColor} strokeWidth={1.6} />
                    <circle cx={x2} cy={y2} r={3.2} fill={th.bg} stroke={strokeColor} strokeWidth={1.6} />
                  </>
                )}
                {trunkText && (
                  <g transform={`translate(${midX.toFixed(1)}, ${midY.toFixed(1)})`}>
                    <rect x={-Math.max(24, trunkText.length * 4.5 + 10)} y={-10}
                      width={Math.max(48, trunkText.length * 9 + 20)} height={20} rx={10}
                      fill={th.hudStrong} stroke={alpha(strokeColor, 0.55)} strokeWidth={1} />
                    <text x={0} y={3.5} fontSize={9.5} fontFamily="ui-monospace, SFMono-Regular, monospace" fontWeight={700}
                      textAnchor="middle" fill={strokeColor}>{trunkText}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 4. Style B Semantic Bento Node Cards */}
          {bento.nodes.map((ln) => {
            const n = idx.byId.get(ln.id);
            if (!n) return null;
            const spec = kindSpec(n.kind);
            const Icon = spec.icon;
            const title = L(n.name);
            const brand = brandFor(...(n.techStack ?? []), title);
            const sub = L(n.summary) || kindLabel(n.kind, locale);
            const st = status(n);
            const sel = p.selected === n.id;
            const deprecated = n.lifecycle === 'deprecated';
            const planned = n.lifecycle === 'planned';
            const hasKids = idx.children.get(n.id)?.length;
            const isCapsule = n.kind === 'worker' || n.kind === 'queue' || n.kind === 'function';
            const isDb = n.kind === 'database' || n.kind === 'storage' || n.kind === 'cache';
            const isScreen = n.kind === 'client' || n.kind === 'cli';
            const isExt = n.kind === 'external-api' || n.kind === 'saas' || bento.extIds.has(n.id);
            const rx = isCapsule ? 36 : 20;
            const tags = n.techStack?.length ? n.techStack.slice(0, 2) : [kindLabel(n.kind, locale)];
            let px = 20;
            const pillLimit = ln.w - 16;

            return (
              <g key={n.id} data-node={n.id} className="ar-node"
                transform={`translate(${ln.x.toFixed(1)}, ${ln.y.toFixed(1)})`}
                opacity={dim(n.id) ? 0.22 : deprecated ? 0.52 : 1}
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered((cur) => (cur === n.id ? null : cur))}
                onClick={(e) => {
                  e.stopPropagation();
                  if (moved.current) { moved.current = false; return; }
                  p.onSelect(n.id);
                }}
                onDoubleClick={(e) => { e.stopPropagation(); if (hasKids) p.onOpen(n.id); }}>
                {/* Ambient drop shadow */}
                <rect x={2} y={6} width={ln.w} height={ln.h} rx={rx} fill={th.shadow} opacity={th.isDark ? 0.34 : 0.16} />
                {isDb && (
                  <rect x={6} y={5} width={ln.w - 12} height={ln.h} rx={rx - 2} fill={alpha(st, 0.16)} stroke={alpha(st, 0.42)} strokeWidth={1} />
                )}
                {/* Main Style B Frosted Card Body */}
                <rect x={0} y={0} width={ln.w} height={ln.h} rx={rx}
                  fill={th.nodeTop}
                  stroke={sel ? th.accent : hovered === n.id ? alpha(st, 0.8) : alpha(st, 0.36)}
                  strokeWidth={sel ? 2 : 1.15}
                  strokeDasharray={planned || isExt ? '6 4' : undefined} />
                <rect x={0} y={0} width={ln.w} height={ln.h} rx={rx} fill="url(#ar-card-grad)" style={{ pointerEvents: 'none' }} />
                {/* 1px Specular Top Rim */}
                <line x1={rx} y1={1} x2={ln.w - rx} y2={1} stroke={th.specular} strokeOpacity={th.isDark ? 0.36 : 0.9} strokeWidth={1} />
                {isScreen && (
                  <g fill={th.faint} opacity={0.65}>
                    <circle cx={ln.w - 34} cy={12} r={2} />
                    <circle cx={ln.w - 26} cy={12} r={2} />
                    <circle cx={ln.w - 18} cy={12} r={2} />
                  </g>
                )}
                {/* Left color pill accent bar */}
                <rect className="ar-status" x={isCapsule ? 13 : 9} y={16} width={3.5} height={ln.h - 32} rx={1.75} fill={st} />
                {/* Brand / kind icon tile */}
                <rect x={isCapsule ? 23 : 19} y={14} width={36} height={36} rx={11}
                  fill={brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.96)') : alpha(spec.hue, 0.16)}
                  stroke={brand ? (brand.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)') : alpha(spec.hue, 0.32)} strokeWidth={0.9} />
                {brand
                  ? <BrandGlyph brand={brand} size={22} x={(isCapsule ? 23 : 19) + 7} y={21} />
                  : <Icon x={(isCapsule ? 23 : 19) + 8} y={22} width={20} height={20} color={spec.hue} strokeWidth={2} />}
                <text className="ar-node-title" x={isCapsule ? 68 : 64} y={29} fontSize={14} fontWeight={700} fill={th.text}
                  textDecoration={deprecated ? 'line-through' : undefined}>
                  {fit(title, 14, ln.w - (hasKids ? 96 : isScreen ? 96 : 72))[0]}
                </text>
                {hasKids ? (
                  <g transform={`translate(${ln.w - 38}, 13)`}
                    onClick={(e) => {
                      if (!p.onToggleExpand) return;
                      e.stopPropagation();
                      p.onToggleExpand(n.id);
                    }}>
                    <rect x={0} y={0} width={28} height={19} rx={9.5} fill={alpha(th.accent, 0.14)} stroke={alpha(th.accent, 0.38)} strokeWidth={0.85} />
                    <text x={14} y={13} fontSize={10} fontWeight={700} textAnchor="middle" fill={th.accent}>{`+${hasKids}`}</text>
                  </g>
                ) : null}
                <text x={isCapsule ? 68 : 64} y={46} fontSize={11.5} fill={th.sub}>
                  {fit(sub, 11.5, ln.w - (isCapsule ? 84 : 76))[0]}
                </text>
                {tags.map((tag) => {
                  const avail = pillLimit - px;
                  if (avail < 44) return null;
                  const pw = Math.min(avail, Math.ceil(measureText(tag, 9.5) * 1.06 + 18));
                  const x = px + (isCapsule ? 4 : 0);
                  px += pw + 5;
                  return (
                    <g key={tag}>
                      <rect x={x} y={58} width={pw} height={17} rx={8.5}
                        fill={alpha(spec.hue, 0.12)} stroke={alpha(spec.hue, 0.28)} strokeWidth={0.75} />
                      <text x={x + 8} y={70} fontSize={9.5} fontWeight={600} fill={th.sub}>{fit(tag, 9.5, pw - 14)[0]}</text>
                    </g>
                  );
                })}
                {(p.lens === 'health' || p.lens === 'replaceability') && (
                  <circle cx={ln.w - 16} cy={ln.h - 15} r={4.2} fill={st} className="ar-pulse" />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <MiniMap
        vb={vb} camera={p.camera} zones={bento.zones} nodes={bento.nodes} theme={th} rot={rot} center={center} layerColor={layerColor}
        viewport={{ x: miniX, y: miniY, w: vb.w / p.camera.zoom, h: vb.h / p.camera.zoom }}
        onCamera={(c) => { stopInertia(); p.onCamera(c); }}
      />
    </div>
  );
}

function MiniMap({ vb, camera, zones, nodes, theme, rot, center, layerColor, viewport, onCamera }: {
  vb: { x: number; y: number; w: number; h: number };
  camera: Camera;
  zones: BentoZone[];
  nodes: LaidNode[];
  theme: Theme;
  rot: number;
  center: Pt;
  layerColor: Map<string, string>;
  viewport: { x: number; y: number; w: number; h: number };
  onCamera(c: Camera): void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const active = useRef(false);
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const dx = loc.x - center.x, dy = loc.y - center.y;
    const rad = (rot * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    onCamera({ ...camera, x: dx * c - dy * s, y: dx * s + dy * c });
  };
  return (
    <div className="ar-minimap" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <svg
        ref={ref}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={(e) => { active.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={(e) => { if (active.current) move(e); }}
        onPointerUp={() => { active.current = false; }}
        onPointerCancel={() => { active.current = false; }}
        aria-label="Architecture minimap"
      >
        {zones.map((z) => {
          const c = z.band.layer.color ?? layerColor.get(z.band.layer.id) ?? theme.accent;
          return <rect key={z.band.layer.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={12}
            fill={alpha(c, 0.08)} stroke={alpha(c, 0.34)} strokeWidth={1} />;
        })}
        {nodes.map((n) => {
          const c = (n.layer ? layerColor.get(n.layer) : undefined) ?? theme.accent;
          return <rect key={n.id} x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={alpha(c, 0.68)} />;
        })}
        <rect x={viewport.x} y={viewport.y} width={viewport.w} height={viewport.h}
          transform={rot ? `rotate(${(-rot).toFixed(2)} ${center.x.toFixed(2)} ${center.y.toFixed(2)})` : undefined}
          fill={alpha(theme.accent, 0.08)} stroke={theme.accent} strokeWidth="2" vectorEffect="non-scaling-stroke" rx="4" />
      </svg>
      <span className="ar-minimap-zoom">{Math.round(camera.zoom * 100)}%</span>
    </div>
  );
}
