import { useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ChevronDown, ChevronRight, GitBranchPlus, GripHorizontal, Minus, ShieldCheck, X,
} from 'lucide-react';
import { layerOf, t, ui, type ArchGraph, type GraphIndex, type UiKey } from '@archray/core';
import { alpha, type Theme } from './theme';

type Level = 'good' | 'warn' | 'critical' | 'unknown';

export interface HealthRow {
  id: string;
  name: string;
  level: Level;
  layer: string;
  finding?: string;
  score: number;
}

export interface HealthSummary {
  score: number;
  estimated: boolean;
  validInput: boolean;
  origin: 'measured' | 'estimated';
  counts: Record<Level, number>;
  rows: HealthRow[];
  hotspots: HealthRow[];
  layers: { id: string; name: string; score: number; total: number; critical: number }[];
  total: number;
}

const scoreOf = (level: Level) => level === 'good' ? 1 : level === 'warn' ? 0.62 : level === 'critical' ? 0.12 : 0.5;
const pct = (nodes: HealthRow[]) => nodes.length ? Math.round(100 * nodes.reduce((s, n) => s + scoreOf(n.level), 0) / nodes.length) : 100;

export function summarizeHealth(graph: ArchGraph, idx: GraphIndex, locale: string, defaultLocale: string): HealthSummary {
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, defaultLocale);
  const rows: HealthRow[] = graph.nodes.map((n) => {
    const level = (n.health?.level ?? 'unknown') as Level;
    return {
      id: n.id,
      name: L(n.name),
      level,
      layer: layerOf(idx, n.id) ?? '',
      finding: n.health?.findings?.[0] ? L(n.health.findings[0].text) : undefined,
      score: Math.round(scoreOf(level) * 100),
    };
  });
  const counts: Record<Level, number> = { good: 0, warn: 0, critical: 0, unknown: 0 };
  rows.forEach((r) => { counts[r.level]++; });
  const raw = (graph.meta.stats as Record<string, unknown> | undefined)?.healthScore;
  const rawValue = typeof raw === 'number'
    ? raw
    : (raw && typeof raw === 'object' && 'value' in raw ? Number((raw as { value: unknown }).value) : NaN);
  const rawOrigin = raw && typeof raw === 'object' && 'origin' in raw ? String((raw as { origin: unknown }).origin) : 'estimated';
  // Metric.value has no 0..100 promise. Only accept an in-range score; otherwise state an inferred fallback.
  const validInput = Number.isFinite(rawValue) && rawValue >= 0 && rawValue <= 100;
  const score = validInput ? Math.round(rawValue) : pct(rows);
  const estimated = !validInput || rawOrigin !== 'measured';
  const origin: 'measured' | 'estimated' = rawOrigin === 'measured' && validInput ? 'measured' : 'estimated';
  const layerIds = [...new Set(rows.map((r) => r.layer).filter(Boolean))];
  const layers = layerIds.map((id) => {
    const l = graph.layers?.find((x) => x.id === id);
    const nodes = rows.filter((r) => r.layer === id);
    return { id, name: l ? L(l.name) : id, score: pct(nodes), total: nodes.length, critical: nodes.filter((n) => n.level === 'critical').length };
  }).sort((a, b) => a.score - b.score);
  const hotspots = rows
    .filter((r) => r.level === 'critical' || r.level === 'warn')
    .sort((a, b) => (a.level === 'critical' ? 0 : 1) - (b.level === 'critical' ? 0 : 1))
    .slice(0, 4);
  return { score, estimated, validInput, origin, counts, rows, hotspots, layers, total: rows.length };
}

export function ReplaceSummary({ graph, locale, defaultLocale }: { graph: ArchGraph; locale: string; defaultLocale: string }) {
  const U = (k: UiKey) => ui(k, locale);
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, defaultLocale);
  const nodes = graph.nodes;
  const counts = { high: 0, medium: 0, low: 0, unknown: 0 };
  let options = 0;
  const lockIn: { id: string; name: string; count: number }[] = [];
  for (const n of nodes) {
    const a = n.alternatives;
    if (!a) { counts.unknown++; continue; }
    counts[a.replaceability]++;
    options += a.options?.length ?? 0;
    if (a.lockIn?.length) lockIn.push({ id: n.id, name: L(n.name), count: a.lockIn.length });
  }
  const rows = [
    { key: 'high' as const, label: U('replace.high'), color: '#34D399' },
    { key: 'medium' as const, label: U('replace.medium'), color: '#FBBF24' },
    { key: 'low' as const, label: U('replace.low'), color: '#F87171' },
    { key: 'unknown' as const, label: U('health.unknown'), color: '#94A3B8' },
  ];
  return { counts, options, lockIn: lockIn.sort((a, b) => b.count - a.count).slice(0, 4), rows };
}

export function Insights({
  kind, graph, idx, theme: th, locale, defaultLocale,
  minimized, onToggleMinimize, onClose, onSelectNode,
}: {
  kind: 'health' | 'replaceability';
  graph: ArchGraph;
  idx: GraphIndex;
  theme: Theme;
  locale: string;
  defaultLocale: string;
  minimized: boolean;
  onToggleMinimize(): void;
  onClose(): void;
  onSelectNode?(id: string): void;
}) {
  const U = (k: UiKey) => ui(k, locale);
  const asideRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    sx: number; sy: number; ox: number; oy: number; minX: number; maxX: number; minY: number; maxY: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      setOffset({
        x: clamp(d.ox + (e.clientX - d.sx), d.minX, d.maxX),
        y: clamp(d.oy + (e.clientY - d.sy), d.minY, d.maxY),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = asideRef.current?.getBoundingClientRect();
    if (!rect) return;
    const baseLeft = rect.left - offset.x;
    const baseTop = rect.top - offset.y;
    dragRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: offset.x,
      oy: offset.y,
      minX: 8 - baseLeft,
      maxX: Math.max(8 - baseLeft, window.innerWidth - rect.width - 8 - baseLeft),
      minY: 62 - baseTop,
      maxY: Math.max(62 - baseTop, window.innerHeight - Math.min(rect.height, 96) - 8 - baseTop),
    };
  };

  const health = summarizeHealth(graph, idx, locale, defaultLocale);
  const style = offset.x || offset.y ? { transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)` } : undefined;

  if (kind === 'replaceability') {
    const r = ReplaceSummary({ graph, locale, defaultLocale });
    return (
      <aside ref={asideRef} style={style} className={`ar-insight ar-scroll${minimized ? ' is-min' : ''}`} aria-label={U('insight.replace')}>
        <header className="ar-insight-head" onPointerDown={startDrag} title={U('insight.dragHint')}>
          <span className="ar-insight-grip" aria-hidden="true"><GripHorizontal size={12} /></span>
          <span className="ar-insight-icon"><GitBranchPlus size={14} /></span>
          <div className="ar-insight-title">
            <b>{U('insight.replace')}</b>
            {!minimized && <small>{U('insight.basis')}</small>}
          </div>
          {minimized && <span className="ar-insight-mini-stat">{`${r.counts.low} / ${r.options}`}</span>}
          <div className="ar-insight-actions">
            <button type="button" className="ar-insight-ctrl" onClick={onToggleMinimize}
              aria-label={U(minimized ? 'insight.expand' : 'insight.minimize')}
              title={U(minimized ? 'insight.expand' : 'insight.minimize')}>
              {minimized ? <ChevronDown size={13} /> : <Minus size={13} />}
            </button>
            <button type="button" className="ar-insight-ctrl ar-insight-close" onClick={onClose}
              aria-label={U('insight.close')} title={U('insight.close')}>
              <X size={13} />
            </button>
          </div>
        </header>
        {!minimized && (
          <>
            <div className="ar-replace-bars">
              {r.rows.map((row) => (
                <div key={row.key} className="ar-replace-row">
                  <span style={{ color: row.color }}>{row.label}</span>
                  <b>{r.counts[row.key]}</b>
                  <i><em style={{ width: `${Math.round(100 * r.counts[row.key] / Math.max(1, graph.nodes.length))}%`, background: row.color }} /></i>
                </div>
              ))}
            </div>
            <div className="ar-insight-stat"><span>{U('insight.options')}</span><b>{r.options}</b></div>
            {r.lockIn.length > 0 && (
              <div className="ar-insight-list">
                <small>{U('insight.lockIn')}</small>
                {r.lockIn.map((x) => (
                  <button key={x.id} type="button" className="ar-insight-row-btn" onClick={() => onSelectNode?.(x.id)}>
                    <span>{x.name}</span>
                    <b>{x.count}</b>
                    <ChevronRight size={12} className="ar-insight-chev" />
                  </button>
                ))}
              </div>
            )}
            {r.counts.high + r.counts.medium + r.counts.low === 0 && <p className="ar-insight-empty">{U('insight.replace.none')}</p>}
          </>
        )}
      </aside>
    );
  }

  const hot = health.counts.critical + health.counts.warn;
  return (
    <aside ref={asideRef} style={style} className={`ar-insight ar-scroll${minimized ? ' is-min' : ''}`} aria-label={U('insight.health')}>
      <header className="ar-insight-head" onPointerDown={startDrag} title={U('insight.dragHint')}>
        <span className="ar-insight-grip" aria-hidden="true"><GripHorizontal size={12} /></span>
        <span className="ar-insight-icon"><Activity size={14} /></span>
        <div className="ar-insight-title">
          <b>{U('insight.health')}</b>
          {!minimized && <small>{U('insight.basis')}</small>}
        </div>
        {minimized && <span className="ar-insight-mini-stat">{`${health.score}/100`}</span>}
        <div className="ar-insight-actions">
          <button type="button" className="ar-insight-ctrl" onClick={onToggleMinimize}
            aria-label={U(minimized ? 'insight.expand' : 'insight.minimize')}
            title={U(minimized ? 'insight.expand' : 'insight.minimize')}>
            {minimized ? <ChevronDown size={13} /> : <Minus size={13} />}
          </button>
          <button type="button" className="ar-insight-ctrl ar-insight-close" onClick={onClose}
            aria-label={U('insight.close')} title={U('insight.close')}>
            <X size={13} />
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          <div className="ar-score">
            <div className="ar-score-ring" style={{ ['--score' as string]: health.score }}>
              <svg viewBox="0 0 84 84" aria-hidden="true">
                <circle cx="42" cy="42" r="34" fill="none" stroke={alpha(th.text, 0.10)} strokeWidth="7" />
                <circle cx="42" cy="42" r="34" fill="none" stroke={health.score >= 75 ? th.good : health.score >= 50 ? th.warn : th.critical}
                  strokeWidth="7" strokeLinecap="round" strokeDasharray={`${health.score * 2.136} 999`} transform="rotate(-90 42 42)" />
              </svg>
              <b>{health.score}</b><span>/100</span>
            </div>
            <div className="ar-score-meta">
              <span className="ar-score-label"><ShieldCheck size={13} /> {U('insight.score')}</span>
              <small>{health.estimated ? U('insight.estimated') : `${health.total} ${U('common.nodes')}`}</small>
              <div className="ar-health-chips">
                <span style={{ color: th.good, background: alpha(th.good, 0.12) }}>{health.counts.good} {U('health.good')}</span>
                <span style={{ color: th.warn, background: alpha(th.warn, 0.12) }}>{health.counts.warn} {U('health.warn')}</span>
                <span style={{ color: th.critical, background: alpha(th.critical, 0.12) }}>{health.counts.critical} {U('health.critical')}</span>
                <span style={{ color: th.unknown, background: alpha(th.unknown, 0.12) }}>{health.counts.unknown} {U('health.unknown')}</span>
              </div>
            </div>
          </div>
          {hot > 0 ? (
            <div className="ar-insight-list">
              <small><AlertTriangle size={11} /> {U('insight.hotspots')}</small>
              {health.hotspots.map((x) => (
                <button key={x.id} type="button" className={`ar-insight-row-btn ${x.level}`} onClick={() => onSelectNode?.(x.id)}>
                  <span>{x.name}</span>
                  <b>{x.level === 'critical' ? U('health.critical') : U('health.warn')}</b>
                  <ChevronRight size={12} className="ar-insight-chev" />
                  {x.finding && <em>{x.finding}</em>}
                </button>
              ))}
            </div>
          ) : <p className="ar-insight-empty">{U('insight.none')}</p>}
          {health.layers.length > 1 && (
            <div className="ar-insight-list">
              <small>{U('insight.layers')}</small>
              {health.layers.slice(0, 5).map((l) => (
                <div key={l.id} className="ar-layer-health">
                  <span>{l.name}</span><b>{l.score}</b>
                  <i><em style={{ width: `${l.score}%`, background: l.score >= 75 ? th.good : l.score >= 50 ? th.warn : th.critical }} /></i>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
