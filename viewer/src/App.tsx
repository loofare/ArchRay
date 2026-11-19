import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Activity, Box, Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, GitBranchPlus, Maximize2, Minimize2, RotateCcw, Search, Share2, SlidersHorizontal, X,
} from 'lucide-react';
import {
  ancestors, applyScenario, computeLayout, graphLayerCategory, graphLayerChipLabel, graphLayers, graphLocales,
  impactOf, indexGraph, layerOf, makeProjection, negotiateLocale, parseView, projectedBounds,
  replacementPrompt, t, ui, validateGraph, visibleGraph,
  type ArchGraph, type PlanarLayout, type UiKey,
} from '@archray/core';
import { Scene, type Camera, type Lens } from './Scene';
import { Scene3D, type CameraCmd3D } from './Scene3D';
import { Inspector } from './Inspector';
import { Insights, summarizeHealth } from './Insights';
import { THEMES, LAYER_FALLBACK, alpha, type Theme } from './theme';
import { brandFor, BrandGlyph } from './brands';
import { ARCHRAY_REPO_URL, copySharePosterPng, exportPng, exportSharePosterPng } from './export';
import { QrSvg } from './qr';

declare global { interface Window { __ARCHRAY_DATA__?: unknown; __ARCHRAY_VIEW__?: Record<string, unknown> } }

type ViewMode = '3d' | '2d';

async function loadGraph(): Promise<ArchGraph> {
  if (window.__ARCHRAY_DATA__) return window.__ARCHRAY_DATA__ as ArchGraph;
  const q = new URLSearchParams(location.search).get('graph');
  const res = await fetch(q ?? '/graph.json');
  return res.json();
}

export default function App() {
  const [graph, setGraph] = useState<ArchGraph | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadGraph().then((g) => {
      const r = validateGraph(g);
      if (!r.ok) setErr(r.errors.slice(0, 5).map((e) => `${e.path}: ${e.message}`).join('\n'));
      else setGraph(g);
    }).catch((e) => setErr(String(e)));
  }, []);
  if (err) return <pre style={{ color: '#F87171', padding: 24, whiteSpace: 'pre-wrap' }}>ArchRay: invalid graph{'\n'}{err}</pre>;
  if (!graph) return null;
  return <Viewer graph={graph} />;
}

function noticeText(code: string, U: (k: UiKey) => string, locale: string): string {
  const [kind, field] = code.split(':');
  const fieldLabel = field ? ui(`field.${field}` as UiKey, locale) : '';
  switch (kind) {
    case 'invalid': return field === 'view' ? U('notice.invalidView') : `${U('notice.invalid')} · ${fieldLabel} · ${U('notice.usingDefault')}`;
    case 'stale':
      if (field === 'focus') return U('notice.staleFocus');
      if (field === 'scenario') return U('notice.staleScenario');
      if (field === 'locale') return U('notice.staleLocale');
      if (field === 'layers') return U('notice.staleLayers');
      return U('notice.staleCollapsed');
    case 'reserved': return U('notice.reserved');
    case 'layout': return U('notice.layoutFailed');
    case 'png': return U('notice.pngFailed');
    case 'import': return U('notice.importFailed');
    case 'partial': return U('notice.partialLocale');
    default: return code;
  }
}

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

const mapViewMode = (raw?: string): ViewMode => (raw === '2d' || raw === 'flat' ? '2d' : '3d');

function Viewer({ graph: base }: { graph: ArchGraph }) {
  const qs = Object.fromEntries(new URLSearchParams(location.search));
  const initial = useMemo(() => parseView({ ...(window.__ARCHRAY_VIEW__ ?? {}), ...qs }, base), [base]);
  const v0 = initial.view;
  const [notices, setNotices] = useState<string[]>(initial.warnings);
  const [viewMode, setViewMode] = useState<ViewMode>(() => mapViewMode(v0.projection));
  const [camera, setCamera] = useState<Camera>(v0.camera ? { ...v0.camera, rotate: v0.camera.rotate ?? 0 } : { x: 0, y: 0, zoom: 1, rotate: 0 });
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const [zoom3d, setZoom3d] = useState(1);
  const [explode, setExplode] = useState(1.15);
  const [cameraCmd, setCameraCmd] = useState<CameraCmd3D>({ type: 'atrium', seq: 0 });
  const [activePreset, setActivePreset] = useState<'atrium' | 'front' | 'top'>('atrium');
  const [retry, setRetry] = useState(0);

  const baseIdx = useMemo(() => indexGraph(base), [base]);
  const { locales, defaultLocale } = graphLocales(base);
  const [locale, setLocale] = useState<string>(v0.locale ?? negotiateLocale(locales, navigator.languages));
  const [themeId, setThemeId] = useState<Theme['id']>(v0.theme ?? 'midnight');
  const [lens, setLens] = useState<Lens>(v0.lens ?? 'topology');
  const [root, setRoot] = useState<string | null>(v0.focus ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const groups = base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id)).map((n) => n.id);
    if (v0.collapsed) {
      const collapsed = new Set(v0.collapsed);
      return new Set(groups.filter((g) => !collapsed.has(g)));
    }
    // Keep 3+ module sub-systems cleanly aggregated on larger repos while leaving small graphs open.
    if (base.nodes.length >= 18) {
      return new Set(groups.filter((g) => (baseIdx.children.get(g)?.length ?? 0) < 3));
    }
    return new Set(groups);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(v0.scenario ?? null);
  const [layers, setLayers] = useState<string[]>(v0.layers ?? []);
  const [activeTech, setActiveTech] = useState<string | null>(null);
  const systemReduced = useSystemReducedMotion();
  const [motionOverride, setMotionOverride] = useState(false);
  const [motion, setMotion] = useState<'full' | 'calm' | 'off'>(() =>
    v0.motion ?? (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full'));
  const activeMotion = systemReduced && !motionOverride && motion === 'full' ? 'calm' : motion;
  useEffect(() => { if (systemReduced) setMotionOverride(false); }, [systemReduced]);

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const [flowId, setFlowId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showRecord, setShowRecord] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showPop, setShowPop] = useState(false);
  const [showCmd, setShowCmd] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [insightOpen, setInsightOpen] = useState(true);
  const [insightMin, setInsightMin] = useState(false);
  const [activeHelp, setActiveHelp] = useState<'topology' | 'health' | 'replaceability' | null>(null);
  const [helpPinned, setHelpPinned] = useState(false);
  const [dismissPartial, setDismissPartial] = useState(false);
  const [techExpanded, setTechExpanded] = useState(false);
  const helpTimer = useRef<number | null>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ idx: object; vis: object; layout: PlanarLayout } | null>(null);

  const th = THEMES[themeId];
  const U = (k: UiKey) => ui(k, locale);
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, defaultLocale);
  const showNotice = (code: string) => setNotices([code]);

  const showHoverHelp = (id: 'topology' | 'health' | 'replaceability') => {
    if (helpTimer.current) window.clearTimeout(helpTimer.current);
    if (!helpPinned) setActiveHelp(id);
  };
  const scheduleHideHelp = () => {
    if (helpPinned) return;
    if (helpTimer.current) window.clearTimeout(helpTimer.current);
    helpTimer.current = window.setTimeout(() => setActiveHelp(null), 180);
  };
  const hasPartialContent = useMemo(() => {
    if (locale.startsWith('zh')) return false;
    const targetLang = locale.split('-')[0]!;
    for (const n of base.nodes) {
      if (typeof n.name === 'string') {
        if (/[\u2E80-\u9FFF\uF900-\uFAFF]/.test(n.name)) return true;
      } else if (n.name && !n.name[locale] && !Object.keys(n.name).some((k) => k.split('-')[0] === targetLang)) {
        return true;
      }
      if (typeof n.summary === 'string' && /[\u2E80-\u9FFF\uF900-\uFAFF]/.test(n.summary)) return true;
    }
    return false;
  }, [base.nodes, locale]);
  useEffect(() => { setDismissPartial(false); }, [locale, base]);

  const backdropStyle: CSSProperties = {
    backgroundColor: th.bg,
    backgroundImage: [
      `radial-gradient(ellipse 56% 46% at 24% 16%, ${th.glow1}, transparent 70%)`,
      `radial-gradient(ellipse 50% 48% at 78% 78%, ${th.glow2}, transparent 72%)`,
      `radial-gradient(ellipse 40% 38% at 62% 28%, ${th.glow3}, transparent 70%)`,
    ].join(', '),
  };
  const gridOverlayStyle: CSSProperties = themeId === 'blueprint'
    ? { backgroundImage: `linear-gradient(${th.bgDot} 1px, transparent 1px), linear-gradient(90deg, ${th.bgDot} 1px, transparent 1px)`, backgroundSize: '30px 30px' }
    : { backgroundImage: `radial-gradient(${th.bgDot} 1px, transparent 1px)`, backgroundSize: '24px 24px', maskImage: 'radial-gradient(circle at 50% 50%, black 46%, transparent 94%)' };

  const cameraTouched = useRef(false);
  const changeCamera = (next: Camera) => {
    cameraTouched.current = true;
    setCamera(next);
  };
  const sendCmd3d = (type: CameraCmd3D['type'], layerId?: string) => {
    setCameraCmd((prev) => ({ type, seq: prev.seq + 1, layerId }));
    if (type === 'atrium' || type === 'front' || type === 'top') setActivePreset(type);
    else if (type === 'reset') setActivePreset('atrium');
  };
  const resetCamera = () => {
    setCameraEpoch((e) => e + 1);
    changeCamera({ x: 0, y: 0, zoom: 1, rotate: 0 });
    sendCmd3d('reset');
  };

  const scen = base.scenarios?.find((s) => s.id === scenarioId) ?? null;
  const { graph, diff } = useMemo(() => (scen ? applyScenario(base, scen) : { graph: base, diff: null }), [base, scen]);
  const idx = useMemo(() => indexGraph(graph), [graph]);
  const availableLayers = useMemo(() => graphLayers(base), [base]);
  const vis = useMemo(
    () => visibleGraph(idx, { root, expanded, layers: layers.length ? layers : undefined }),
    [idx, root, expanded, layers],
  );

  useEffect(() => {
    let alive = true;
    setPlaced(null);
    computeLayout(idx, vis, { locale, defaultLocale })
      .then((l) => { if (alive) setPlaced({ idx, vis, layout: l }); })
      .catch(() => { if (alive) setNotices(['layout:failed']); });
    return () => { alive = false; };
  }, [idx, vis, locale, defaultLocale, retry]);
  const layout = placed && placed.idx === idx && placed.vis === vis ? placed.layout : null;

  // Auto-fit 2D camera cleanly when entering 2D mode on larger graphs.
  const autoZoomed2d = useRef(false);
  useEffect(() => {
    if (viewMode !== '2d' || autoZoomed2d.current || cameraTouched.current || v0.camera || !layout) return;
    autoZoomed2d.current = true;
    if (window.innerWidth < 900 || (v0.layers?.length ?? 0) > 0 || v0.focus) return;
    const hasExt = layout.bands.some((b) => graphLayerCategory(idx.graph, b.layer.id) === 'external') && layout.bands.length >= 3;
    const pb = projectedBounds(makeProjection('flat', layout), layout);
    const fullW = pb.w + (hasExt ? 360 : 0) + (availableLayers.length > 1 ? 228 : 0);
    const fit = Math.min(window.innerWidth / Math.max(1, fullW), window.innerHeight / Math.max(1, pb.h + 150));
    if (vis.nodes.length < 16 && fit >= 0.45) return;
    const maxHoriz = Math.max(1.0, ((window.innerWidth - 32) / Math.max(1, fullW)) / Math.max(0.05, fit));
    const zoom = vis.nodes.length >= 24
      ? Math.max(1.0, Math.min(1.42, 0.78 / Math.max(0.05, fit)))
      : Math.max(1.0, Math.min(1.42, maxHoriz, 0.72 / Math.max(0.05, fit)));
    // Keep L0 top padding cleanly below the floating top HUD when zoomed into taller graphs.
    const y = zoom > 1.05 ? -(pb.h * (1 - 1 / zoom)) * 0.5 : 0;
    setCamera({ x: 0, y: +y.toFixed(1), zoom: +zoom.toFixed(2) });
  }, [viewMode, layout, vis.nodes.length, availableLayers.length, idx.graph, v0.camera, v0.layers, v0.focus]);

  // Keyboard shortcuts: Cmd/Ctrl+K search, Esc dismiss overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCmd((v) => !v);
        setShowPop(false);
        setShowShare(false);
        setActiveHelp(null);
        setHelpPinned(false);
      } else if (e.key === 'Escape') {
        setShowCmd(false);
        setShowPop(false);
        setShowShare(false);
        setActiveHelp(null);
        setHelpPinned(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (showCmd) setTimeout(() => cmdInputRef.current?.focus(), 30); }, [showCmd]);
  useEffect(() => {
    if (!showPop && !activeHelp) return;
    const close = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setShowPop(false);
        setActiveHelp(null);
        setHelpPinned(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showPop, activeHelp]);

  // Flow playback -> visible edges
  const flow = graph.flows?.find((f) => f.id === flowId) ?? null;
  useEffect(() => {
    if (!flow) return;
    setStep(0);
    const h = setInterval(() => setStep((s) => (s + 1) % (flow.steps.length + 1)), 1400);
    return () => clearInterval(h);
  }, [flow]);
  const { activeEdges, flowNodes } = useMemo(() => {
    if (!flow) return { activeEdges: null, flowNodes: null };
    const vp = (id: string): string | null => {
      let cur: string | null | undefined = id;
      while (cur && !vis.visibleParent.has(cur)) cur = idx.byId.get(cur)?.parent;
      while (cur && !vis.nodes.some((n) => n.id === cur) && vis.visibleParent.get(cur)) cur = vis.visibleParent.get(cur) ?? null;
      return cur ?? null;
    };
    const steps = flow.steps.slice(0, step || flow.steps.length);
    const ae = new Set<string>(), fn = new Set<string>();
    for (const s of steps) {
      const a = vp(s.from), b = vp(s.to);
      if (a) fn.add(a);
      if (b) fn.add(b);
      for (const e of vis.edges) {
        const member = s.edge ? e.members.find((m) => m.id === s.edge) : undefined;
        if (member ? vp(member.source) === a && vp(member.target) === b : e.source === a && e.target === b) ae.add(e.id);
      }
    }
    return { activeEdges: ae, flowNodes: fn };
  }, [flow, step, vis, idx]);

  const topTechs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of base.nodes) {
      for (const ts of n.techStack ?? []) counts.set(ts, (counts.get(ts) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, count]) => ({ name, count }));
  }, [base.nodes]);

  const techHighlight = useMemo(() => {
    if (!activeTech) return null;
    const set = new Set<string>();
    for (const n of graph.nodes) {
      if (n.techStack?.includes(activeTech)) {
        const rep = vis.representative.get(n.id);
        if (rep) set.add(rep);
      }
    }
    return set;
  }, [activeTech, graph.nodes, vis.representative]);

  const impact = useMemo(() => (selected && baseIdx.byId.has(selected) ? impactOf(baseIdx, selected) : null), [baseIdx, selected]);
  const health = useMemo(() => summarizeHealth(base, baseIdx, locale, defaultLocale), [base, baseIdx, locale, defaultLocale]);
  const highlight = useMemo(() => {
    if (flowNodes) return flowNodes;
    if (selected && impact) {
      const s = new Set([selected, ...impact.direct]);
      for (const n of vis.nodes) if (idx.byId.get(n.id)?.parent === selected) s.add(n.id);
      return s;
    }
    return techHighlight;
  }, [selected, impact, flowNodes, techHighlight, vis, idx]);

  const layerMeta = useMemo(() => {
    const counts = new Map<string, number>();
    const colors = new Map<string, string>();
    const orders = new Map<string, number>();
    (base.layers ?? []).forEach((l, i) => {
      colors.set(l.id, l.color ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!);
      orders.set(l.id, l.order ?? i);
    });
    for (const n of base.nodes) {
      const lid = layerOf(baseIdx, n.id) ?? availableLayers[0];
      if (lid) counts.set(lid, (counts.get(lid) ?? 0) + 1);
    }
    return { counts, colors, orders };
  }, [base, baseIdx, availableLayers]);

  const allGroups = useMemo(() => base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id)).map((n) => n.id), [base.nodes]);
  const allExpanded = allGroups.length > 0 && allGroups.every((id) => expanded.has(id));
  const toggleGroupExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllGroups = () => {
    setExpanded(allExpanded ? new Set() : new Set(allGroups));
  };

  const selectNode = (id: string | null) => {
    if (id) {
      const ancs = ancestors(baseIdx, id);
      if (ancs.length) {
        setExpanded((prev) => {
          const next = new Set(prev);
          ancs.forEach((a) => next.add(a));
          return next;
        });
      }
      setActiveTech(null);
      if (window.innerWidth < 1280) setInsightMin(true);
    }
    setSelected(id);
  };

  const selectLens = (id: 'topology' | 'health' | 'replaceability') => {
    if (id !== 'topology' && lens === id && (!insightOpen || insightMin)) {
      setInsightOpen(true);
      setInsightMin(false);
      return;
    }
    setLens(id);
    if (id !== 'topology') {
      setInsightOpen(true);
      setInsightMin(false);
    }
  };

  const selectFromSearch = (id: string) => {
    setRoot(null);
    selectNode(id);
    setShowCmd(false);
    setCmdQuery('');
  };

  const allLocalizedText = (val: Parameters<typeof t>[0]): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return Object.values(val).join(' ');
  };

  const searchMatches = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const pool = layers.length
      ? base.nodes.filter((n) => vis.nodes.some((v) => v.id === n.id) || vis.groups.some((g) => g.id === n.id))
      : base.nodes;
    return pool.filter((n) => {
      if (!q) return true;
      return L(n.name).toLowerCase().includes(q)
        || allLocalizedText(n.name).toLowerCase().includes(q)
        || allLocalizedText(n.summary).toLowerCase().includes(q)
        || (n.techStack ?? []).some((s) => s.toLowerCase().includes(q))
        || (layerOf(baseIdx, n.id) ?? '').toLowerCase().includes(q);
    }).slice(0, 30);
  }, [cmdQuery, layers.length, base.nodes, vis, baseIdx, locale]);

  const crumbs: string[] = [];
  for (let c = root; c; c = idx.byId.get(c)?.parent ?? null) crumbs.unshift(c);

  const names = (ids: Set<string>) =>
    [...ids].map((id) => L(baseIdx.byId.get(id)?.name ?? idx.byId.get(id)?.name) || id).join(', ') || '—';

  const saveView = () => {
    const view = {
      camera: { x: camera.x, y: camera.y, zoom: camera.zoom, ...(camera.rotate ? { rotate: camera.rotate } : {}) },
      $schema: './view.schema.json', viewVersion: '1', locale, theme: themeId, projection: viewMode, lens,
      ...(root ? { focus: root } : {}),
      collapsed: [...idx.children.keys()].filter((g): g is string => !!g && !expanded.has(g)),
      ...(layers.length ? { layers } : {}),
      motion: activeMotion,
      ...(scenarioId ? { scenario: scenarioId } : {}),
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(view, null, 2)], { type: 'application/json' }));
    a.download = 'view.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importView = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { view: v, warnings } = parseView(JSON.parse(await file.text()), base);
      setLocale(v.locale ?? defaultLocale);
      setThemeId(v.theme ?? 'midnight');
      setViewMode(mapViewMode(v.projection));
      setLens(v.lens ?? 'topology');
      setRoot(v.focus ?? null);
      setScenarioId(v.scenario ?? null);
      setCameraEpoch((e) => e + 1);
      changeCamera(v.camera ? { ...v.camera, rotate: v.camera.rotate ?? 0 } : { x: 0, y: 0, zoom: 1, rotate: 0 });
      setExpanded(new Set(base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id) && !v.collapsed?.includes(n.id)).map((n) => n.id)));
      setSelected(null);
      setLayers(v.layers ?? []);
      setMotion(v.motion ?? (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full'));
      setMotionOverride(false);
      setFlowId(null);
      setStep(0);
      setNotices(warnings);
    } catch { showNotice('import:failed'); }
  };

  const lensIcon = { topology: Box, health: Activity, replaceability: GitBranchPlus } as const;

  return (
    <div
      className={`ar-shell ar-motion-${activeMotion}`}
      data-motion={activeMotion}
      data-projection={viewMode}
      data-theme={themeId}
      data-zoom={(viewMode === '3d' ? zoom3d : camera.zoom).toFixed(2)}
      data-rotate={camera.rotate ?? 0}
      data-camera={`${camera.x.toFixed(2)},${camera.y.toFixed(2)}`}
      style={{
        ...backdropStyle,
        color: th.text,
        ['--ar-bg' as string]: th.bg,
        ['--ar-accent' as string]: th.accent,
        ['--ar-text' as string]: th.text,
        ['--ar-sub' as string]: th.sub,
        ['--ar-faint' as string]: th.faint,
        ['--ar-good' as string]: th.good,
        ['--ar-warn' as string]: th.warn,
        ['--ar-critical' as string]: th.critical,
        ['--ar-panel' as string]: th.panel,
        ['--ar-hud-bg' as string]: th.hudBg,
        ['--ar-hud-strong' as string]: th.hudStrong,
        ['--ar-panel-border' as string]: th.panelBorder,
        ['--ar-specular' as string]: th.specular,
        ['--ar-shadow' as string]: th.shadow,
        ['--ar-planned' as string]: th.planned,
      } as CSSProperties}
    >
      <div className="ar-backdrop-grid" style={gridOverlayStyle} />

      {/* Top 3-Island VisionOS HUD Bar + Dead-Centered 3D/2D Switcher */}
      <header className="ar-topbar">
        <div className="ar-glass ar-brand-island">
          <div className="ar-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" />
              <polyline points="3 7 12 12 21 7" />
              <line x1="12" y1="12" x2="12" y2="22" />
            </svg>
          </div>
          <div className="ar-title">
            <div className="ar-kicker">ARCHRAY <span>/</span> <b>{L(graph.meta.name)}</b></div>
            <div className="ar-subtitle">
              {crumbs.length ? <>
                <a onClick={() => setRoot(null)}>{U('common.root')}</a>
                {crumbs.map((c) => <span key={c}> / <a onClick={() => setRoot(c)}>{L(idx.byId.get(c)?.name)}</a></span>)}
              </> : `${graph.layers?.length ?? 0} ${U('layers.label')} · ${graph.nodes.length} ${U('common.nodes')}`}
            </div>
          </div>
          <button
            type="button"
            className={`ar-health-btn${health.score < 50 ? ' is-bad' : health.score < 75 ? ' is-warn' : ''}`}
            title={`${U('insight.score')} · ${health.estimated ? U('insight.estimated') : U('common.measured')}`}
            data-score-origin={health.origin}
            onPointerEnter={() => showHoverHelp('health')}
            onPointerLeave={scheduleHideHelp}
            onClick={() => {
              if (lens === 'health' && insightOpen && !insightMin) setLens('topology');
              else selectLens('health');
            }}
          >
            <svg width="15" height="15" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeOpacity="0.24" strokeWidth="2.6" />
              <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.6"
                strokeDasharray={`${((health.score / 100) * 44).toFixed(1)} 44`} strokeLinecap="round" transform="rotate(-90 10 10)" />
            </svg>
            <span>{health.estimated ? '≈' : ''}{health.score}</span>
          </button>
        </div>

        {/* Centered Switcher: Default 3D First, then 2D */}
        <div className="ar-glass ar-mode-dock" role="tablist" aria-label="View projection">
          {(['3d', '2d'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={viewMode === m}
              className={`ar-mode-btn${viewMode === m ? ' is-active' : ''}`}
              onClick={() => setViewMode(m)}>
              <span>{m === '3d' ? `✦ ${U('projection.3d')}` : `◫ ${U('projection.2d')}`}</span>
            </button>
          ))}
        </div>

        {/* Right Controls Island (Lenses + Help Dots, Spotlight Search, Locale, VisionOS Display Popover) */}
        <div className="ar-glass ar-action-island" ref={popRef}>
          <div className="ar-lensbar" role="tablist" aria-label={U('lens.topology')}>
            {(['topology', 'health', 'replaceability'] as const).map((id) => {
              const Icon = lensIcon[id];
              const badge = id === 'health'
                ? health.counts.critical + health.counts.warn
                : id === 'replaceability'
                  ? base.nodes.filter((n) => n.alternatives?.replaceability === 'low').length
                  : 0;
              return (
                <div key={id} className="ar-lens-wrap">
                  <button type="button" role="tab" aria-selected={lens === id}
                    onClick={() => selectLens(id)} className={`ar-lens${lens === id ? ' is-active' : ''}`}>
                    <Icon size={13} />
                    <span>{U(`lens.${id}`)}</span>
                    {badge > 0 && <em className={id === 'health' ? 'is-hot' : ''}>{badge}</em>}
                  </button>
                  <button
                    type="button"
                    className={`ar-help-dot${activeHelp === id ? ' is-open' : ''}`}
                    aria-label={U(`help.${id}.title` as UiKey)}
                    aria-expanded={activeHelp === id}
                    onPointerEnter={() => showHoverHelp(id)}
                    onPointerLeave={scheduleHideHelp}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (helpTimer.current) window.clearTimeout(helpTimer.current);
                      if (activeHelp === id && helpPinned) {
                        setActiveHelp(null);
                        setHelpPinned(false);
                      } else {
                        setActiveHelp(id);
                        setHelpPinned(true);
                      }
                    }}
                  >?</button>
                </div>
              );
            })}
          </div>

          {activeHelp && (
            <div
              className="ar-glass ar-metric-tip"
              role="tooltip"
              onPointerEnter={() => { if (helpTimer.current) window.clearTimeout(helpTimer.current); }}
              onPointerLeave={scheduleHideHelp}
            >
              <div className="ar-metric-tip-head">
                <span className="ar-metric-tip-ico">
                  {(() => {
                    const HelpIcon = lensIcon[activeHelp];
                    return <HelpIcon size={13} />;
                  })()}
                </span>
                <b>{U(`help.${activeHelp}.title` as UiKey)}</b>
                {helpPinned && (
                  <button type="button" className="ar-insight-ctrl" aria-label={U('common.close')}
                    onClick={() => { setActiveHelp(null); setHelpPinned(false); }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="ar-metric-tip-desc">{U(`help.${activeHelp}.desc` as UiKey)}</p>
              <div className="ar-metric-tip-legend">{U(`help.${activeHelp}.legend` as UiKey)}</div>
            </div>
          )}

          <button type="button" className="ar-pill-btn ar-find-trigger" onClick={() => setShowCmd(true)} title={U('common.findModule')}>
            <Search size={13} />
            <span className="ar-kbd">⌘K</span>
          </button>

          {locales.length > 1 && (
            <div className="ar-seg-mini">
              {locales.map((l) => (
                <button key={l} type="button" className={locale === l ? 'is-active' : ''} onClick={() => setLocale(l)}>
                  {l.startsWith('zh') ? '中' : l.split('-')[0]!.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="ar-pill-btn ar-share-trigger"
            onClick={() => { setShowShare(true); setShowPop(false); setActiveHelp(null); setHelpPinned(false); }}
            title={U('share.open')}
          >
            <Share2 size={13} />
            <span>{U('share.open')}</span>
          </button>

          <a
            href={ARCHRAY_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ar-pill-btn ar-github-link"
            title="GitHub · loofare/ArchRay"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            <span>GitHub</span>
          </a>

          <button type="button" className="ar-pill-btn ar-more-trigger" aria-expanded={showPop}
            onClick={() => setShowPop((v) => !v)} title={U('common.settings')}>
            <SlidersHorizontal size={13} />
          </button>

          {/* Keep hidden/accessible file input mounted cleanly inside popover or label */}
          {showPop && (
            <div className="ar-glass ar-popover" role="dialog" aria-label={U('common.settings')}>
              <div>
                <div className="ar-pop-label">{U('theme.label')}</div>
                <div className="ar-pop-grid">
                  {([
                    { id: 'midnight', swatch: '#141B36' },
                    { id: 'glass', swatch: '#E2E9F6' },
                    { id: 'paper', swatch: '#F4F6FA' },
                    { id: 'blueprint', swatch: '#0B2447' },
                  ] as const).map((item) => (
                    <button key={item.id} type="button"
                      className={`ar-pop-pill${themeId === item.id ? ' is-active' : ''}`}
                      onClick={() => setThemeId(item.id)}>
                      <span className="ar-swatch" style={{ background: item.swatch }} />
                      <span>{U(`theme.${item.id}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="ar-pop-label">{U('motion.label')}</div>
                <div className="ar-pop-row">
                  {(['full', 'calm', 'off'] as const).map((m) => (
                    <button key={m} type="button"
                      className={`ar-pop-pill${activeMotion === m ? ' is-active' : ''}`}
                      onClick={() => { setMotion(m); setMotionOverride(true); }}>
                      {U(`motion.${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              {allGroups.length > 0 && (
                <div className="ar-switch-row" onClick={toggleAllGroups}>
                  <span>{U('common.expandGroups')}</span>
                  <div className={`ar-toggle-track${allExpanded ? ' on' : ''}`}><div className="ar-toggle-thumb" /></div>
                </div>
              )}

              <div>
                <div className="ar-pop-label">{U('more.title')}</div>
                <div className="ar-pop-grid">
                  <button type="button" className="ar-pop-pill" onClick={() => { setShowPop(false); exportPng(th, `${L(graph.meta.name)}.png`).catch(() => showNotice('png:failed')); }}>{U('common.exportPng')}</button>
                  <button type="button" className="ar-pop-pill" onClick={() => { setShowPop(false); exportPng(th, `${L(graph.meta.name)}-full.png`, { full: true }).catch(() => showNotice('png:failed')); }}>{U('common.exportFull')}</button>
                  <button type="button" className="ar-pop-pill" onClick={() => { setShowPop(false); saveView(); }}>{U('common.exportView')}</button>
                  <label className="ar-pop-pill ar-file">
                    {U('common.importView')}
                    <input className="ar-file-input" aria-label={U('common.importView')} type="file" accept=".json"
                      onChange={(e) => { void importView(e.target.files?.[0]); e.target.value = ''; setShowPop(false); }} />
                  </label>
                  <button type="button" className="ar-pop-pill" style={{ gridColumn: '1 / -1' }}
                    onClick={() => { setShowPop(false); setShowRecord(true); }}>
                    {U('record.open')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hidden file input fallback so view imports work even if popover closed */}
      {!showPop && (
        <input className="ar-file-input" aria-label={U('common.importView')} type="file" accept=".json"
          onChange={(e) => { void importView(e.target.files?.[0]); e.target.value = ''; }} />
      )}

      {/* Floating Notices / Scenario Diff / Empty Layer Warning / Partial Bilingual Notice */}
      {(notices.length > 0 || diff || (layers.length > 0 && vis.nodes.length === 0 && vis.groups.length === 0) || (hasPartialContent && !dismissPartial)) && (
        <div role="alert" className="ar-glass ar-banner-float">
          {diff && (
            <span>{U('diff.preview')} · {U('diff.added')}: {names(diff.added)} · {U('diff.removed')}: {names(diff.removed)}</span>
          )}
          {layers.length > 0 && vis.nodes.length === 0 && vis.groups.length === 0 && (
            <>
              <span>{U('layers.empty')}</span>
              <button type="button" onClick={() => setLayers([])}>{U('layers.all')}</button>
            </>
          )}
          {hasPartialContent && !dismissPartial && notices.length === 0 && !diff && (
            <>
              <span>{U('notice.partialLocale')}</span>
              <button type="button" onClick={() => setDismissPartial(true)}>×</button>
            </>
          )}
          {notices.length > 0 && (
            <>
              <span>{notices.map((n) => noticeText(n, U, locale)).join('; ')}</span>
              {notices.includes('layout:failed') && <button type="button" onClick={() => { setNotices([]); setRetry((r) => r + 1); }}>{U('common.retry')}</button>}
              <button type="button" onClick={() => setNotices([])}>×</button>
            </>
          )}
        </div>
      )}

      {/* Left VisionOS Layer Elevator Filter Dock */}
      {availableLayers.length > 1 && (
        <aside className="ar-glass ar-layers ar-scroll" role="group" aria-label={U('layers.label')}>
          <div className="ar-layers-head">
            <span>{U('layers.label')}</span>
            <span style={{ fontFamily: 'var(--ar-mono)', color: th.accent }}>{layers.length ? `${layers.length}` : U('layers.allShort')}</span>
          </div>
          <button
            type="button"
            className="ar-layer-pill"
            aria-pressed={layers.length === 0}
            onClick={() => { setLayers([]); resetCamera(); }}
          >
            <span className="ar-layer-dot" style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.planned})`, boxShadow: `0 0 8px ${alpha(th.accent, 0.5)}` }} />
            <span className="ar-layer-name">{U('layers.all')}</span>
            <span className="ar-layer-count">{base.nodes.length}</span>
          </button>
          {availableLayers.map((id, i) => {
            const c = layerMeta.colors.get(id) ?? LAYER_FALLBACK[i % LAYER_FALLBACK.length]!;
            const ord = layerMeta.orders.get(id) ?? i;
            const cnt = layerMeta.counts.get(id) ?? 0;
            const active = layers.includes(id);
            return (
              <button
                key={id}
                type="button"
                className="ar-layer-pill"
                aria-pressed={active}
                title={layers.length ? U('layers.hint') : undefined}
                onClick={() => {
                  const next = layers.includes(id) ? layers.filter((x) => x !== id) : [...layers, id];
                  setLayers(next);
                  if (viewMode === '3d' && next.length === 1) sendCmd3d('focusLayer', next[0]);
                  else resetCamera();
                }}
              >
                <span className="ar-layer-dot" style={{ background: c, boxShadow: `0 0 8px ${alpha(c, 0.6)}` }} />
                <span className="ar-layer-code" style={{ color: c }}>{`L${ord}`}</span>
                <span className="ar-layer-name">{graphLayerChipLabel(base, id, locale)}</span>
                <span className="ar-layer-count">{cnt}</span>
              </button>
            );
          })}
        </aside>
      )}

      {/* Main Spatial Canvas (Default 3D | 2D) */}
      <main className="ar-stage">
        <div className={selected ? 'ar-canvas ar-has-selection' : 'ar-canvas'}>
          {layout && viewMode === '3d' && (
            <Scene3D
              idx={idx} vis={vis} layout={layout} theme={th} locale={locale} lens={lens}
              selected={selected} highlight={highlight} activeEdges={activeEdges} diff={diff}
              context={vis.context} motion={activeMotion} explode={explode} cameraCmd={cameraCmd}
              onCameraZoom={setZoom3d}
              onSelect={selectNode}
              onOpen={(id) => { setRoot(id); setSelected(null); }}
              onToggleExpand={toggleGroupExpand}
            />
          )}
          {layout && viewMode === '2d' && (
            <Scene
              camera={camera} cameraEpoch={cameraEpoch} onCamera={changeCamera}
              idx={idx} vis={vis} layout={layout} theme={th} locale={locale} lens={lens}
              selected={selected} highlight={highlight} activeEdges={activeEdges} diff={diff}
              onSelect={selectNode}
              onOpen={(id) => { setRoot(id); setSelected(null); }}
              onToggleExpand={toggleGroupExpand}
              context={vis.context} motion={activeMotion}
            />
          )}
        </div>

        {(lens === 'health' || lens === 'replaceability') && (
          insightOpen ? (
            <Insights
              kind={lens}
              graph={graph}
              idx={idx}
              theme={th}
              locale={locale}
              defaultLocale={defaultLocale}
              minimized={insightMin}
              onToggleMinimize={() => setInsightMin((v) => !v)}
              onClose={() => setInsightOpen(false)}
              onSelectNode={selectNode}
            />
          ) : (
            <button
              type="button"
              className="ar-glass ar-insight-restore"
              onClick={() => { setInsightOpen(true); setInsightMin(false); }}
            >
              {lens === 'health' ? <Activity size={13} /> : <GitBranchPlus size={13} />}
              <span>{U(lens === 'health' ? 'insight.reopen.health' : 'insight.reopen.replace')}</span>
              <RotateCcw size={11} />
            </button>
          )
        )}

        {selected && baseIdx.byId.get(selected) && (
          <Inspector idx={baseIdx} id={selected} theme={th} locale={locale} defaultLocale={defaultLocale} impact={impact!}
            expanded={expanded.has(selected)}
            onToggleExpand={() => toggleGroupExpand(selected)}
            onOpen={() => { setRoot(selected); setSelected(null); }}
            onSelect={selectNode}
            onScenario={(sid) => { setScenarioId(sid); setRoot(null); resetCamera(); }}
            prompt={(opt) => replacementPrompt(baseIdx, selected, opt, locale)}
            onClose={() => setSelected(null)} />
        )}
      </main>

      {/* Right Vertical Explode Slider (3D only) */}
      {viewMode === '3d' && (
        <div className={`ar-glass ar-explode-dock${selected ? ' has-inspector' : ''}`}>
          <span className="ar-explode-title">{U('camera.explode')}</span>
          <div className="ar-explode-wrap">
            <input className="ar-explode-range" type="range" min="0.65" max="1.75" step="0.05"
              value={explode} aria-label={U('camera.explode')}
              onChange={(e) => setExplode(parseFloat(e.target.value))} />
          </div>
          <span className="ar-explode-val">{`${explode.toFixed(2)}x`}</span>
        </div>
      )}

      {/* Active Flow Step Floating Playback Pill */}
      {flow && (
        <div className="ar-glass ar-flow-toast" onPointerDown={(e) => e.stopPropagation()}>
          <span className="ar-flow-dot" />
          <span className="ar-flow-toast-text">
            {step > 0
              ? `${step}/${flow.steps.length} · ${L(flow.steps[step - 1]!.action)}`
              : `${L(flow.name)} · ${flow.steps.length}`}
          </span>
          <button
            type="button"
            className="ar-flow-ctl"
            aria-label="Previous step"
            onClick={() => setStep((s) => (s <= 1 ? flow.steps.length : s - 1))}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            className="ar-flow-ctl"
            aria-label="Next step"
            onClick={() => setStep((s) => (s >= flow.steps.length ? 1 : s + 1))}
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            className="ar-flow-ctl"
            aria-label={U('common.close')}
            onClick={() => setFlowId(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Bottom Non-Overlapping HUD Bar: Tech Radar | Flow Storyboard | Camera & Presets */}
      <div className="ar-bottom-hud">
        {topTechs.length > 0 ? (() => {
          const visibleTechs = techExpanded
            ? topTechs
            : topTechs.filter((item, i) => i < 4 || item.name === activeTech);
          const hiddenCount = topTechs.length - visibleTechs.length;
          return (
            <div className="ar-glass ar-tech-dock">
              <span className="ar-tech-label">{U('tech.label')}</span>
              {visibleTechs.map(({ name }) => {
                const b = brandFor(name);
                const active = activeTech === name;
                return (
                  <button key={name} type="button"
                    className={`ar-tech-pill${active ? ' is-active' : ''}`}
                    onClick={() => { setSelected(null); setActiveTech((cur) => cur === name ? null : name); }}>
                    <span className="ar-tech-ico" style={{ background: b ? (b.dark ? '#0F172A' : '#fff') : alpha(th.accent, 0.16), color: th.accent }}>
                      {b ? <BrandGlyph brand={b} size={12} /> : name.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{name}</span>
                  </button>
                );
              })}
              {topTechs.length > 4 && (
                <button
                  type="button"
                  className="ar-tech-pill ar-tech-more"
                  onClick={() => setTechExpanded((v) => !v)}
                >
                  {techExpanded ? '−' : `+${hiddenCount}`}
                </button>
              )}
            </div>
          );
        })() : <div />}

        {(flow || (graph.flows?.length ?? 0) > 0 || (base.scenarios?.length ?? 0) > 0) ? (
          <div className="ar-glass ar-footer">
            {(graph.flows ?? []).map((f) => (
              <button key={f.id} type="button" className={flowId === f.id ? 'is-active' : ''}
                onClick={() => setFlowId(flowId === f.id ? null : f.id)}>
                {`${flowId === f.id ? '■' : '▶'} ${L(f.name)}`}
              </button>
            ))}
            {(base.scenarios ?? []).map((s) => (
              <button key={s.id} type="button" className={scenarioId === s.id ? 'is-active' : ''}
                onClick={() => setScenarioId(scenarioId === s.id ? null : s.id)}>
                {`⇄ ${L(s.name)}`}
              </button>
            ))}
          </div>
        ) : <div />}

        <div className="ar-glass ar-zoom" onPointerDown={(e) => e.stopPropagation()}>
          {viewMode === '3d' && (
            <>
              <button type="button" className={`ar-zoom-preset${activePreset === 'atrium' ? ' is-active' : ''}`}
                onClick={() => sendCmd3d('atrium')}>{U('camera.preset.atrium')}</button>
              <button type="button" className={`ar-zoom-preset${activePreset === 'front' ? ' is-active' : ''}`}
                onClick={() => sendCmd3d('front')}>{U('camera.preset.front')}</button>
              <button type="button" className={`ar-zoom-preset${activePreset === 'top' ? ' is-active' : ''}`}
                onClick={() => sendCmd3d('top')}>{U('camera.preset.top')}</button>
            </>
          )}
          <button type="button" title={U('common.zoomOut')}
            onClick={() => viewMode === '3d' ? sendCmd3d('zoomOut') : changeCamera({ ...camera, zoom: Math.max(0.1, camera.zoom / 1.3) })}>−</button>
          <button type="button" title={U('common.zoomIn')}
            onClick={() => viewMode === '3d' ? sendCmd3d('zoomIn') : changeCamera({ ...camera, zoom: Math.min(20, camera.zoom * 1.3) })}>+</button>
          <button type="button" title={U('camera.fullscreen')} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" onClick={() => { resetCamera(); setRoot(null); setSelected(null); setActiveTech(null); }}>
            {U('common.fit')}
          </button>
        </div>
      </div>

      {/* Command Palette Spotlight Search Modal (Cmd/Ctrl+K) */}
      {showCmd && (
        <div className="ar-cmd-backdrop" onClick={() => setShowCmd(false)}>
          <div className="ar-glass ar-cmd-dialog" role="dialog" aria-modal="true" aria-label={U('common.findModule')} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={cmdInputRef}
                className="ar-cmd-input"
                placeholder={U('common.searchPlaceholder')}
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
              />
              <button type="button" className="ar-pill-btn" onClick={() => setShowCmd(false)}><X size={14} /></button>
            </div>
            <div className="ar-cmd-list ar-scroll">
              {searchMatches.map((n) => {
                const lid = layerOf(baseIdx, n.id);
                const c = (lid ? layerMeta.colors.get(lid) : undefined) ?? th.accent;
                return (
                  <button key={n.id} type="button" className="ar-cmd-item" onClick={() => selectFromSearch(n.id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L(n.name)}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: th.sub, fontFamily: 'var(--ar-mono)', flexShrink: 0 }}>
                      {(n.techStack ?? []).slice(0, 2).join(' · ') || lid || n.kind}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="ar-share-backdrop" onClick={() => setShowShare(false)}>
          <div className="ar-glass ar-share-dialog" role="dialog" aria-modal="true" aria-label={U('share.title')} onClick={(e) => e.stopPropagation()}>
            <div className="ar-share-head">
              <div className="ar-share-head-ico"><Share2 size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{U('share.title')}</div>
                <div style={{ fontSize: 11.5, color: th.sub, marginTop: 2 }}>{U('share.subtitle')}</div>
              </div>
              <button type="button" className="ar-inspector-close" onClick={() => setShowShare(false)} aria-label={U('common.close')}>×</button>
            </div>

            <div className="ar-share-preview">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: th.accent }}>ARCHRAY · OPEN SOURCE</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L(graph.meta.name)}</div>
                <div style={{ fontSize: 11.5, color: th.sub, marginTop: 3 }}>
                  {`${graph.layers?.length ?? 0} ${U('layers.label')} · ${graph.nodes.length} ${U('common.nodes')} · ${health.score}/100`}
                </div>
                <div className="ar-share-url-pill">{ARCHRAY_REPO_URL}</div>
              </div>
              <QrSvg value={ARCHRAY_REPO_URL} size={78} />
            </div>

            <div className="ar-share-grid">
              <button type="button" className="ar-pop-pill" onClick={() => {
                exportSharePosterPng(th, {
                  title: L(graph.meta.name),
                  stats: `${graph.layers?.length ?? 0} ${U('layers.label')} · ${graph.nodes.length} ${U('common.nodes')} · ${graph.edges.length} ${U('common.edges')}`,
                  score: health.score,
                  builtWith: U('share.builtWith'),
                }, `${L(graph.meta.name)}-archray-share.png`).catch(() => showNotice('png:failed'));
              }}>
                <Download size={13} />
                <span>{U('share.posterDownload')}</span>
              </button>

              <button type="button" className="ar-pop-pill" onClick={() => {
                void copySharePosterPng(th, {
                  title: L(graph.meta.name),
                  stats: `${graph.layers?.length ?? 0} ${U('layers.label')} · ${graph.nodes.length} ${U('common.nodes')} · ${graph.edges.length} ${U('common.edges')}`,
                  score: health.score,
                  builtWith: U('share.builtWith'),
                }).then((res) => {
                  if (res === 'copied') {
                    setShareStatus('poster');
                    setTimeout(() => setShareStatus(null), 1600);
                  }
                }).catch(() => showNotice('png:failed'));
              }}>
                {shareStatus === 'poster' ? <Check size={13} /> : <Copy size={13} />}
                <span>{shareStatus === 'poster' ? U('share.posterCopied') : U('share.posterCopy')}</span>
              </button>

              <button type="button" className="ar-pop-pill" onClick={() => {
                const post = locale.startsWith('zh')
                  ? `用开源架构可视化工具 ArchRay 生成了「${L(graph.meta.name)}」3D/2D 交互式架构全景图（${graph.layers?.length ?? 0} 层 · ${graph.nodes.length} 模块 · 健康评分 ${health.score}/100）。\nGitHub 开源仓库：${ARCHRAY_REPO_URL}`
                  : `Visualized "${L(graph.meta.name)}" as an interactive 3D/2D spatial architecture map (${graph.layers?.length ?? 0} layers, ${graph.nodes.length} modules, score ${health.score}/100) using ArchRay.\nOpen Source on GitHub: ${ARCHRAY_REPO_URL}`;
                void navigator.clipboard?.writeText(post).then(() => {
                  setShareStatus('text');
                  setTimeout(() => setShareStatus(null), 1600);
                });
              }}>
                {shareStatus === 'text' ? <Check size={13} /> : <Copy size={13} />}
                <span>{shareStatus === 'text' ? U('inspector.copied') : U('share.copyText')}</span>
              </button>

              <button type="button" className="ar-pop-pill" onClick={() => {
                const badge = `[![ArchRay Architecture](https://img.shields.io/badge/Architecture-ArchRay-60A5FA?logo=github)](${ARCHRAY_REPO_URL})`;
                void navigator.clipboard?.writeText(badge).then(() => {
                  setShareStatus('badge');
                  setTimeout(() => setShareStatus(null), 1600);
                });
              }}>
                {shareStatus === 'badge' ? <Check size={13} /> : <Copy size={13} />}
                <span>{shareStatus === 'badge' ? U('inspector.copied') : U('share.copyBadge')}</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button type="button" className="ar-pop-pill" style={{ gridColumn: '1 / -1' }} onClick={() => {
                  void navigator.share({
                    title: `${L(graph.meta.name)} — ArchRay`,
                    text: U('share.repoDesc'),
                    url: ARCHRAY_REPO_URL,
                  }).catch(() => {});
                }}>
                  <Share2 size={13} />
                  <span>{U('share.system')}</span>
                </button>
              )}
            </div>

            <div className="ar-share-repo">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                  </svg>
                  <span>{U('share.repoTitle')}</span>
                </div>
                <div style={{ fontSize: 11.5, color: th.sub, marginTop: 3 }}>{U('share.repoDesc')}</div>
              </div>
              <a href={ARCHRAY_REPO_URL} target="_blank" rel="noopener noreferrer" className="ar-share-cta">
                <span>{U('share.repoBtn')}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {showRecord && (
        <div role="dialog" aria-modal="true" aria-label={U('record.title')} onClick={() => setShowRecord(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(2,6,23,0.58)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="ar-glass" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, width: '100%', background: th.hudStrong, padding: 20, color: th.text, fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{U('record.title')}</div>
            <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>
              <li>{U('record.step1')}</li>
              <li>{U('record.step2')}</li>
              <li>{U('record.step3')}</li>
            </ol>
            <p style={{ color: th.sub, margin: '0 0 12px' }}>{U('record.note')}</p>
            <button type="button" className="ar-pill-btn" onClick={() => setShowRecord(false)}>{U('record.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
