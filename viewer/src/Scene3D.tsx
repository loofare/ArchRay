import { useEffect, useMemo, useRef, useState } from 'react';
import {
  graphLayerCategory, hasChildren, layerOf, measureText, t, ui,
  type ArchLayer, type ArchNode, type GraphIndex, type LaidBand, type LaidNode,
  type PlanarLayout, type ScenarioDiff, type VisibleGraph,
} from '@archray/core';
import { kindLabel, kindSpec } from './kinds';
import { alpha, LAYER_FALLBACK, type Theme } from './theme';
import { brandFor, BrandGlyph } from './brands';
import type { Lens } from './Scene';

export interface CameraCmd3D {
  type: 'atrium' | 'front' | 'top' | 'reset' | 'zoomIn' | 'zoomOut' | 'focusLayer';
  seq: number;
  layerId?: string;
}

export interface Scene3DProps {
  idx: GraphIndex;
  vis: VisibleGraph;
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
  explode: number;
  cameraCmd: CameraCmd3D;
  onCameraZoom?(zoom: number): void;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
  onToggleExpand?(id: string): void;
}

type ZoneKind = 'core' | 'wing-left' | 'orbit-right' | 'plinth-bottom';

interface SpatialSlab {
  id: string;
  layer: ArchLayer;
  zone: ZoneKind;
  color: string;
  cx: number;
  cy: number;
  cz: number;
  hw: number;
  hh: number;
  hd: number;
  nodeCount: number;
  orbit?: boolean;
  anchorPos: [number, number, number];
  anchorAlign: 'left' | 'right' | 'center';
}

interface SpatialNode {
  node: ArchNode;
  laid: LaidNode;
  layerId: string;
  color: string;
  cx: number;
  cy: number;
  cz: number;
  hw: number;
  hh: number;
  hd: number;
  shape: 'screen' | 'block' | 'capsule' | 'db' | 'satellite' | 'plinth' | 'vault';
  childCount: number;
  expanded: boolean;
}

interface Pt3 { x: number; y: number; z: number; s: number }
interface CamState { yaw: number; pitch: number; zoom: number; tx: number; ty: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function toHex(c: string): string {
  return c.startsWith('#') ? c : '#60A5FA';
}

function shapeFor(n: ArchNode, zone: ZoneKind): SpatialNode['shape'] {
  const k = n.kind;
  if (zone === 'orbit-right' || k === 'external-api' || k === 'saas') return 'satellite';
  if (zone === 'plinth-bottom' || k === 'config') return 'plinth';
  if (k === 'client' || k === 'cli') return 'screen';
  if (k === 'database' || k === 'cache' || k === 'search') return 'db';
  if (k === 'storage' || k === 'archive') return 'vault';
  if (k === 'worker' || k === 'queue' || k === 'function') return 'capsule';
  return 'block';
}

function sizeFor(shape: SpatialNode['shape']): [number, number, number] {
  switch (shape) {
    case 'screen': return [76, 8, 42];
    case 'db': return [44, 24, 44];
    case 'vault': return [58, 17, 36];
    case 'capsule': return [64, 12, 30];
    case 'satellite': return [56, 14, 34];
    case 'plinth': return [74, 10, 36];
    default: return [62, 13, 34];
  }
}

function bandZone(idx: GraphIndex, band: LaidBand, coreCount: number): ZoneKind {
  const cat = graphLayerCategory(idx.graph, band.layer.id);
  if ((cat === 'async' || cat === 'ai') && coreCount >= 2) return 'wing-left';
  if (cat === 'external' && coreCount >= 1) return 'orbit-right';
  if ((cat === 'platform' || cat === 'observability') && coreCount >= 1) return 'plinth-bottom';
  return 'core';
}

function buildSpatial3D(
  idx: GraphIndex,
  vis: VisibleGraph,
  layout: PlanarLayout,
): { slabs: SpatialSlab[]; nodes: SpatialNode[]; maxHalfSpan: number; minSlabY: number; maxSlabY: number; maxHd: number } {
  const layerColors = new Map<string, string>();
  (idx.graph.layers ?? []).forEach((l, i) => layerColors.set(l.id, l.color ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!));

  const bands: LaidBand[] = layout.bands.length
    ? [...layout.bands].sort((a, b) => a.y - b.y)
    : [{ id: '__all', x: 0, y: 0, w: 600, h: 400, index: 0, layer: { id: '__all', name: idx.graph.meta.name, order: 0 } } as unknown as LaidBand];

  // Count how many bands belong to the central vertical tower so small graphs never strand a single zone.
  const coreCandidates = bands.filter((b) => {
    const cat = graphLayerCategory(idx.graph, b.layer.id);
    return cat !== 'async' && cat !== 'ai' && cat !== 'external' && cat !== 'platform' && cat !== 'observability';
  });
  const coreCount = coreCandidates.length;

  const nodesByBand = new Map<string, LaidNode[]>();
  bands.forEach((b) => nodesByBand.set(b.layer.id, []));
  const firstBandId = bands[0]!.layer.id;
  for (const ln of layout.nodes) {
    const lid = layerOf(idx, ln.id) ?? ln.layer ?? firstBandId;
    const target = nodesByBand.has(lid) ? lid : firstBandId;
    nodesByBand.get(target)!.push(ln);
  }
  for (const list of nodesByBand.values()) {
    // Preserve ELK top-to-bottom row ordering, then left-to-right columns.
    list.sort((a, b) => Math.round(a.y / 60) - Math.round(b.y / 60) || a.x - b.x);
  }

  const expandedSet = new Set(vis.groups.map((g) => g.id));
  const coreBands: LaidBand[] = [];
  const wingBands: LaidBand[] = [];
  const orbitBands: LaidBand[] = [];
  const plinthBands: LaidBand[] = [];
  for (const b of bands) {
    if ((nodesByBand.get(b.layer.id)?.length ?? 0) === 0 && bands.length > 1) continue;
    const z = bandZone(idx, b, coreCount);
    if (z === 'wing-left') wingBands.push(b);
    else if (z === 'orbit-right') orbitBands.push(b);
    else if (z === 'plinth-bottom') plinthBands.push(b);
    else coreBands.push(b);
  }

  const slabs: SpatialSlab[] = [];
  const outNodes: SpatialNode[] = [];
  let maxCoreHalfW = 190;

  const measureGrid = (
    band: LaidBand,
    zone: ZoneKind,
    maxCols?: number,
    stepX = 160,
    stepZ = 94,
  ) => {
    const list = nodesByBand.get(band.layer.id) ?? [];
    const n = Math.max(1, list.length);
    const cols = maxCols ?? (n <= 4 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n * 1.55)));
    const rows = Math.ceil(n / cols);
    const colColor = layerColors.get(band.layer.id) ?? LAYER_FALLBACK[band.index % LAYER_FALLBACK.length]!;
    const hw = Math.max(zone === 'wing-left' || zone === 'orbit-right' ? 105 : 170, ((cols - 1) * stepX) / 2 + 104);
    const hd = Math.max(76, ((rows - 1) * stepZ) / 2 + 64);
    return { list, n, cols, rows, hw, hd, colColor, stepX, stepZ };
  };

  const emitGridNodes = (
    band: LaidBand,
    zone: ZoneKind,
    cxBase: number,
    cyBase: number,
    slabHalfH: number,
    grid: ReturnType<typeof measureGrid>,
  ) => {
    const { list, n, cols, rows, colColor, stepX, stepZ } = grid;
    list.forEach((ln, k) => {
      const node = idx.byId.get(ln.id);
      if (!node) return;
      const r = Math.floor(k / cols);
      const c = k % cols;
      const colsInRow = r === rows - 1 ? n - r * cols : cols;
      const nx = cxBase + (c - (colsInRow - 1) / 2) * stepX;
      const nz = (r - (rows - 1) / 2) * stepZ;
      const shape = shapeFor(node, zone);
      const [hw, hh, hd] = sizeFor(shape);
      outNodes.push({
        node, laid: ln, layerId: band.layer.id, color: colColor,
        cx: nx, cy: cyBase + slabHalfH + hh + 2, cz: nz, hw, hh, hd, shape,
        childCount: idx.children.get(node.id)?.length ?? 0,
        expanded: expandedSet.has(node.id),
      });
    });
  };

  // 1. Center Vertical Tower (Top -> Bottom along Y)
  const coreGrids = coreBands.map((band) => ({ band, grid: measureGrid(band, 'core') }));
  const maxCoreHd = coreGrids.reduce((m, item) => Math.max(m, item.grid.hd), 76);
  const tierGap = Math.max(158, Math.round(maxCoreHd * 1.12));
  const topY = ((coreBands.length - 1) * tierGap) / 2;
  coreGrids.forEach(({ band, grid }, i) => {
    const cy = topY - i * tierGap;
    emitGridNodes(band, 'core', 0, cy, 4, grid);
    const { hw, hd, colColor, list } = grid;
    maxCoreHalfW = Math.max(maxCoreHalfW, hw);
    const rightAnchor = wingBands.length > 0 && i > 0 && i < coreBands.length - 1;
    slabs.push({
      id: band.layer.id, layer: band.layer, zone: 'core', color: colColor,
      cx: 0, cy, cz: 0, hw, hh: 4, hd, nodeCount: list.length,
      anchorPos: rightAnchor ? [hw + 14, cy + 4, -hd * 0.25] : [-hw - 14, cy + 4, hd * 0.25],
      anchorAlign: rightAnchor ? 'right' : 'left',
    });
  });

  // 2. Left Async / AI Wing (-X side)
  const wingGap = Math.max(145, Math.round(maxCoreHd * 0.95));
  const wingTop = ((wingBands.length - 1) * wingGap) / 2 + 10;
  wingBands.forEach((band, i) => {
    const list = nodesByBand.get(band.layer.id) ?? [];
    const cols = list.length <= 4 ? 1 : 2;
    const grid = measureGrid(band, 'wing-left', cols, 148, 86);
    const wingX = -(maxCoreHalfW + grid.hw + 80);
    const cy = wingTop - i * wingGap;
    emitGridNodes(band, 'wing-left', wingX, cy, 4, grid);
    slabs.push({
      id: band.layer.id, layer: band.layer, zone: 'wing-left', color: grid.colColor,
      cx: wingX, cy, cz: 0, hw: grid.hw, hh: 4, hd: grid.hd, nodeCount: list.length,
      anchorPos: [wingX - grid.hw - 10, cy + 4, -grid.hd * 0.45],
      anchorAlign: 'left',
    });
  });

  // 3. Right External Satellite Orbit (+X side)
  const orbitTop = ((orbitBands.length - 1) * wingGap) / 2 + 16;
  orbitBands.forEach((band, i) => {
    const list = nodesByBand.get(band.layer.id) ?? [];
    const cols = list.length <= 3 ? 1 : 2;
    const grid = measureGrid(band, 'orbit-right', cols, 144, 92);
    const orbitX = maxCoreHalfW + grid.hw + 82;
    const cy = orbitTop - i * wingGap;
    emitGridNodes(band, 'orbit-right', orbitX, cy, 4, grid);
    slabs.push({
      id: band.layer.id, layer: band.layer, zone: 'orbit-right', color: grid.colColor,
      cx: orbitX, cy, cz: 0, hw: grid.hw, hh: 4, hd: grid.hd, nodeCount: list.length, orbit: true,
      anchorPos: [orbitX, cy + 46, grid.hd + 22],
      anchorAlign: 'center',
    });
  });

  // 4. Bottom Infrastructure / Observability Plinth
  const minCoreY = coreBands.length ? topY - (coreBands.length - 1) * tierGap : 0;
  const plinthDrop = Math.max(132, Math.round(maxCoreHd * 0.92));
  plinthBands.forEach((band, i) => {
    const list = nodesByBand.get(band.layer.id) ?? [];
    const cols = Math.min(4, Math.max(1, list.length));
    const cy = minCoreY - plinthDrop - i * 96;
    const grid = measureGrid(band, 'plinth-bottom', cols, 188, 84);
    emitGridNodes(band, 'plinth-bottom', 0, cy, 7, grid);
    const hw = Math.max(grid.hw, maxCoreHalfW + 34);
    slabs.push({
      id: band.layer.id, layer: band.layer, zone: 'plinth-bottom', color: grid.colColor,
      cx: 0, cy, cz: 0, hw, hh: 7, hd: grid.hd, nodeCount: list.length,
      anchorPos: [-hw - 12, cy + 4, -grid.hd * 0.5],
      anchorAlign: 'left',
    });
  });

  let maxHalfSpan = maxCoreHalfW;
  let minSlabY = Infinity;
  let maxSlabY = -Infinity;
  let maxHd = 76;
  for (const s of slabs) {
    maxHalfSpan = Math.max(maxHalfSpan, Math.abs(s.cx) + s.hw);
    minSlabY = Math.min(minSlabY, s.cy);
    maxSlabY = Math.max(maxSlabY, s.cy);
    maxHd = Math.max(maxHd, s.hd);
  }
  if (!Number.isFinite(minSlabY)) { minSlabY = 0; maxSlabY = 0; }
  return { slabs, nodes: outNodes, maxHalfSpan, minSlabY, maxSlabY, maxHd };
}

function roundedFootprint(cx: number, cz: number, hw: number, hd: number, rad: number, steps = 3): [number, number][] {
  const r = Math.min(rad, hw * 0.88, hd * 0.88);
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [cx + hw - r, cz + hd - r, 0],
    [cx - hw + r, cz + hd - r, Math.PI / 2],
    [cx - hw + r, cz - hd + r, Math.PI],
    [cx + hw - r, cz - hd + r, 1.5 * Math.PI],
  ];
  for (const [ox, oz, a0] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      pts.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]);
    }
  }
  return pts;
}

export function Scene3D(p: Scene3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const zoneRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const moved = useRef(false);

  const { idx, vis, layout, theme: th, locale } = p;
  const def = idx.graph.meta.defaultLocale ?? idx.graph.meta.locales[0] ?? 'en';
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, def);
  const U = (k: Parameters<typeof ui>[0]) => ui(k, locale);

  const spatial = useMemo(() => buildSpatial3D(idx, vis, layout), [idx, vis, layout]);
  const spatialNodeMap = useMemo(() => new Map(spatial.nodes.map((s) => [s.node.id, s])), [spatial.nodes]);

  const hoverInfo = useMemo(() => {
    if (!hovered || p.activeEdges) return null;
    const nodes = new Set<string>([hovered]);
    const edges = new Set<string>();
    for (const e of vis.edges) {
      if (e.source === hovered || e.target === hovered) {
        edges.add(e.id);
        nodes.add(e.source);
        nodes.add(e.target);
      }
    }
    return { nodes, edges };
  }, [hovered, p.activeEdges, vis.edges]);

  // Fit initial 3D scale nicely to the number of zones/nodes.
  const baseZoom = useMemo(() => {
    const zSpan = Math.max(460, spatial.maxHalfSpan * 2.15);
    const ySpan = Math.max(380, (spatial.maxSlabY - spatial.minSlabY) * 1.15 + spatial.maxHd * 2.1);
    const vw = viewport.w || (typeof window !== 'undefined' ? window.innerWidth : 1440);
    const vh = viewport.h || (typeof window !== 'undefined' ? window.innerHeight : 900);
    const availW = vw > 768 ? vw - 250 : vw - 24;
    const availH = vw <= 767 ? Math.max(220, vh - 295) : vh - 180;
    const f = Math.min(availW / zSpan, availH / ySpan);
    return clamp(f * 1.08, 0.25, 1.18);
  }, [spatial.maxHalfSpan, spatial.maxSlabY, spatial.minSlabY, spatial.maxHd, viewport.w, viewport.h]);

  const defaultCam = (): CamState => ({ yaw: -0.36, pitch: 0.48, zoom: baseZoom, tx: 0, ty: 4 });
  const camRef = useRef<CamState>({ yaw: -0.36, pitch: 0.48, zoom: 1.0, tx: 0, ty: 4 });
  const targetCamRef = useRef<CamState>({ yaw: -0.36, pitch: 0.48, zoom: 1.0, tx: 0, ty: 4 });
  const initFitted = useRef(false);

  useEffect(() => {
    if (viewport.w > 0 && !initFitted.current) {
      initFitted.current = true;
      const d = defaultCam();
      camRef.current = { ...d };
      targetCamRef.current = { ...d };
      p.onCameraZoom?.(d.zoom);
    }
  }, [viewport.w, baseZoom]);

  // Respond to external camera preset / zoom / reset / layer-fly buttons.
  const lastSeq = useRef(-1);
  useEffect(() => {
    if (p.cameraCmd.seq === lastSeq.current) return;
    lastSeq.current = p.cameraCmd.seq;
    const tCam = targetCamRef.current;
    switch (p.cameraCmd.type) {
      case 'atrium':
      case 'reset': {
        const d = defaultCam();
        Object.assign(tCam, d);
        break;
      }
      case 'front':
        Object.assign(tCam, { yaw: 0, pitch: 0.14, zoom: baseZoom * 1.04, tx: 0, ty: 4 });
        break;
      case 'top':
        Object.assign(tCam, { yaw: -0.04, pitch: 1.22, zoom: baseZoom * 0.96, tx: 0, ty: 0 });
        break;
      case 'zoomIn':
        tCam.zoom = clamp(tCam.zoom * 1.18, 0.45, 2.5);
        break;
      case 'zoomOut':
        tCam.zoom = clamp(tCam.zoom / 1.18, 0.45, 2.5);
        break;
      case 'focusLayer': {
        const slab = spatial.slabs.find((s) => s.id === p.cameraCmd.layerId);
        if (slab) {
          const yaw = slab.zone === 'wing-left' ? -0.62 : slab.zone === 'orbit-right' ? 0.34 : -0.36;
          const pitch = slab.zone === 'plinth-bottom' ? 0.40 : 0.46;
          Object.assign(tCam, {
            yaw,
            pitch,
            zoom: clamp(baseZoom * 1.16, 0.65, 1.45),
            tx: slab.zone === 'wing-left' ? 120 : slab.zone === 'orbit-right' ? -130 : 0,
            ty: -slab.cy * p.explode * 0.42,
          });
        }
        break;
      }
    }
    p.onCameraZoom?.(tCam.zoom);
  }, [p.cameraCmd, baseZoom, spatial.slabs, p.explode]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodeColor = (n: ArchNode, baseCol: string) => {
    if (p.diff?.added.has(n.id)) return th.planned;
    if (p.diff?.removed.has(n.id)) return th.critical;
    if (p.lens === 'health') return th[n.health?.level ?? 'unknown'];
    if (p.lens === 'replaceability') {
      const r = n.alternatives?.replaceability;
      return r === 'high' ? th.good : r === 'medium' ? th.warn : r === 'low' ? th.critical : th.unknown;
    }
    return baseCol;
  };

  const isDimmed = (id: string) =>
    (p.highlight !== null && !p.highlight.has(id)) ||
    (p.context?.has(id) === true && p.highlight?.has(id) !== true) ||
    (hoverInfo !== null && !hoverInfo.nodes.has(id));

  // Keep latest render parameters in a ref for smooth 60fps animation without re-binding RAF.
  const drawDataRef = useRef<any>(null);
  drawDataRef.current = {
    spatial, spatialNodeMap, vis, th, explode: p.explode,
    motion: p.motion, selected: p.selected, hovered, hoverInfo,
    activeEdges: p.activeEdges, highlight: p.highlight, lens: p.lens,
    nodeColor, isDimmed, locale, L, U,
  };

  const render3DFrame = (
    ctx: CanvasRenderingContext2D | null,
    xCenter: number,
    yCenter: number,
    cam: CamState,
    timeSec: number,
    opts: {
      renderDOM?: boolean;
      drawCanvasBadges?: boolean;
      clipBadges?: boolean;
      viewportW?: number;
      viewportH?: number;
      iconImages?: Map<string, HTMLImageElement>;
    } = {},
  ) => {
    const d = drawDataRef.current;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const camDist = Math.max(1500, d.spatial.maxHalfSpan * 2.55);
    const fov = camDist * 0.96 * cam.zoom;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const track = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };

    const proj = (x: number, y: number, z: number): Pt3 => {
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y2 = y * cp + z1 * sp;
      const z2 = -y * sp + z1 * cp + camDist;
      const s = fov / Math.max(180, z2);
      const px = xCenter + (x1 + cam.tx) * s;
      const py = yCenter - (y2 + cam.ty) * s;
      track(px, py);
      return { x: px, y: py, z: z2, s };
    };

    const yOf = (baseY: number) => baseY * d.explode;
    const isLight = !d.th.isDark;

    const paintExtrude = (
      c: CanvasRenderingContext2D | null,
      cx: number, yVal: number, cz: number,
      hw: number, hh: number, hd: number,
      rad: number, color: string, alphaMul: number,
      eopts: { glass?: boolean; dashed?: boolean; circle?: boolean; tilt?: number; selected?: boolean; shadow?: boolean; shadowY?: number } = {},
    ) => {
      const hex = toHex(color);
      const fp = eopts.circle
        ? Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return [cx + Math.cos(a) * hw, cz + Math.sin(a) * hd] as [number, number];
          })
        : roundedFootprint(cx, cz, hw, hd, rad, 3);

      const tilt = eopts.tilt ?? 0;
      const pt = (fx: number, fy: number, fz: number) => {
        if (!tilt) return proj(fx, fy, fz);
        const dz = fz - cz, dy = fy - yVal;
        return proj(fx, yVal + dy * Math.cos(tilt) - dz * Math.sin(tilt), cz + dy * Math.sin(tilt) + dz * Math.cos(tilt));
      };

      const topPts = fp.map(([fx, fz]) => pt(fx, yVal + hh, fz));
      const botPts = fp.map(([fx, fz]) => pt(fx, yVal - hh, fz));
      const shPts = eopts.shadow
        ? roundedFootprint(cx + 3, cz + 4, hw * 1.05, hd * 1.06, rad, 2).map(([fx, fz]) => proj(fx, eopts.shadowY ?? (yVal - hh - 1.2), fz))
        : null;

      if (!c) return;

      if (shPts) {
        c.beginPath();
        shPts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.closePath();
        c.fillStyle = alpha('#020617', (isLight ? 0.11 : 0.36) * alphaMul);
        c.fill();
      }

      const sideQuads: { z: number; i: number; p0: Pt3; p1: Pt3; p2: Pt3; p3: Pt3; shade: number }[] = [];
      const visibleEdge = new Array<boolean>(fp.length).fill(false);
      for (let i = 0; i < fp.length; i++) {
        const ni = (i + 1) % fp.length;
        const p0 = topPts[i]!, p1 = topPts[ni]!, p2 = botPts[ni]!, p3 = botPts[i]!;
        const cross = (p1.x - p0.x) * (p3.y - p0.y) - (p1.y - p0.y) * (p3.x - p0.x);
        if (cross <= 0) continue;
        visibleEdge[i] = true;
        const [fx0, fz0] = fp[i]!, [fx1, fz1] = fp[ni]!;
        const nx = fz1 - fz0, nz = -(fx1 - fx0);
        const nlen = Math.hypot(nx, nz) || 1;
        const shade = 0.5 + 0.5 * (-(nx / nlen) * 0.55 - (nz / nlen) * 0.83);
        sideQuads.push({ z: (p0.z + p1.z + p2.z + p3.z) / 4, i, p0, p1, p2, p3, shade });
      }
      sideQuads.sort((a, b) => b.z - a.z);

      for (const q of sideQuads) {
        const rawSideOp = eopts.glass
          ? (0.16 + q.shade * 0.16) * alphaMul
          : (0.26 + q.shade * 0.34) * alphaMul;
        c.beginPath();
        c.moveTo(q.p0.x, q.p0.y);
        c.lineTo(q.p1.x, q.p1.y);
        c.lineTo(q.p2.x, q.p2.y);
        c.lineTo(q.p3.x, q.p3.y);
        c.closePath();
        c.fillStyle = alpha(hex, isLight ? rawSideOp * 0.78 : rawSideOp);
        c.fill();
        if (!eopts.glass || eopts.selected) {
          c.strokeStyle = alpha(hex, (eopts.selected ? 0.52 : 0.28) * alphaMul);
          c.lineWidth = eopts.selected ? 0.9 : 0.7;
          c.stroke();
        }
      }

      // Top face
      c.beginPath();
      topPts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
      c.closePath();
      const fillOp = eopts.glass
        ? (isLight ? 0.13 : 0.12) * alphaMul
        : (isLight ? 0.34 : 0.42) * alphaMul;
      c.fillStyle = alpha(hex, fillOp);
      c.fill();
      c.strokeStyle = alpha(hex, (eopts.selected ? 0.96 : eopts.glass ? 0.54 : 0.70) * alphaMul);
      c.lineWidth = eopts.selected ? 2.2 : eopts.glass ? 1.15 : 1.35;
      if (eopts.dashed) c.setLineDash([5, 4]);
      c.stroke();
      c.setLineDash([]);

      // Specular highlight bevel along visible front-top edges
      c.beginPath();
      for (let i = 0; i < fp.length; i++) {
        if (!visibleEdge[i]) continue;
        const ni = (i + 1) % fp.length;
        c.moveTo(topPts[i]!.x, topPts[i]!.y);
        c.lineTo(topPts[ni]!.x, topPts[ni]!.y);
      }
      c.strokeStyle = alpha('#FFFFFF', (eopts.glass ? (isLight ? 0.42 : 0.18) : (isLight ? 0.65 : 0.34)) * alphaMul);
      c.lineWidth = eopts.glass ? 0.85 : 1.05;
      c.lineCap = 'round';
      c.stroke();
    };

    const slabList = d.spatial.slabs as SpatialSlab[];
    const slabById = new Map(slabList.map((s) => [s.id, s]));
    const sortedSlabs = [...slabList].sort((a, b) => {
      const ay = yOf(a.cy), by = yOf(b.cy);
      if (Math.abs(ay - by) > 20) return ay - by;
      return proj(b.cx, by, b.cz).z - proj(a.cx, ay, a.cz).z;
    });
    const slabPassIndex = new Map(sortedSlabs.map((s, i) => [s.id, i]));

    // Compute world placement and projected centers for all nodes
    const projNodes = new Map<string, {
      sn: SpatialNode; sx: number; sy: number; z: number; wy: number; slabY: number; dim: boolean; col: string; sel: boolean; amul: number;
    }>();
    const nodesBySlab = new Map<string, typeof projNodes extends Map<string, infer V> ? V[] : never>();
    for (const sn of d.spatial.nodes as SpatialNode[]) {
      const sb = slabById.get(sn.layerId);
      const slabSurfaceY = sb ? yOf(sb.cy) + sb.hh : yOf(sn.cy - sn.hh - 5);
      const standOffset = sn.shape === 'screen' ? 9 : 2;
      const cyWorld = slabSurfaceY + sn.hh + standOffset;
      const dim = d.isDimmed(sn.node.id);
      const col = d.nodeColor(sn.node, sn.color);
      const amul = dim ? 0.18 : 1;
      const sel = d.selected === sn.node.id || d.hovered === sn.node.id;
      const centerP = proj(sn.cx, cyWorld, sn.cz);
      const badgeP = proj(sn.cx, cyWorld + sn.hh + 9, sn.cz);
      const entry = { sn, sx: badgeP.x, sy: badgeP.y, z: centerP.z, wy: cyWorld, slabY: slabSurfaceY, dim, col, sel, amul };
      projNodes.set(sn.node.id, entry);
      const bucket = nodesBySlab.get(sn.layerId) ?? [];
      bucket.push(entry);
      nodesBySlab.set(sn.layerId, bucket);
    }
    for (const bucket of nodesBySlab.values()) {
      bucket.sort((a, b) => b.z - a.z);
    }

    // 3. Precompute Smooth 3D Cubic Bezier Conduits + Arrowheads
    const activeFocus = !!(d.activeEdges || d.hoverInfo || d.selected || d.highlight);
    const edgeCount = d.vis.edges.length;
    const conduits: { sameSlab: boolean; maxPass: number; lit: boolean; z: number; draw: (c: CanvasRenderingContext2D) => void }[] = [];

    d.vis.edges.forEach((ve: VisibleGraph['edges'][number], idxE: number) => {
      const a = projNodes.get(ve.source);
      const b = projNodes.get(ve.target);
      if (!a || !b) return;
      const onFlow = d.activeEdges?.has(ve.id);
      const onHover = d.hoverInfo?.edges.has(ve.id);
      const onSel = d.selected !== null && (ve.source === d.selected || ve.target === d.selected);
      const onHighlight = d.highlight !== null && d.highlight.has(ve.source) && d.highlight.has(ve.target);
      const lit = Boolean(onFlow || onHover || onSel || onHighlight);
      const op = activeFocus ? (lit ? 0.94 : 0.08) : edgeCount > 18 ? 0.34 : 0.50;

      const rep = ve.members[0];
      const isAsync = rep?.mode === 'async' || rep?.protocol === 'ws' || rep?.protocol === 'sse' || rep?.protocol === 'kafka';
      const isExternal = a.sn.shape === 'satellite' || b.sn.shape === 'satellite';
      const eCol = lit
        ? (d.activeEdges ? d.th.accent : a.sn.shape === 'db' || b.sn.shape === 'db' ? '#34D399' : isAsync ? '#FBBF24' : a.sn.color)
        : (isExternal ? '#EC4899' : isAsync ? '#FBBF24' : b.sn.color);
      const hex = toHex(eCol);

      const sameElevation = Math.abs(b.wy - a.wy) < 28;
      const sameSlab = a.sn.layerId === b.sn.layerId || sameElevation;
      let p0: [number, number, number];
      let p1: [number, number, number];
      let p2: [number, number, number];
      let p3: [number, number, number];

      if (sameElevation) {
        const distXZ = Math.hypot(b.sn.cx - a.sn.cx, b.sn.cz - a.sn.cz);
        const archY = Math.min(78, Math.max(34, distXZ * 0.24));
        const yTopA = a.wy + a.sn.hh;
        const yTopB = b.wy + b.sn.hh;
        p0 = [a.sn.cx, yTopA, a.sn.cz];
        p1 = [a.sn.cx + (b.sn.cx - a.sn.cx) * 0.25, yTopA + archY, a.sn.cz + (b.sn.cz - a.sn.cz) * 0.25];
        p2 = [a.sn.cx + (b.sn.cx - a.sn.cx) * 0.75, yTopB + archY, a.sn.cz + (b.sn.cz - a.sn.cz) * 0.75];
        p3 = [b.sn.cx, yTopB, b.sn.cz];
      } else {
        const goDown = b.wy < a.wy;
        const y0 = goDown ? a.wy - a.sn.hh : a.wy + a.sn.hh;
        const y3 = goDown ? b.wy + b.sn.hh : b.wy - b.sn.hh;
        const dyRaw = (y3 - y0) * 0.54;
        const dy = Math.sign(dyRaw || 1) * Math.max(42, Math.abs(dyRaw));
        p0 = [a.sn.cx, y0, a.sn.cz];
        p1 = [a.sn.cx, y0 + dy, a.sn.cz];
        p2 = [b.sn.cx, y3 - dy, b.sn.cz];
        p3 = [b.sn.cx, y3, b.sn.cz];
      }

      const steps = 24;
      const pts: Pt3[] = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, mu = 1 - u;
        const x = mu * mu * mu * p0[0] + 3 * mu * mu * u * p1[0] + 3 * mu * u * u * p2[0] + u * u * u * p3[0];
        const y = mu * mu * mu * p0[1] + 3 * mu * mu * u * p1[1] + 3 * mu * u * u * p2[1] + u * u * u * p3[1];
        const z = mu * mu * mu * p0[2] + 3 * mu * mu * u * p1[2] + 3 * mu * u * u * p2[2] + u * u * u * p3[2];
        pts.push(proj(x, y, z));
      }
      const avgZ = pts.reduce((acc, q) => acc + q.z, 0) / pts.length;
      const maxPass = Math.max(slabPassIndex.get(a.sn.layerId) ?? 0, slabPassIndex.get(b.sn.layerId) ?? 0);

      conduits.push({
        sameSlab,
        maxPass,
        lit,
        z: avgZ,
        draw: (c) => {
          if (op <= 0.1 && !lit) {
            c.beginPath();
            pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
            c.strokeStyle = alpha(hex, 0.08);
            c.lineWidth = 1;
            c.stroke();
            return;
          }
          // Style B luminous bloom underlay
          c.beginPath();
          pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
          c.strokeStyle = alpha(hex, op * 0.24);
          c.lineWidth = lit ? 6.5 : 4.2;
          c.lineCap = 'round';
          c.stroke();

          c.beginPath();
          pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
          c.strokeStyle = alpha(hex, op);
          c.lineWidth = lit ? 2.2 : ve.aggregated ? 1.9 : 1.45;
          if (isAsync) c.setLineDash([5, 4]);
          c.stroke();
          c.setLineDash([]);

          if (pts.length >= 2 && (op > 0.14 || lit)) {
            const pEnd = pts[steps]!;
            const pPrev = Math.hypot(pEnd.x - pts[steps - 1]!.x, pEnd.y - pts[steps - 1]!.y) > 0.5
              ? pts[steps - 1]!
              : pts[Math.max(0, steps - 2)]!;
            const dx = pEnd.x - pPrev.x;
            const dyA = pEnd.y - pPrev.y;
            const len = Math.hypot(dx, dyA);
            if (len > 0.5) {
              const ux = dx / len, uy = dyA / len;
              const tipX = pEnd.x - ux * 2.5, tipY = pEnd.y - uy * 2.5;
              const sz = lit ? 6.5 : 5;
              c.beginPath();
              c.moveTo(tipX - ux * sz - uy * sz * 0.55, tipY - uy * sz + ux * sz * 0.55);
              c.lineTo(tipX, tipY);
              c.lineTo(tipX - ux * sz + uy * sz * 0.55, tipY - uy * sz - ux * sz * 0.55);
              c.strokeStyle = alpha(hex, Math.min(1, op * 1.15));
              c.lineWidth = lit ? 1.85 : 1.35;
              c.lineCap = 'round';
              c.lineJoin = 'round';
              c.stroke();
            }
          }

          if (lit && pts.length >= 2) {
            const pStart = pts[0]!;
            const pEnd = pts[steps]!;
            c.fillStyle = hex;
            c.beginPath(); c.arc(pStart.x, pStart.y, 2.5, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(pEnd.x, pEnd.y, 3, 0, Math.PI * 2); c.fill();
          }

          // Flowing glowing packet bead (respecting motion setting)
          const animate = d.motion === 'full' && (lit || idxE % Math.max(1, Math.ceil(edgeCount / 10)) === 0);
          if (animate) {
            const bi = Math.floor(((timeSec * (lit ? 0.72 : 0.42) + idxE * 0.21) % 1) * steps);
            const pt = pts[bi];
            if (pt) {
              c.beginPath();
              c.arc(pt.x, pt.y, lit ? 3.8 : 2.8, 0, Math.PI * 2);
              c.fillStyle = '#FFFFFF';
              c.shadowColor = hex;
              c.shadowBlur = 10;
              c.fill();
              c.shadowBlur = 0;
            }
          }
        },
      });
    });

    const paintSlab = (c: CanvasRenderingContext2D | null, sb: SpatialSlab) => {
      const slabY = yOf(sb.cy);
      if (sb.orbit) {
        const ringPts = Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return proj(sb.cx + Math.cos(a) * (sb.hw + 14), slabY, sb.cz + Math.sin(a) * (sb.hd + 14));
        });
        if (!c) return;
        c.beginPath();
        ringPts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.closePath();
        c.strokeStyle = alpha(toHex(sb.color), 0.48);
        c.fillStyle = alpha(toHex(sb.color), 0.06);
        c.lineWidth = 1.4;
        c.setLineDash([7, 5]);
        c.fill();
        c.stroke();
        c.setLineDash([]);
      } else {
        paintExtrude(c, sb.cx, slabY, sb.cz, sb.hw, sb.hh, sb.hd, 26, sb.color, 1, { glass: true });
      }
    };

    const paintNode = (c: CanvasRenderingContext2D | null, entry: (typeof projNodes extends Map<string, infer V> ? V : never)) => {
      const { sn, wy, slabY, col, amul, sel } = entry;
      if (sn.shape === 'db') {
        [-0.36, 0, 0.36].forEach((offset, ti) => {
          paintExtrude(c, sn.cx, wy + offset * sn.hh * 1.9, sn.cz, sn.hw * 0.84, sn.hh * 0.25, sn.hd * 0.84, sn.hw, col, amul, {
            circle: true, selected: sel && ti === 2, shadow: ti === 0, shadowY: slabY + 0.4,
          });
        });
      } else if (sn.shape === 'screen') {
        paintExtrude(c, sn.cx, wy + 2, sn.cz, sn.hw, 6, sn.hd, 22, col, amul, {
          tilt: -0.24, selected: sel, shadow: true, shadowY: slabY + 0.4,
        });
      } else if (sn.shape === 'satellite') {
        paintExtrude(c, sn.cx, wy, sn.cz, sn.hw * 0.72, sn.hh, sn.hd * 0.72, sn.hw * 0.7, col, amul, {
          circle: true, dashed: true, selected: sel, shadow: true, shadowY: slabY + 0.4,
        });
        paintExtrude(c, sn.cx, wy, sn.cz, sn.hw, 3, sn.hd, sn.hw, col, amul * 0.55, { glass: true, dashed: true });
      } else {
        const rad = sn.shape === 'capsule' ? sn.hd : 24;
        paintExtrude(c, sn.cx, wy, sn.cz, sn.hw, sn.hh, sn.hd, rad, col, amul, {
          selected: sel, shadow: true, shadowY: slabY + 0.4,
        });
        if (sn.childCount > 0 && !sn.expanded) {
          paintExtrude(c, sn.cx, wy + sn.hh + 5, sn.cz, sn.hw * 0.88, 3, sn.hd * 0.88, rad, col, amul * 0.85, { selected: sel });
        }
      }
    };

    // Hierarchical Architectural Painter's Order (slabs -> nodes -> conduits)
    for (let passIdx = 0; passIdx < sortedSlabs.length; passIdx++) {
      const sb = sortedSlabs[passIdx]!;
      if (ctx) {
        const crossBelow = conduits.filter((cd) => !cd.lit && !cd.sameSlab && cd.maxPass === passIdx).sort((a, b) => b.z - a.z);
        for (const cd of crossBelow) cd.draw(ctx);
      }
      paintSlab(ctx, sb);
      const slabNodes = nodesBySlab.get(sb.id) ?? [];
      for (const entry of slabNodes) paintNode(ctx, entry);
      if (ctx) {
        const sameAbove = conduits.filter((cd) => !cd.lit && cd.sameSlab && cd.maxPass === passIdx).sort((a, b) => b.z - a.z);
        for (const cd of sameAbove) cd.draw(ctx);
      }
    }
    if (ctx) {
      const litConduits = conduits.filter((cd) => cd.lit).sort((a, b) => b.z - a.z);
      for (const cd of litConduits) cd.draw(ctx);
    }

    // Anchor Layer Zone Header Pills cleanly outside slab boundaries first so node badges also avoid them.
    const zonePlacements: { sb: SpatialSlab; tx: number; ty: number; zw: number; zh: number; label: string }[] = [];
    const badgeObstacles: { x: number; y: number; bw: number; bh: number }[] = [];
    for (const sb of d.spatial.slabs as SpatialSlab[]) {
      const pt = proj(sb.anchorPos[0], yOf(sb.anchorPos[1]) + (sb.anchorPos[1] - sb.cy), sb.anchorPos[2]);
      const el = zoneRefs.current.get(sb.id);
      const label = `L${sb.layer.order ?? 0} · ${d.L(sb.layer.name) || sb.id}`;
      const zw = el?.offsetWidth ? el.offsetWidth : Math.ceil(measureText(label, 10.5) + 64);
      const zh = el?.offsetHeight ? el.offsetHeight : 25;
      const tx = sb.anchorAlign === 'right'
        ? pt.x
        : sb.anchorAlign === 'center'
          ? pt.x - zw / 2
          : pt.x - zw;
      const ty = pt.y - 12;
      track(tx - 4, ty - 4);
      track(tx + zw + 4, ty + zh + 4);
      zonePlacements.push({ sb, tx, ty, zw, zh, label });
      badgeObstacles.push({ x: tx + zw / 2, y: ty + zh / 2, bw: zw + 8, bh: zh + 8 });
      if (opts.renderDOM && el) {
        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
      }
    }

    // 4. Perspective-Project & De-Overlap Badges
    const sortedBadges = [...projNodes.values()].sort((a, b) => b.z - a.z);
    const placed: { item: typeof sortedBadges[number]; x: number; y: number; bw: number; bh: number; title: string; sub: string }[] = [];
    const tries: [number, number][] = [
      [0, 0], [0, -40], [0, 40], [-164, 0], [164, 0],
      [-164, -40], [164, -40], [0, -80], [0, 80], [-164, 40], [164, 40],
      [-192, -42], [192, -42], [-192, 42], [192, 42],
      [-110, 48], [110, 48], [-110, -48], [110, -48],
      [0, -120], [0, 120], [-230, 0], [230, 0],
    ];
    const compactDensity = sortedBadges.length > 26 && cam.zoom < 0.85;

    for (const item of sortedBadges) {
      const titleText = d.L(item.sn.node.name) || item.sn.node.id;
      const subText = item.sn.childCount > 0 && !item.sn.expanded
        ? `+${item.sn.childCount} ${d.U('common.nodes')}`
        : (item.sn.node.techStack?.[0] ?? kindLabel(item.sn.node.kind, d.locale));
      const extraExpandW = item.sn.childCount > 0 ? 30 : 0;
      const estBw = Math.min(220, Math.max(126, measureText(titleText, 12) + 54 + extraExpandW));
      const estBh = compactDensity && !item.sn.expanded && item.sn.node.id !== d.selected ? 26 : 36;
      const domEl = opts.renderDOM ? nodeRefs.current.get(item.sn.node.id) : undefined;
      const bw = domEl?.offsetWidth ? domEl.offsetWidth : estBw;
      const bh = domEl?.offsetHeight ? domEl.offsetHeight : estBh;
      const baseY = item.sy - 14;

      let bestX = item.sx;
      let bestY = baseY;
      let bestOverlap = Infinity;
      for (const [dx, dy] of tries) {
        const cx = item.sx + dx;
        const cy = baseY + dy;
        let area = 0;
        for (const q of placed) {
          const ix = Math.min(cx + bw / 2 + 4, q.x + q.bw / 2 + 4) - Math.max(cx - bw / 2 - 4, q.x - q.bw / 2 - 4);
          const iy = Math.min(cy + bh / 2 + 4, q.y + q.bh / 2 + 4) - Math.max(cy - bh / 2 - 4, q.y - q.bh / 2 - 4);
          if (ix > 0 && iy > 0) area += ix * iy;
        }
        for (const ob of badgeObstacles) {
          const ix = Math.min(cx + bw / 2, ob.x + ob.bw / 2) - Math.max(cx - bw / 2, ob.x - ob.bw / 2);
          const iy = Math.min(cy + bh / 2, ob.y + ob.bh / 2) - Math.max(cy - bh / 2, ob.y - ob.bh / 2);
          if (ix > 0 && iy > 0) area += ix * iy;
        }
        if (area === 0) {
          bestX = cx;
          bestY = cy;
          bestOverlap = 0;
          break;
        }
        if (area < bestOverlap) {
          bestOverlap = area;
          bestX = cx;
          bestY = cy;
        }
      }
      placed.push({ item, x: bestX, y: bestY, bw, bh, title: titleText, sub: subText });
      track(bestX - bw / 2 - 4, bestY - bh / 2 - 4);
      track(bestX + bw / 2 + 4, bestY + bh / 2 + 4);
      if (ctx && Math.hypot(bestX - item.sx, bestY - baseY) > 26) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(item.sx, item.sy - 2);
        ctx.lineTo(bestX, bestY);
        ctx.strokeStyle = alpha(toHex(item.col), item.dim ? 0.14 : 0.42);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(item.sx, item.sy - 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = alpha(toHex(item.col), item.dim ? 0.22 : 0.72);
        ctx.fill();
        ctx.restore();
      }
      if (opts.renderDOM && domEl) {
        domEl.style.zIndex = String(Math.round(2000 - item.z));
        domEl.style.transform = `translate3d(${(bestX - bw / 2).toFixed(1)}px, ${(bestY - bh / 2).toFixed(1)}px, 0)`;
      }
    }

    // Draw crisp badges onto canvas during PNG export (sorted back -> front)
    if (ctx && opts.drawCanvasBadges) {
      const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        c.beginPath();
        c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
      };
      for (const zp of zonePlacements) {
        if (opts.clipBadges && opts.viewportW && opts.viewportH) {
          if (zp.tx + zp.zw < 0 || zp.ty + zp.zh < 0 || zp.tx > opts.viewportW || zp.ty > opts.viewportH) continue;
        }
        ctx.save();
        roundRect(ctx, zp.tx, zp.ty, zp.zw, zp.zh, 999);
        ctx.fillStyle = d.th.hudStrong;
        ctx.fill();
        ctx.strokeStyle = alpha(zp.sb.color, 0.42);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(zp.tx + 13, zp.ty + zp.zh / 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = zp.sb.color;
        ctx.fill();

        ctx.fillStyle = zp.sb.color;
        ctx.font = '700 10.5px "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(zp.label, zp.tx + 22, zp.ty + zp.zh / 2 + 0.5);

        const cntStr = String(zp.sb.nodeCount);
        const cw = Math.max(16, cntStr.length * 6 + 8);
        const cx = zp.tx + zp.zw - cw - 5;
        roundRect(ctx, cx, zp.ty + (zp.zh - 15) / 2, cw, 15, 999);
        ctx.fillStyle = alpha(zp.sb.color, 0.16);
        ctx.fill();
        ctx.font = '700 9.5px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cntStr, cx + cw / 2, zp.ty + zp.zh / 2 + 0.5);
        ctx.restore();
      }

      for (const b of placed) {
        const el = nodeRefs.current.get(b.item.sn.node.id);
        const domRect = el?.getBoundingClientRect();
        const bw = domRect?.width ? domRect.width : b.bw;
        const bh = domRect?.height ? domRect.height : b.bh;
        const x = b.x - bw / 2;
        const y = b.y - bh / 2;
        if (opts.clipBadges && opts.viewportW && opts.viewportH) {
          if (x + bw < 0 || y + bh < 0 || x > opts.viewportW || y > opts.viewportH) continue;
        }
        const nid = b.item.sn.node.id;
        const brand = brandFor(...(b.item.sn.node.techStack ?? []), b.title);
        const sel = d.selected === nid;
        const col = b.item.col;

        ctx.save();
        ctx.globalAlpha = b.item.dim ? 0.22 : 1;
        roundRect(ctx, x, y, bw, bh, 15);
        ctx.fillStyle = d.th.hudStrong;
        ctx.fill();
        ctx.strokeStyle = sel ? d.th.accent : alpha(col, 0.44);
        ctx.lineWidth = sel ? 1.8 : 1;
        ctx.stroke();

        // Top specular rim
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 0.8);
        ctx.lineTo(x + bw - 14, y + 0.8);
        ctx.strokeStyle = d.th.specular;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Icon tile
        const ix = x + 6;
        const iy = y + (bh - 24) / 2;
        roundRect(ctx, ix, iy, 24, 24, 8);
        ctx.fillStyle = brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.94)') : alpha(col, 0.16);
        ctx.fill();
        ctx.strokeStyle = brand ? (brand.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)') : alpha(col, 0.35);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        const img = opts.iconImages?.get(nid);
        if (img) {
          ctx.drawImage(img, ix + 4, iy + 4, 16, 16);
        } else {
          ctx.fillStyle = col;
          ctx.font = '800 9.5px ui-monospace, SFMono-Regular, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.title.slice(0, 2).toUpperCase(), ix + 12, iy + 12);
        }

        // Title & Subtitle
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = d.th.text;
        ctx.font = '700 11.5px "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
        ctx.fillText(b.title, x + 36, compactDensity && bh < 30 ? y + bh / 2 : y + bh * 0.36);
        if (!compactDensity || bh >= 30) {
          ctx.fillStyle = d.th.sub;
          ctx.font = '500 9.5px ui-monospace, SFMono-Regular, monospace';
          ctx.fillText(b.sub, x + 36, y + bh * 0.72);
        }

        if (b.item.sn.childCount > 0) {
          const exTxt = b.item.sn.expanded ? '−' : `+${b.item.sn.childCount}`;
          const ew = Math.max(20, exTxt.length * 6 + 8);
          const ex = x + bw - ew - 6;
          roundRect(ctx, ex, y + (bh - 18) / 2, ew, 18, 999);
          ctx.fillStyle = alpha(col, 0.16);
          ctx.fill();
          ctx.strokeStyle = alpha(col, 0.34);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.fillStyle = col;
          ctx.font = '800 10px ui-monospace, SFMono-Regular, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(exTxt, ex + ew / 2, y + bh / 2 + 0.5);
        }
        ctx.restore();
      }
    }

    return {
      bounds: Number.isFinite(minX)
        ? { minX, minY, maxX, maxY }
        : { minX: -240, minY: -180, maxX: 240, maxY: 180 },
    };
  };

  const drawScene = (timeSec: number) => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !drawDataRef.current) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(w * dpr), thPx = Math.round(h * dpr);
    if (canvas.width !== tw || canvas.height !== thPx) {
      canvas.width = tw;
      canvas.height = thPx;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Shift origin right on wide screens (clearing Left Layer Dock) and down slightly on mobile (clearing stacked top HUD).
    const xCenter = w / 2 + (w > 980 ? 48 : 0);
    const yCenter = h / 2 + (w <= 767 ? 42 : 8);
    render3DFrame(ctx, xCenter, yCenter, camRef.current, timeSec, { renderDOM: true });
  };

  // Expose full unclipped 3D PNG exporter onto #archray-scene.
  useEffect(() => {
    const stageEl = stageRef.current as (HTMLDivElement & { __archrayExport3D?: (opts: { full?: boolean; scale?: number }) => Promise<HTMLCanvasElement> }) | null;
    if (!stageEl) return;
    stageEl.__archrayExport3D = async ({ full = false, scale = 2 } = {}) => {
      const d = drawDataRef.current;
      const thCur: Theme = d.th;

      // Pre-rasterize live node icons via data URI SVG so exports include brand & kind marks cleanly offline.
      const iconImages = new Map<string, HTMLImageElement>();
      await Promise.all([...nodeRefs.current.entries()].map(async ([nid, el]) => {
        const svgEl = el.querySelector<SVGSVGElement>('.ar-node-icon3d svg');
        if (!svgEl) return;
        try {
          const clone = svgEl.cloneNode(true) as SVGSVGElement;
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const cs = getComputedStyle(svgEl);
          if (!clone.getAttribute('color') && cs.color) clone.setAttribute('color', cs.color);
          if (clone.getAttribute('stroke') === 'currentColor' && cs.color) clone.setAttribute('stroke', cs.color);
          clone.setAttribute('width', svgEl.getAttribute('width') || '16');
          clone.setAttribute('height', svgEl.getAttribute('height') || '16');
          const xml = new XMLSerializer().serializeToString(clone);
          const img = new Image();
          await new Promise<void>((res) => {
            img.onload = () => { iconImages.set(nid, img); res(); };
            img.onerror = () => res();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
          });
        } catch { /* fallback monogram handled in badge draw */ }
      }));

      let outW: number, outH: number, xCenter: number, yCenter: number, exportCam: CamState;
      if (full) {
        exportCam = { yaw: camRef.current.yaw, pitch: camRef.current.pitch, zoom: 1.0, tx: 0, ty: 0 };
        const { bounds } = render3DFrame(null, 0, 0, exportCam, 0.25, { renderDOM: false });
        const pad = 72;
        outW = Math.max(420, Math.ceil(bounds.maxX - bounds.minX + pad * 2));
        outH = Math.max(320, Math.ceil(bounds.maxY - bounds.minY + pad * 2));
        xCenter = -bounds.minX + pad;
        yCenter = -bounds.minY + pad;
      } else {
        const rect = stageEl.getBoundingClientRect();
        outW = Math.max(1, Math.round(rect.width));
        outH = Math.max(1, Math.round(rect.height));
        xCenter = outW / 2 + (outW > 980 ? 48 : 0);
        yCenter = outH / 2 + (outW <= 767 ? 42 : 8);
        exportCam = { ...camRef.current };
      }

      const effScale = Math.min(scale, 5120 / Math.max(outW, outH, 1));
      const out = document.createElement('canvas');
      out.width = Math.round(outW * effScale);
      out.height = Math.round(outH * effScale);
      const octx = out.getContext('2d')!;
      octx.scale(effScale, effScale);

      // Paint Style B backdrop + nebula glows + subtle spatial grid
      octx.fillStyle = thCur.bg;
      octx.fillRect(0, 0, outW, outH);
      for (const [gx, gy, gr, gcol] of [
        [outW * 0.24, outH * 0.16, outW * 0.45, thCur.glow1],
        [outW * 0.78, outH * 0.78, outW * 0.42, thCur.glow2],
        [outW * 0.62, outH * 0.28, outW * 0.35, thCur.glow3],
      ] as const) {
        const grad = octx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grad.addColorStop(0, gcol);
        grad.addColorStop(1, 'transparent');
        octx.fillStyle = grad;
        octx.fillRect(0, 0, outW, outH);
      }

      render3DFrame(octx, xCenter, yCenter, exportCam, 0.25, {
        renderDOM: false,
        drawCanvasBadges: true,
        clipBadges: !full,
        viewportW: outW,
        viewportH: outH,
        iconImages,
      });

      return out;
    };
    return () => { delete stageEl.__archrayExport3D; };
  }, []);

  // Animation loop + immediate synchronous paint on state updates.
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      const cam = camRef.current;
      const tgt = targetCamRef.current;
      let settling = false;
      (['yaw', 'pitch', 'zoom', 'tx', 'ty'] as const).forEach((k) => {
        const diff = tgt[k] - cam[k];
        if (Math.abs(diff) > 0.0008) {
          cam[k] += diff * 0.2;
          settling = true;
        } else {
          cam[k] = tgt[k];
        }
      });
      drawScene(now * 0.001);
      if (settling || (p.motion === 'full' && (p.activeEdges || hovered || p.selected || vis.edges.length > 0))) {
        raf = requestAnimationFrame(tick);
      }
    };
    // Paint immediately so snapshots never observe a blank frame.
    camRef.current = { ...camRef.current };
    drawScene(0.25);
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [spatial, th, p.explode, p.motion, p.selected, hovered, p.activeEdges, p.highlight, p.context, p.lens, locale, viewport, p.cameraCmd.seq]);

  const snapOrAnimate = () => {
    if (p.motion !== 'full') {
      camRef.current = { ...targetCamRef.current };
      drawScene(0.25);
    }
  };

  // Pointer orbit / pan / wheel zoom interactions.
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number; tx: number; ty: number; pan: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    moved.current = false;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: targetCamRef.current.yaw,
      pitch: targetCamRef.current.pitch,
      tx: targetCamRef.current.tx,
      ty: targetCamRef.current.ty,
      pan: e.button === 2 || e.shiftKey || e.altKey,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 3) moved.current = true;
    if (d.pan) {
      targetCamRef.current.tx = d.tx + dx / Math.max(0.4, targetCamRef.current.zoom);
      targetCamRef.current.ty = d.ty - dy / Math.max(0.4, targetCamRef.current.zoom);
    } else {
      targetCamRef.current.yaw = d.yaw + dx * 0.0065;
      targetCamRef.current.pitch = clamp(d.pitch + dy * 0.0055, 0.08, 1.30);
    }
    snapOrAnimate();
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.91 : 1.1;
    const next = clamp(targetCamRef.current.zoom * factor, 0.45, 2.5);
    targetCamRef.current.zoom = next;
    p.onCameraZoom?.(next);
    snapOrAnimate();
  };

  const layerColorMap = useMemo(() => new Map(spatial.slabs.map((s) => [s.id, s.color])), [spatial.slabs]);

  return (
    <div id="archray-scene" ref={stageRef} className="ar-stage-3d" onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (!moved.current) p.onSelect(null); }}>
      <canvas id="archray-canvas-3d" ref={canvasRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
      <div className="ar-labels-3d" aria-label="3D architecture labels">
        {spatial.slabs.map((sb) => (
          <div key={sb.id}
            ref={(el) => { if (el) zoneRefs.current.set(sb.id, el); else zoneRefs.current.delete(sb.id); }}
            className="ar-zone-3d"
            data-color={sb.color}
            style={{
              background: th.hudStrong,
              borderColor: alpha(sb.color, 0.38),
              color: sb.color,
            }}>
            <span className="ar-zone-dot" style={{ background: sb.color, boxShadow: `0 0 8px ${sb.color}` }} />
            <span>{`L${sb.layer.order ?? 0} · ${L(sb.layer.name) || sb.id}`}</span>
            <span className="ar-zone-count" style={{ background: alpha(sb.color, 0.16), color: sb.color }}>{sb.nodeCount}</span>
          </div>
        ))}

        {spatial.nodes.map((sn) => {
          const n = sn.node;
          const title = L(n.name) || n.id;
          const col = nodeColor(n, layerColorMap.get(sn.layerId) ?? sn.color);
          const sel = p.selected === n.id;
          const dim = isDimmed(n.id);
          const brand = brandFor(...(n.techStack ?? []), title);
          const SpecIcon = kindSpec(n.kind).icon;
          const subText = sn.childCount > 0 && !sn.expanded
            ? `+${sn.childCount} ${U('common.nodes')}`
            : (n.techStack?.[0] ?? kindLabel(n.kind, locale));

          return (
            <div key={n.id}
              ref={(el) => { if (el) nodeRefs.current.set(n.id, el); else nodeRefs.current.delete(n.id); }}
              data-node={n.id}
              className={`ar-node-3d${sel ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`}
              style={{
                background: th.hudStrong,
                borderColor: sel ? th.accent : alpha(col, 0.42),
                boxShadow: sel ? `0 0 22px ${alpha(th.accent, 0.38)}` : undefined,
              }}
              onPointerEnter={() => setHovered(n.id)}
              onPointerLeave={() => setHovered((cur) => (cur === n.id ? null : cur))}
              onClick={(e) => { e.stopPropagation(); p.onSelect(n.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); if (hasChildren(idx, n.id)) p.onOpen(n.id); }}>
              <span className="ar-node-icon3d" style={{
                background: brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.94)') : alpha(col, 0.16),
                borderColor: brand ? (brand.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)') : alpha(col, 0.35),
              }}>
                {brand ? <BrandGlyph brand={brand} size={15} /> : <SpecIcon size={13} color={col} />}
              </span>
              <span className="ar-node-copy3d">
                <span className="ar-node-title">{title}</span>
                <span className="ar-node-sub3d" style={{ color: th.sub }}>{subText}</span>
              </span>
              {(p.lens === 'health' || p.lens === 'replaceability') && (
                <span className="ar-node-dot3d" style={{ background: col, boxShadow: `0 0 7px ${col}` }} />
              )}
              {sn.childCount > 0 && p.onToggleExpand && (
                <button type="button" className="ar-node-expand3d"
                  style={{ color: col, background: alpha(col, 0.14), borderColor: alpha(col, 0.32) }}
                  title={U(sn.expanded ? 'inspector.collapseChildren' : 'inspector.expandChildren')}
                  onClick={(e) => { e.stopPropagation(); p.onToggleExpand?.(n.id); }}>
                  {sn.expanded ? '−' : `+${sn.childCount}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
