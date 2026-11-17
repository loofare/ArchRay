/**
 * Projections map the planar layout to screen space.
 * All are monotonic in y and affine per layer band → planar invariants are preserved.
 */
import type { Box, PlanarLayout, Pt } from './layout';

export type ProjectionId = 'flat' | 'iso' | 'stack';

export interface Projection {
  id: ProjectionId;
  /** plane point -> screen point */
  project(p: Pt): Pt;
  /** is the plane drawn tilted (nodes become 3D slabs)? */
  tilted: boolean;
  /** visual extrusion height (px) for slabs in this projection */
  depth: number;
}

const ISO = (30 * Math.PI) / 180;

export function makeProjection(id: ProjectionId, layout: PlanarLayout): Projection {
  if (id === 'flat') return { id, project: (p) => p, tilted: false, depth: 0 };

  if (id === 'iso') {
    // classic 2:1 dimetric, x axis -> right-down, y axis -> left-down
    const c = Math.cos(ISO), s = Math.sin(ISO);
    return { id, tilted: true, depth: 14, project: (p) => ({ x: (p.x - p.y) * c, y: (p.x + p.y) * s }) };
  }

  // stack: each layer band is a floor seen from above-front: y compressed, x sheared, floors separated by lift.
  const bands = [...layout.bands].sort((a, b) => a.y - b.y);
  const SY = 0.52; // vertical foreshortening
  const SHEAR = 0.62; // x shift per unit of (compressed) depth within the plane
  const LIFT = 56; // extra vertical gap between floors (screen px)
  const bandIndexAt = (y: number) => {
    let idx = 0;
    for (let i = 0; i < bands.length; i++) if (y >= bands[i]!.y - 0.01) idx = i;
    return idx;
  };
  return {
    id,
    tilted: true,
    depth: 12,
    project: (p) => {
      const i = bands.length ? bandIndexAt(p.y) : 0;
      const b = bands[i];
      const local = b ? p.y - b.y : p.y;
      const base = b ? b.y : 0;
      // shear is relative to band top so every floor is a parallelogram aligned on the left edge
      return { x: p.x - local * SY * SHEAR, y: base * SY + local * SY + i * LIFT };
    },
  };
}

export function projectBox(pr: Projection, b: Box): [Pt, Pt, Pt, Pt] {
  return [
    pr.project({ x: b.x, y: b.y }),
    pr.project({ x: b.x + b.w, y: b.y }),
    pr.project({ x: b.x + b.w, y: b.y + b.h }),
    pr.project({ x: b.x, y: b.y + b.h }),
  ];
}

export function projectedBounds(pr: Projection, layout: PlanarLayout, pad = 80): Box {
  const pts: Pt[] = [];
  const add = (b: Box) => pts.push(...projectBox(pr, b));
  layout.bands.forEach(add);
  layout.nodes.forEach(add);
  layout.groups.forEach(add);
  if (pts.length === 0) return { x: 0, y: 0, w: 100, h: 100 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad - 40;
  return { x: x0, y: y0, w: Math.max(...xs) - x0 + pad, h: Math.max(...ys) - y0 + pad };
}

/** Project a polyline; for piecewise projections (stack) split segments at band boundaries so shapes stay correct. */
export function projectPolyline(pr: Projection, layout: PlanarLayout, pts: Pt[]): Pt[] {
  if (pr.id !== 'stack' || layout.bands.length < 2) return pts.map(pr.project);
  const cuts = layout.bands.map((b) => b.y).sort((a, b) => a - b).slice(1);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i > 0) {
      const q = pts[i - 1]!;
      const lo = Math.min(p.y, q.y), hi = Math.max(p.y, q.y);
      const between = cuts.filter((c) => c > lo && c < hi);
      if (q.y > p.y) between.reverse();
      for (const c of between) {
        const t = (c - q.y) / (p.y - q.y);
        const x = q.x + (p.x - q.x) * t;
        out.push(pr.project({ x, y: c - 0.02 }), pr.project({ x, y: c + 0.02 }));
      }
    }
    out.push(pr.project(p));
  }
  return out;
}
