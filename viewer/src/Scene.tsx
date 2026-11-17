import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  t, measureText, makeProjection, projectBox, projectedBounds, projectPolyline,
  type ArchNode, type GraphIndex, type PlanarLayout, type ProjectionId, type Pt, type ScenarioDiff,
} from '@archray/core';
import { kindSpec, kindLabel } from './kinds';
import { alpha, LAYER_FALLBACK, type Theme } from './theme';
import { brandFor, BrandGlyph } from './brands';

export type Lens = 'topology' | 'health' | 'replaceability' | 'flow';

export interface Camera { x: number; y: number; zoom: number; rotate?: number }

export interface SceneProps {
  camera: Camera;
  cameraEpoch?: number;
  onCamera(c: Camera): void;
  idx: GraphIndex;
  layout: PlanarLayout;
  projection: ProjectionId;
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
}

const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** wrap text into ≤2 lines that fit width (CJK-aware measurement) */
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

export function Scene(p: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(p.camera);
  cameraRef.current = p.camera;
  const [dragging, setDragging] = useState<'pan' | 'rotate' | null>(null);
  const moved = useRef(false);
  const nodePress = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    mode: 'pan' | 'rotate'; x: number; y: number; px: number; py: number; cx: number; cy: number; rot: number;
    kx: number; ky: number; vx: number; vy: number; last: number;
  } | null>(null);
  const inertia = useRef<number | null>(null);
  const { idx, layout, theme: th, locale } = p;
  const def = idx.graph.meta.defaultLocale ?? idx.graph.meta.locales[0] ?? 'en';
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, def);
  const pr = useMemo(() => makeProjection(p.projection, layout), [p.projection, layout]);
  const vb = useMemo(() => projectedBounds(pr, layout), [pr, layout]);
  const rot = p.camera.rotate ?? 0;
  // Fixed world pivot: camera.x/y must not move the rotation centre, otherwise
  // zooming while rotated changes both the viewBox and the pivot (audit M6-R2-01).
  const center = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
  const layerColor = useMemo(() => {
    const m = new Map<string, string>();
    (idx.graph.layers ?? []).forEach((l, i) => m.set(l.id, l.color ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!));
    return m;
  }, [idx]);

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
  const dim = (id: string) => (p.highlight !== null && !p.highlight.has(id)) || (p.context?.has(id) === true && p.highlight?.has(id) !== true);
  const pathOf = (pts: Pt[]) => 'M' + pts.map((pt) => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' L ');
  const particleStep = Math.max(1, Math.ceil(layout.edges.length / 18));
  const labelScale = 1 / Math.max(0.1, p.camera.zoom);

  const slab = (
    b: { x: number; y: number; w: number; h: number },
    top: string, side: string, stroke: string, sw = 1, dash?: string, depth = pr.depth,
  ) => {
    const [a, bq, c, d] = projectBox(pr, b);
    const dz = pr.tilted ? depth : 0;
    const down = (q: Pt) => ({ x: q.x, y: q.y + dz });
    return (
      <g>
        {dz > 0 && <polygon points={poly([d, c, down(c), down(d)])} fill={side} />}
        {dz > 0 && <polygon points={poly([bq, c, down(c), down(bq)])} fill={side} opacity={0.72} />}
        <polygon points={poly([a, bq, c, d])} fill={top} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
        {dz > 0 && <polyline points={poly([a, bq, c])} fill="none" stroke={alpha('#FFFFFF', 0.13)} strokeWidth={1} />}
      </g>
    );
  };

  // Labels are positioned in screen space but drawn inside the rotated world group.
  // The local counter-rotation keeps type upright while the geometry turns.
  const upright = (anchor: Pt, children: ReactNode) => (
    <g transform={rot ? `rotate(${-rot} ${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)})` : undefined}>{children}</g>
  );

  const planeLabel = (b: { x: number; y: number }, children: ReactNode) => {
    const o = pr.project(b);
    const ex = pr.project({ x: b.x + 1, y: b.y });
    const ey = pr.project({ x: b.x, y: b.y + 1 });
    const sy = Math.max(0.78, Math.hypot(ey.x - o.x, ey.y - o.y));
    const m = pr.id === 'iso'
      ? `matrix(${ex.x - o.x} ${ex.y - o.y} ${ey.x - o.x} ${ey.y - o.y} ${o.x} ${o.y})`
      : `matrix(${ex.x - o.x} 0 0 ${sy} ${o.x} ${o.y})`;
    return upright(o, <g transform={m}>{children}</g>);
  };

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
    // Let node/group clicks reach their own handlers; only drag from background, or use right/Alt on a node.
    if (e.button === 0 && !e.altKey && target.closest('.ar-node, .ar-group')) {
      moved.current = false;
      nodePress.current = { x: e.clientX, y: e.clientY };
      return;
    }
    stopInertia();
    moved.current = false;
    const ctm = e.currentTarget.getScreenCTM();
    const kx = ctm && ctm.a ? 1 / ctm.a : 1;
    const ky = ctm && ctm.d ? 1 / ctm.d : 1;
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
      const nx = d.cx - dx * d.kx;
      const ny = d.cy - dy * d.ky;
      p.onCamera({ ...p.camera, x: nx, y: ny });
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

  const viewBox = `${vb.x + p.camera.x + vb.w * (1 - 1 / p.camera.zoom) / 2} ${vb.y + p.camera.y + vb.h * (1 - 1 / p.camera.zoom) / 2} ${vb.w / p.camera.zoom} ${vb.h / p.camera.zoom}`;
  const miniX = vb.x + p.camera.x + (vb.w - vb.w / p.camera.zoom) / 2;
  const miniY = vb.y + p.camera.y + (vb.h - vb.h / p.camera.zoom) / 2;

  return (
    <div className="ar-scene-wrap">
      <svg
        id="archray-scene"
        ref={svgRef}
        onWheel={(e) => zoomAt(e.clientX, e.clientY, e.deltaY)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; setDragging(null); }}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={(e) => {
          if ((e.target as Element).closest('.ar-node')) return;
          p.onCamera({ x: 0, y: 0, zoom: 1, rotate: 0 });
        }}
        viewBox={viewBox}
        width="100%"
        height="100%"
        className={`ar-scene ar-scene-${p.projection}${dragging ? ` is-${dragging}` : ''}`}
        style={{ touchAction: 'none', fontFamily: 'var(--ar-font)' }}
        onClick={() => { if (moved.current) { moved.current = false; return; } p.onSelect(null); }}
      >
        <defs>
          <marker id="ar-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,1 L9,5 L0,9 z" fill={th.edge} />
          </marker>
          <marker id="ar-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,1 L9,5 L0,9 z" fill={th.accent} />
          </marker>
          <pattern id="ar-grid" width={pr.tilted ? 107.855 : 24} height={pr.tilted ? 52.605 : 24} patternUnits="userSpaceOnUse">
            {pr.tilted
              ? <path d="M53.9 0 L107.9 26.3 L53.9 52.6 L0 26.3 Z" fill="none" stroke={alpha(th.bgDot, 0.42)} strokeWidth="0.8" />
              : <circle cx="1" cy="1" r="0.9" fill={th.bgDot} />}
          </pattern>
          <radialGradient id="ar-ambient" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor={th.accent} stopOpacity="0.10" />
            <stop offset="48%" stopColor={th.accent} stopOpacity="0.035" />
            <stop offset="100%" stopColor={th.bg} stopOpacity="0" />
          </radialGradient>
          <filter id="ar-node-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={th.accent} floodOpacity="0.42" />
          </filter>
        </defs>

        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#ar-ambient)" pointerEvents="none" />
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#ar-grid)" opacity={pr.tilted ? 0.75 : 0.55} pointerEvents="none" />

        <g transform={rot ? `rotate(${rot.toFixed(2)} ${center.x.toFixed(2)} ${center.y.toFixed(2)})` : undefined}>
          {/* layer trays */}
          {layout.bands.map((b, i) => {
            const c = layerColor.get(b.layer.id) ?? th.faint;
            const lp = pr.project({ x: b.x + 18, y: b.y + 22 });
            return (
              <g key={b.layer.id}>
                {slab(b, alpha(c, Math.min(0.22, th.bandAlpha * 2.1)), alpha(c, Math.min(0.46, th.bandSideAlpha * 1.35)), alpha(c, 0.62), 1.25, undefined, pr.depth + 5)}
                {upright(lp, <g transform={`translate(${lp.x.toFixed(1)},${lp.y.toFixed(1)}) scale(${labelScale.toFixed(3)})`}>
                  <rect x="0" y="-19" width={Math.max(200, L(b.layer.name).length * 7.8 + 62)} height="28" rx="8"
                    fill={th.bg} fillOpacity={0.92} stroke={alpha(c, 0.70)} strokeWidth="1.1" />
                  <circle cx="13" cy="-4" r="3.6" fill={c} />
                  <text x="24" y="1" fontSize="12" fontWeight="800" fill={c} letterSpacing="0.06em">
                    {`L${b.layer.order ?? i} · ${L(b.layer.name).toUpperCase()}`}
                  </text>
                </g>)}
              </g>
            );
          })}

          {/* groups */}
          {layout.groups.map((g) => {
            const n = idx.byId.get(g.id);
            if (!n) return null;
            return (
              <g key={g.id} className="ar-group" opacity={dim(g.id) ? 0.3 : 1} style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); if (moved.current) { moved.current = false; return; } p.onSelect(g.id); }}>
                {slab(g, th.groupFill, alpha(kindSpec(n.kind).hue, 0.16), p.selected === g.id ? th.accent : th.groupStroke, 1.2, '6 4', pr.depth + 2)}
                {planeLabel({ x: g.x + 14, y: g.y + 25 },
                  <text fontSize={13} fontWeight={600} fill={th.sub}>{fit(L(n.name), 13, g.w - 28)[0]}</text>)}
              </g>
            );
          })}

          {/* edges */}
          {layout.edges.map((e, edgeIndex) => {
            const pts = projectPolyline(pr, layout, e.points);
            const active = p.activeEdges?.has(e.id) ?? false;
            const faded = (p.highlight && !(p.highlight.has(e.source) && p.highlight.has(e.target))) || (p.activeEdges && !active);
            const ve = idx.edgeById.get(e.id);
            const async_ = ve?.mode === 'async';
            const removed = p.diff?.removedEdges.has(e.id);
            const added = p.diff?.addedEdges.has(e.id);
            const color = active ? th.accent : removed ? th.critical : added ? th.planned : faded ? th.edgeDim : alpha(th.accent, 0.82);
            return (
              <g key={e.id} className="ar-edge">
                <polyline points={poly(pts)} fill="none" stroke={color} strokeWidth={active ? 7 : 3} strokeLinejoin="round" opacity={active ? 0.16 : faded ? 0.03 : 0.07} />
                <polyline points={poly(pts)} fill="none" stroke={color} strokeWidth={active ? 2.6 : 1.55}
                  strokeDasharray={async_ || removed ? '5 5' : added ? '8 4' : undefined} strokeLinejoin="round"
                  markerEnd={faded ? undefined : active ? 'url(#ar-arrow-hi)' : 'url(#ar-arrow)'} />
                {p.motion !== 'off' && <polyline className="ar-current" points={poly(pts)} fill="none" stroke={th.accent}
                  strokeWidth={1.4} strokeDasharray="2 12" strokeLinecap="round" opacity={active ? 0.5 : faded ? 0.12 : 0.28} />}
                {active && p.motion !== 'off' && <polyline className="ar-flow" points={poly(pts)} fill="none" stroke={th.accent} strokeWidth={4}
                  strokeDasharray="4 20" strokeLinecap="round" opacity={0.9} />}
                {p.motion === 'full' && edgeIndex % particleStep === 0 && edgeIndex < particleStep * 18 && (
                  <circle className="ar-particle" r={1.8} fill={th.accent} opacity={0.9}>
                    <animateMotion path={pathOf(pts)} dur={`${2.6 + (edgeIndex % 5) * 0.45}s`}
                      begin={`${(edgeIndex % 7) * 0.32}s`} repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* nodes */}
          {layout.nodes.map((ln) => {
            const n = idx.byId.get(ln.id);
            if (!n) return null;
            const spec = kindSpec(n.kind);
            const Icon = spec.icon;
            const title = L(n.name);
            const brand = brandFor(...(n.techStack ?? []), title);
            const sel = p.selected === n.id;
            const st = status(n);
            const planned = n.lifecycle === 'planned' || p.diff?.added.has(n.id);
            const deprecated = n.lifecycle === 'deprecated' || p.diff?.removed.has(n.id);
            const hasKids = idx.children.get(n.id)?.length;
            const sub = L(n.summary) || kindLabel(n.kind, locale);
            const anchor = pr.project({ x: ln.x + ln.w / 2, y: ln.y + ln.h });
            const labelW = clamp(measureText(title, 13.5) + 48, 160, 248);
            return (
              <g key={n.id} data-node={n.id} className={`ar-node${sel ? ' is-selected' : ''}`}
                opacity={dim(n.id) ? 0.22 : deprecated ? 0.55 : 1}
                style={{ cursor: 'pointer' }}
                filter={sel ? 'url(#ar-node-glow)' : undefined}
                onClick={(e) => { e.stopPropagation(); if (moved.current) { moved.current = false; return; } p.onSelect(n.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); if (hasKids) p.onOpen(n.id); }}>
                <title>{`${title} · ${kindLabel(n.kind, locale)}${n.techStack?.length ? ` · ${n.techStack.join(', ')}` : ''}`}</title>
                {pr.tilted && <polygon points={poly(projectBox(pr, { ...ln, x: ln.x + 7, y: ln.y + 12 }))} fill={th.shadow} opacity={0.55} />}
                {slab(ln, th.nodeTop, alpha(st, 0.74), sel ? th.accent : planned ? th.planned : alpha(st, 0.88), sel ? 2.2 : 1.35, planned ? '6 4' : undefined, pr.tilted ? 15 : 0)}
                {pr.tilted && <polygon points={poly(projectBox(pr, ln))} fill={alpha(st, 0.17)} pointerEvents="none" />}

                {pr.tilted ? (
                  <>
                    {planeLabel({ x: ln.x, y: ln.y }, <>
                      <rect className="ar-status" x={0} y={0} width={4} height={ln.h} rx={2} fill={st} />
                      <ellipse cx={ln.w / 2} cy={ln.h / 2 + 9} rx={ln.w * 0.30} ry={9} fill={alpha(st, 0.13)} />
                      <rect x={(ln.w - 40) / 2} y={(ln.h - 40) / 2} width={40} height={40} rx={10}
                        fill={brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.96)') : alpha(spec.hue, 0.16)}
                        stroke={brand ? (brand.dark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.12)') : alpha(spec.hue, 0.35)} />
                      {brand
                        ? <BrandGlyph brand={brand} size={25} x={(ln.w - 40) / 2 + 8} y={(ln.h - 40) / 2 + 7} />
                        : <Icon x={(ln.w - 22) / 2} y={(ln.h - 22) / 2} width={22} height={22} color={spec.hue} strokeWidth={2} />}
                      {hasKids ? <text x={ln.w - 10} y={16} fontSize={11} textAnchor="end" fill={th.faint}>⊞ {hasKids}</text> : null}
                      <text x={ln.w / 2} y={ln.h - 8} fontSize={8.5} textAnchor="middle" fill={alpha(th.sub, 0.8)} letterSpacing="0.08em">{kindLabel(n.kind, locale).toUpperCase()}</text>
                    </>)}
                    {upright(anchor, <g transform={`translate(${anchor.x.toFixed(1)},${(anchor.y + 8 * labelScale).toFixed(1)}) scale(${labelScale.toFixed(3)})`}>
                      <rect x={-labelW / 2} y="0" width={labelW} height="43" rx="9"
                        fill={th.bg} fillOpacity={0.95} stroke={alpha(sel ? th.accent : st, 0.62)} strokeWidth={sel ? 1.5 : 1} />
                      <circle cx={-labelW / 2 + 11} cy="13" r="3.2" fill={st} />
                      <text x={-labelW / 2 + 21} y="17" fontSize="13.5" fontWeight="700" fill={th.text}>{fit(title, 13.5, labelW - 30)[0]}</text>
                      <text x={-labelW / 2 + 11} y="33" fontSize="10.5" fill={th.sub}>{fit(sub, 10.5, labelW - 22)[0]}</text>
                    </g>)}
                  </>
                ) : (
                  planeLabel({ x: ln.x, y: ln.y }, <>
                    <rect className="ar-status" x={0} y={0} width={4} height={ln.h} rx={2} fill={st} />
                    <rect x={14} y={(ln.h - 34) / 2} width={34} height={34} rx={9}
                      fill={brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.96)') : alpha(spec.hue, 0.14)}
                      stroke={brand ? (brand.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)') : 'none'} />
                    {brand
                      ? <BrandGlyph brand={brand} size={22} x={20} y={(ln.h - 34) / 2 + 6} />
                      : <Icon x={21} y={(ln.h - 20) / 2} width={20} height={20} color={spec.hue} strokeWidth={2} />}
                    <text x={58} y={ln.h / 2 - 6} fontSize={15} fontWeight={600} fill={th.text} paintOrder="stroke"
                      stroke={th.nodeTop} strokeWidth={3} strokeLinejoin="round"
                      textDecoration={deprecated ? 'line-through' : undefined}>{fit(title, 15, ln.w - 62)[0]}</text>
                    <text x={58} y={ln.h / 2 + 10} fontSize={12} fill={th.sub} paintOrder="stroke"
                      stroke={th.nodeTop} strokeWidth={3} strokeLinejoin="round">{fit(sub, 12, ln.w - 62)[0]}</text>
                    {hasKids ? <text x={ln.w - 12} y={16} fontSize={11} textAnchor="end" fill={th.faint}>⊞ {hasKids}</text> : null}
                    {(p.lens === 'health' || p.lens === 'replaceability') && <circle cx={ln.w - 10} cy={ln.h - 10} r={4} fill={st} className="ar-pulse" />}
                  </>)
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Minimap: click or drag to move the camera; useful when zoomed into a large graph. */}
      <MiniMap
        vb={vb} camera={p.camera} layout={layout} pr={pr} theme={th}
        viewport={{ x: miniX, y: miniY, w: vb.w / p.camera.zoom, h: vb.h / p.camera.zoom }}
        onCamera={(c) => { stopInertia(); p.onCamera(c); }}
      />
    </div>
  );
}

function MiniMap({ vb, camera, layout, pr, theme, viewport, onCamera }: {
  vb: { x: number; y: number; w: number; h: number };
  camera: Camera;
  layout: PlanarLayout;
  pr: ReturnType<typeof makeProjection>;
  theme: Theme;
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
    onCamera({ ...camera, x: loc.x - vb.x - vb.w / 2, y: loc.y - vb.y - vb.h / 2 });
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
        {layout.bands.map((b) => (
          <polygon key={b.layer.id} points={poly(projectBox(pr, b))}
            fill={alpha(b.layer.color ?? theme.accent, 0.08)} stroke={alpha(b.layer.color ?? theme.accent, 0.34)} strokeWidth="1" />
        ))}
        {layout.nodes.map((n) => {
          const pts = projectBox(pr, n);
          const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
          const x = Math.min(...xs), y = Math.min(...ys);
          return <rect key={n.id} x={x} y={y}
            width={Math.max(2, Math.max(...xs) - x)} height={Math.max(2, Math.max(...ys) - y)}
            rx="1" fill={alpha(theme.accent, 0.5)} />;
        })}
        <rect x={viewport.x} y={viewport.y} width={viewport.w} height={viewport.h}
          fill="none" stroke={theme.accent} strokeWidth="2" vectorEffect="non-scaling-stroke" rx="2" />
      </svg>
      <span className="ar-minimap-zoom">{Math.round(camera.zoom * 100)}%</span>
    </div>
  );
}
