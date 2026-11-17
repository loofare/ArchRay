import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  parseView, applyScenario, computeLayout, graphLayers, graphLocales, impactOf, indexGraph, layerLabel,
  negotiateLocale, replacementPrompt, t, ui, validateGraph, visibleGraph,
  type ArchGraph, type PlanarLayout, type ProjectionId, type UiKey,
} from '@archray/core';
import { Scene, type Lens } from './Scene';
import { Inspector } from './Inspector';
import { THEMES, type Theme } from './theme';
import { exportPng } from './export';

declare global { interface Window { __ARCHRAY_DATA__?: unknown; __ARCHRAY_VIEW__?: Record<string, unknown> } }

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

/** View warnings are stored as `kind:field` codes so the viewer can localise them. */
function noticeText(code: string, U: (k: UiKey) => string, locale: string): string {
  const [kind, field] = code.split(':');
  const fieldLabel = field ? ui(`field.${field}` as UiKey, locale) : '';
  switch (kind) {
    case 'invalid': return field === 'view' ? U('notice.invalidView') : `${U('notice.invalid')} · ${fieldLabel} · ${U('notice.usingDefault')}`;
    case 'stale':
      if (field === 'focus') return U('notice.staleFocus');
      if (field === 'scenario') return U('notice.staleScenario');
      if (field === 'locale') return U('notice.staleLocale');
      return U('notice.staleCollapsed');
    case 'reserved': return U('notice.reserved');
    case 'layout': return U('notice.layoutFailed');
    case 'png': return U('notice.pngFailed');
    case 'import': return U('notice.importFailed');
    default: return code;
  }
}

function Viewer({ graph: base }: { graph: ArchGraph }) {
  const qs = Object.fromEntries(new URLSearchParams(location.search));
  const initial = useMemo(() => parseView({ ...(window.__ARCHRAY_VIEW__ ?? {}), ...qs }, base), [base]);
  const v0 = initial.view;
  const [notices, setNotices] = useState<string[]>(initial.warnings);
  const [camera, setCamera] = useState(v0.camera ?? { x: 0, y: 0, zoom: 1 });
  const [retry, setRetry] = useState(0);
  const baseIdx = useMemo(() => indexGraph(base), [base]);
  const { locales, defaultLocale } = graphLocales(base);
  const [locale, setLocale] = useState<string>(v0.locale ?? negotiateLocale(locales, navigator.languages));
  const [themeId, setThemeId] = useState<Theme['id']>(v0.theme ?? 'midnight');
  const [projection, setProjection] = useState<ProjectionId>(v0.projection ?? 'flat');
  const [lens, setLens] = useState<Lens>(v0.lens ?? 'topology');
  const [root, setRoot] = useState<string | null>(v0.focus ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const groups = base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id)).map((n) => n.id);
    const collapsed = new Set(v0.collapsed ?? []);
    return new Set(groups.filter((g) => !collapsed.has(g)));
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(v0.scenario ?? null);
  const [layers, setLayers] = useState<string[]>(v0.layers ?? []);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [placed, setPlaced] = useState<{ idx: object; vis: object; layout: PlanarLayout } | null>(null);

  const th = THEMES[themeId];
  const U = (k: UiKey) => ui(k, locale);
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, defaultLocale);
  const showNotice = (code: string) => setNotices([code]);
  const resetCamera = () => setCamera({ x: 0, y: 0, zoom: 1 });

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
      .catch(() => { if (alive) { setNotices(['layout:failed']); } });
    return () => { alive = false; };
  }, [idx, vis, locale, defaultLocale, retry]);
  // Never draw a previous graph's geometry: scenario switches replace idx before the new layout resolves.
  const layout = placed && placed.idx === idx && placed.vis === vis ? placed.layout : null;

  // flow playback → visible edges
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
      // visibleParent has entries for visible nodes; climb to a *rendered* node
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
        // Match the declared direction, never just an id, so reverse pairs do not both light up.
        if (member ? vp(member.source) === a && vp(member.target) === b : e.source === a && e.target === b) ae.add(e.id);
      }
    }
    return { activeEdges: ae, flowNodes: fn };
  }, [flow, step, vis, idx]);

  const impact = useMemo(() => (selected && baseIdx.byId.has(selected) ? impactOf(baseIdx, selected) : null), [baseIdx, selected]);
  const highlight = useMemo(() => {
    if (flowNodes) return flowNodes;
    if (!selected || !impact) return null;
    const s = new Set([selected, ...impact.direct]);
    for (const n of vis.nodes) if (idx.byId.get(n.id)?.parent === selected) s.add(n.id);
    return s;
  }, [selected, impact, flowNodes, vis, idx]);

  const crumbs: string[] = [];
  for (let c = root; c; c = idx.byId.get(c)?.parent ?? null) crumbs.unshift(c);

  const names = (ids: Set<string>) => {
    const text = [...ids].map((id) => L(baseIdx.byId.get(id)?.name ?? idx.byId.get(id)?.name) || id);
    return text.join(', ') || '—';
  };

  const saveView = () => {
    const view = {
      camera, $schema: './view.schema.json', viewVersion: '1', locale, theme: themeId, projection, lens,
      ...(root ? { focus: root } : {}),
      collapsed: [...idx.children.keys()].filter((g): g is string => !!g && !expanded.has(g)),
      ...(layers.length ? { layers } : {}),
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
      setProjection(v.projection ?? 'flat');
      setLens(v.lens ?? 'topology');
      setRoot(v.focus ?? null);
      setScenarioId(v.scenario ?? null);
      setCamera(v.camera ?? { x: 0, y: 0, zoom: 1 });
      setExpanded(new Set(base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id) && !v.collapsed?.includes(n.id)).map((n) => n.id)));
      setSelected(null);
      setLayers(v.layers ?? []);
      setFlowId(null);
      setStep(0);
      setNotices(warnings);
    } catch { showNotice('import:failed'); }
  };

  const seg = <T extends string>(items: { id: T; label: string }[], cur: T, set: (v: T) => void) => (
    <div style={{ display: 'flex', background: th.bg, borderRadius: 8, padding: 2, border: `1px solid ${th.panelBorder}` }}>
      {items.map((i) => (
        <button key={i.id} onClick={() => set(i.id)} style={{
          border: 0, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          background: cur === i.id ? th.accent : 'transparent', color: cur === i.id ? th.bg : th.sub, fontWeight: 600,
        }}>{i.label}</button>
      ))}
    </div>
  );
  const buttonStyle = (active = false): CSSProperties => ({
    border: `1px solid ${active ? th.accent : th.panelBorder}`, background: active ? th.accent : th.panel,
    color: active ? th.bg : th.text, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  });
  const btn = (label: string, on: () => void, active = false) => (
    <button onClick={on} style={buttonStyle(active)}>{label}</button>
  );

  return (
    <div className="ar-shell" style={{ background: th.bg, color: th.text,
      backgroundImage: `radial-gradient(${th.bgDot} 1px, transparent 1px)`, backgroundSize: '22px 22px' }}>
      <div className="ar-toolbar">
        <div style={{ marginRight: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{L(graph.meta.name)}</div>
          <div style={{ fontSize: 12, color: th.sub }}>
            {crumbs.length ? <>
              <a style={{ color: th.accent, cursor: 'pointer' }} onClick={() => setRoot(null)}>{U('common.root')}</a>
              {crumbs.map((c) => <span key={c}> / <a style={{ color: th.accent, cursor: 'pointer' }} onClick={() => setRoot(c)}>{L(idx.byId.get(c)?.name)}</a></span>)}
            </> : `${graph.nodes.length} ${U('common.nodes')} · ${graph.edges.length} ${U('common.edges')}`}
          </div>
          <div style={{ fontSize: 10, color: th.faint }}>
            {U('meta.inputOnly')} · {U('meta.generated')} {base.meta.generatedAt} · {U('meta.commit')} {base.meta.repo?.commit ?? '—'} · {U('meta.notRuntime')}
          </div>
        </div>
        {seg((['topology', 'health', 'replaceability'] as const).map((id) => ({ id, label: U(`lens.${id}`) })), lens, setLens)}
        {seg((['stack', 'iso', 'flat'] as const).map((id) => ({ id, label: U(`projection.${id}`) })), projection, setProjection)}
        {locales.length > 1 && seg(locales.map((l) => ({ id: l, label: l.startsWith('zh') ? '中' : l.split('-')[0]!.toUpperCase() })), locale, setLocale)}
        {availableLayers.length > 1 && (
          <div className="ar-layers" role="group" aria-label={U('layers.label')}>
            <span style={{ fontSize: 11, color: th.faint, marginRight: 2 }}>{U('layers.label')}</span>
            <button aria-pressed={layers.length === 0} onClick={() => setLayers([])} title={U('layers.all')} style={{ ...buttonStyle(layers.length === 0), padding: '4px 9px', fontSize: 11 }}>{U('layers.all')}</button>
            {availableLayers.map((id) => (
              <button key={id} aria-pressed={layers.includes(id)} onClick={() => setLayers((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
                title={layers.length ? U('layers.hint') : undefined}
                style={{ ...buttonStyle(layers.includes(id)), padding: '4px 9px', fontSize: 11 }}>
                {layerLabel(id, locale)}
              </button>
            ))}
          </div>
        )}
        {btn(themeId === 'midnight' ? '☀' : '☾', () => setThemeId(themeId === 'midnight' ? 'paper' : 'midnight'))}
        {btn('PNG', () => { exportPng(th, `${L(graph.meta.name)}.png`).catch(() => showNotice('png:failed')); })}
        {btn('view.json', saveView)}
        {/* A button-styled label keeps the native file-input text out of the toolbar. */}
        <label className="ar-file" style={{ ...buttonStyle(), display: 'inline-flex', alignItems: 'center' }}>
          {U('common.importView')}
          <input className="ar-file-input" aria-label={U('common.importView')} type="file" accept=".json"
            onChange={(e) => { void importView(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <select aria-label={U('common.findModule')} value={selected ?? ''} style={{ maxWidth: 160, minWidth: 110 }}
          onChange={(e) => { setRoot(null); setSelected(e.target.value || null); resetCamera(); }}>
          <option value="">{U('common.findModule')}</option>
          {(layers.length ? base.nodes.filter((n) => vis.nodes.some((v) => v.id === n.id) || vis.groups.some((g) => g.id === n.id)) : base.nodes)
            .map((n) => <option key={n.id} value={n.id}>{L(n.name)}</option>)}
        </select>
        {diff && (
          <div style={{ width: '100%', fontSize: 12 }}>
            {U('diff.preview')} · {U('diff.added')}: {names(diff.added)} · {U('diff.removed')}: {names(diff.removed)} · {U('diff.changed')}: {names(diff.changed)}
          </div>
        )}
        {notices.length > 0 && (
          <div role="alert" style={{ width: '100%', fontSize: 12, color: th.warn }}>
            {notices.map((n) => noticeText(n, U, locale)).join('; ')}
            {notices.includes('layout:failed') && <> {btn(U('common.retry'), () => { setNotices([]); setRetry((r) => r + 1); })}</>}
            {btn('×', () => setNotices([]))}
          </div>
        )}
      </div>

      <div className="ar-stage">
        <div className={selected ? 'ar-canvas ar-has-selection' : 'ar-canvas'}>
          {layout && (
            <Scene camera={camera} onCamera={setCamera} idx={idx} layout={layout} projection={projection} theme={th} locale={locale} lens={lens}
              selected={selected} highlight={highlight} activeEdges={activeEdges} diff={diff}
              onSelect={setSelected}
              onOpen={(id) => { setRoot(id); setSelected(null); }} context={vis.context} />
          )}
          <div className="ar-zoom">
            {btn('−', () => setCamera((c) => ({ ...c, zoom: Math.max(0.1, c.zoom / 1.3) })))}
            {btn('+', () => setCamera((c) => ({ ...c, zoom: Math.min(20, c.zoom * 1.3) })))}
            {btn(U('common.fit'), () => { resetCamera(); setRoot(null); setSelected(null); })}
          </div>
        </div>

        {selected && baseIdx.byId.get(selected) && (
          <Inspector idx={baseIdx} id={selected} theme={th} locale={locale} defaultLocale={defaultLocale} impact={impact!}
            expanded={expanded.has(selected)}
            onToggleExpand={() => setExpanded((s) => { const n = new Set(s); n.has(selected) ? n.delete(selected) : n.add(selected); return n; })}
            onOpen={() => { setRoot(selected); setSelected(null); }}
            onSelect={setSelected}
            onScenario={(sid) => { setScenarioId(sid); setRoot(null); resetCamera(); }}
            prompt={(opt) => replacementPrompt(baseIdx, selected, opt, locale)}
            onClose={() => setSelected(null)} />
        )}
      </div>

      <div className="ar-footer">
        {flow && (
          <div style={{ background: th.panel, border: `1px solid ${th.panelBorder}`, borderRadius: 10, padding: '6px 12px', fontSize: 13 }}>
            {step === 0 ? L(flow.name) : `${step}/${flow.steps.length} · ${L(flow.steps[step - 1]!.action)}`}
            {step > 0 && flow.steps[step - 1]!.latencyMs !== undefined && <span style={{ color: th.sub }}> · {flow.steps[step - 1]!.latencyMs}ms</span>}
          </div>
        )}
        {(graph.flows ?? []).map((f) => btn(`▶ ${L(f.name)}`, () => setFlowId(flowId === f.id ? null : f.id), flowId === f.id))}
        {(base.scenarios ?? []).map((s) => btn(`⇄ ${L(s.name)}`, () => setScenarioId(scenarioId === s.id ? null : s.id), scenarioId === s.id))}
      </div>
    </div>
  );
}
