import { useMemo } from 'react';
import {
  t, measureText, makeProjection, projectBox, projectedBounds, projectPolyline,
  type ArchNode, type GraphIndex, type PlanarLayout, type ProjectionId, type Pt, type ScenarioDiff,
} from '@archray/core';
import { kindSpec, kindLabel } from './kinds';
import { alpha, LAYER_FALLBACK, type Theme } from './theme';

export type Lens = 'topology' | 'health' | 'replaceability' | 'flow';

export interface SceneProps {
  idx: GraphIndex;
  layout: PlanarLayout;
  projection: ProjectionId;
  theme: Theme;
  locale: string;
  lens: Lens;
  selected: string | null;
  highlight: Set<string> | null;
  activeEdges: Set<string> | null;
  diff: ScenarioDiff | null;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
}

const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

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
  const { idx, layout, theme: th, locale } = p;
  const def = idx.graph.meta.defaultLocale ?? idx.graph.meta.locales[0] ?? 'en';
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, def);
  const pr = useMemo(() => makeProjection(p.projection, layout), [p.projection, layout]);
  const vb = useMemo(() => projectedBounds(pr, layout), [pr, layout]);
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
  const dim = (id: string) => p.highlight !== null && !p.highlight.has(id);

  const slab = (b: { x: number; y: number; w: number; h: number }, top: string, side: string, stroke: string, sw = 1, dash?: string) => {
    const [a, bq, c, d] = projectBox(pr, b);
    const dz = pr.tilted ? pr.depth : 0;
    const down = (q: Pt) => ({ x: q.x, y: q.y + dz });
    return (
      <g>
        {dz > 0 && <polygon points={poly([d, c, down(c), down(d)])} fill={side} />}
        {dz > 0 && <polygon points={poly([bq, c, down(c), down(bq)])} fill={side} opacity={0.75} />}
        <polygon points={poly([a, bq, c, d])} fill={top} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round" />
      </g>
    );
  };

  // label placement: flat text is placed in plane coords; tilted views use an affine matrix so text lies on the slab
  const onPlane = (b: { x: number; y: number }, children: React.ReactNode, key?: string) => {
    const o = pr.project(b), ex = pr.project({ x: b.x + 1, y: b.y }), ey = pr.project({ x: b.x, y: b.y + 1 });
    // keep glyphs upright & unsquashed: only horizontal scale + translation; shear moves the anchor, not the text
    const sy = Math.max(0.78, Math.hypot(ey.x - o.x, ey.y - o.y));
    const m = pr.id === 'iso'
      ? `matrix(${ex.x - o.x} ${ex.y - o.y} ${ey.x - o.x} ${ey.y - o.y} ${o.x} ${o.y})`
      : `matrix(${ex.x - o.x} 0 0 ${sy} ${o.x} ${o.y})`;
    return <g key={key} transform={m}>{children}</g>;
  };

  return (
    <svg id="archray-scene" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width="100%" height="100%"
      style={{ fontFamily: 'var(--ar-font)' }} onClick={() => p.onSelect(null)}>
      <defs>
        <marker id="ar-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" fill={th.edge} />
        </marker>
        <marker id="ar-arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" fill={th.accent} />
        </marker>
      </defs>

      {/* bands */}
      {layout.bands.map((b) => {
        const c = layerColor.get(b.layer.id) ?? th.faint;
        return (
          <g key={b.layer.id}>
            {slab(b, alpha(c, th.bandAlpha), alpha(c, th.bandSideAlpha), alpha(c, 0.35), 1)}
            {onPlane({ x: b.x + 16, y: b.y + 26 },
              <text fontSize={13} fontWeight={700} fill={c} letterSpacing={0.6}>{L(b.layer.name).toUpperCase()}</text>)}
          </g>
        );
      })}

      {/* groups */}
      {layout.groups.map((g) => {
        const n = idx.byId.get(g.id)!;
        return (
          <g key={g.id} opacity={dim(g.id) ? 0.3 : 1} style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); p.onSelect(g.id); }}>
            {slab(g, th.groupFill, alpha(kindSpec(n.kind).hue, 0.15), p.selected === g.id ? th.accent : th.groupStroke, 1.2, '6 4')}
            {onPlane({ x: g.x + 14, y: g.y + 25 },
              <text fontSize={13} fontWeight={600} fill={th.sub}>{fit(L(n.name), 13, g.w - 28)[0]}</text>)}
          </g>
        );
      })}

      {/* edges */}
      {layout.edges.map((e) => {
        const pts = projectPolyline(pr, layout, e.points);
        const active = p.activeEdges?.has(e.id) ?? false;
        const faded = (p.highlight && !(p.highlight.has(e.source) && p.highlight.has(e.target))) || (p.activeEdges && !active);
        const ve = idx.edgeById.get(e.id);
        const async_ = ve?.mode === 'async';
        const removed = p.diff?.removedEdges.has(e.id);
        const added = p.diff?.addedEdges.has(e.id);
        const color = active ? th.accent : removed ? th.critical : added ? th.planned : faded ? th.edgeDim : th.edge;
        return (
          <g key={e.id}>
            <polyline points={poly(pts)} fill="none" stroke={color} strokeWidth={active ? 2.4 : 1.4}
              strokeDasharray={async_ || removed ? '5 5' : added ? '8 4' : undefined} strokeLinejoin="round"
              markerEnd={faded ? undefined : active ? 'url(#ar-arrow-hi)' : 'url(#ar-arrow)'} />
            {active && <polyline className="ar-flow" points={poly(pts)} fill="none" stroke={th.accent} strokeWidth={4}
              strokeDasharray="4 20" strokeLinecap="round" opacity={0.9} />}
          </g>
        );
      })}

      {/* nodes */}
      {layout.nodes.map((ln) => {
        const n = idx.byId.get(ln.id)!;
        const spec = kindSpec(n.kind);
        const Icon = spec.icon;
        const sel = p.selected === n.id;
        const st = status(n);
        const planned = n.lifecycle === 'planned' || p.diff?.added.has(n.id);
        const deprecated = n.lifecycle === 'deprecated' || p.diff?.removed.has(n.id);
        const hasKids = idx.children.get(n.id)?.length;
        const title = L(n.name);
        const sub = L(n.summary) || kindLabel(n.kind, locale);
        const tw = ln.w - 62;
        return (
          <g key={n.id} opacity={dim(n.id) ? 0.22 : deprecated ? 0.55 : 1} style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); p.onSelect(n.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); if (hasKids) p.onOpen(n.id); }}>
            {pr.tilted && <polygon points={poly(projectBox(pr, { ...ln, x: ln.x + 6, y: ln.y + 10 }))} fill={th.shadow} />}
            {slab(ln, th.nodeTop, alpha(st, 0.55), sel ? th.accent : planned ? th.planned : th.nodeStroke, sel ? 2.2 : 1.1, planned ? '6 4' : undefined)}
            {onPlane({ x: ln.x, y: ln.y }, <>
              <rect x={0} y={0} width={4} height={ln.h} rx={2} fill={st} />
              <rect x={14} y={(ln.h - 34) / 2} width={34} height={34} rx={9} fill={alpha(spec.hue, 0.14)} />
              <Icon x={21} y={(ln.h - 20) / 2} width={20} height={20} color={spec.hue} strokeWidth={2} />
              <text x={58} y={ln.h / 2 - 3} fontSize={15} fontWeight={600} fill={th.text}
                textDecoration={deprecated ? 'line-through' : undefined}>{fit(title, 15, tw)[0]}</text>
              <text x={58} y={ln.h / 2 + 16} fontSize={12} fill={th.sub}>{fit(sub, 12, tw)[0]}</text>
              {hasKids ? <text x={ln.w - 12} y={16} fontSize={11} textAnchor="end" fill={th.faint}>⊞ {hasKids}</text> : null}
              {(p.lens === 'health' || p.lens === 'replaceability') && <circle cx={ln.w - 10} cy={ln.h - 10} r={4} fill={st} className="ar-pulse" />}
            </>)}
          </g>
        );
      })}
    </svg>
  );
}
