import { validateView } from './validate';
import { graphLayers, parseLayers } from './layers';
import type { ArchGraph, ViewState } from './schema';

/** Recover supported view fields independently so one stale value cannot hide the graph. */
export function parseView(input: unknown, graph: ArchGraph): { view: ViewState; warnings: string[] } {
  const view: ViewState = { viewVersion: '1' };
  const warnings: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { view, warnings: ['invalid:view'] };
  const source = input as Record<string, unknown>;
  // URL params arrive as strings; accept `?layers=frontend,data`.
  let rawLayers: unknown = source.layers;
  let unknownLayers = false;
  if (typeof source.layers === 'string') {
    const parsed = parseLayers(source.layers);
    rawLayers = parsed.layers;
    unknownLayers = parsed.unknown.length > 0;
  } else if (Array.isArray(source.layers)) {
    const parsed = parseLayers(source.layers.map(String));
    rawLayers = parsed.layers;
    unknownLayers = parsed.unknown.length > 0;
  }
  const warn = (code: string) => { if (!warnings.includes(code)) warnings.push(code); };

  for (const key of ['locale', 'theme', 'projection', 'lens', 'focus', 'collapsed', 'layers', 'scenario', 'camera'] as const) {
    const value = key === 'layers' ? rawLayers : source[key];
    if (value === undefined) continue;
    const test = { viewVersion: '1', [key]: value };
    if (!validateView(test).ok) { warnings.push(`invalid:${key}`); continue; }
    (view as any)[key] = value;
  }

  const ids = new Set(graph.nodes.map((n) => n.id));
  if (view.locale && !graph.meta.locales.includes(view.locale)) { delete view.locale; warnings.push('stale:locale'); }
  if (view.focus && !ids.has(view.focus)) { delete view.focus; warnings.push('stale:focus'); }
  if (view.scenario && !graph.scenarios?.some((s) => s.id === view.scenario)) { delete view.scenario; warnings.push('stale:scenario'); }
  if (view.collapsed) {
    const kept = view.collapsed.filter((id) => ids.has(id));
    if (kept.length !== view.collapsed.length) warnings.push('stale:collapsed');
    view.collapsed = kept;
  }
  if (view.layers) {
    const available = new Set(graphLayers(graph));
    const kept = view.layers.filter((id) => available.has(id));
    if (kept.length !== view.layers.length || unknownLayers) warn('stale:layers');
    if (kept.length) view.layers = kept;
    else delete view.layers;
  }
  if (['hidden', 'pinned'].some((k) => source[k] !== undefined)) warnings.push('reserved:view');
  return { view, warnings };
}
