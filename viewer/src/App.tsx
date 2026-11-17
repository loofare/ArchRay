import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyScenario, computeLayout, graphLocales, impactOf, indexGraph, negotiateLocale, replacementPrompt, t, ui,
  validateGraph, visibleGraph, type ArchGraph, type PlanarLayout, type ProjectionId, type UiKey,
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

function Viewer({ graph: base }: { graph: ArchGraph }) {
  const qs = Object.fromEntries(new URLSearchParams(location.search));
  const v0: Record<string, unknown> = { ...(window.__ARCHRAY_VIEW__ ?? {}), ...qs };
  const { locales, defaultLocale } = graphLocales(base);
  const [locale, setLocale] = useState<string>((v0.locale as string) ?? negotiateLocale(locales, navigator.languages));
  const [themeId, setThemeId] = useState<Theme['id']>((v0.theme as Theme['id']) ?? 'midnight');
  const [projection, setProjection] = useState<ProjectionId>((v0.projection as ProjectionId) ?? 'stack');
  const [lens, setLens] = useState<Lens>((v0.lens as Lens) ?? 'topology');
  const [root, setRoot] = useState<string | null>((v0.focus as string) ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const groups = base.nodes.filter((n) => base.nodes.some((c) => c.parent === n.id)).map((n) => n.id);
    const collapsed = new Set((v0.collapsed as string[]) ?? []);
    return new Set(groups.filter((g) => !collapsed.has(g)));
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>((v0.scenario as string) ?? null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState<PlanarLayout | null>(null);
  const svgWrap = useRef<HTMLDivElement>(null);

  const th = THEMES[themeId];
  const U = (k: UiKey) => ui(k, locale);
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, defaultLocale);

  const scen = base.scenarios?.find((s) => s.id === scenarioId) ?? null;
  const { graph, diff } = useMemo(() => (scen ? applyScenario(base, scen) : { graph: base, diff: null }), [base, scen]);
  const idx = useMemo(() => indexGraph(graph), [graph]);
  const vis = useMemo(() => visibleGraph(idx, { root, expanded }), [idx, root, expanded]);

  useEffect(() => {
    let alive = true;
    computeLayout(idx, vis, { locale, defaultLocale }).then((l) => alive && setLayout(l));
    return () => { alive = false; };
  }, [idx, vis, locale, defaultLocale]);

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
      for (const e of vis.edges) if ((e.source === a && e.target === b) || (e.source === b && e.target === a)) ae.add(e.id);
    }
    return { activeEdges: ae, flowNodes: fn };
  }, [flow, step, vis, idx]);

  const impact = useMemo(() => (selected && idx.byId.has(selected) ? impactOf(idx, selected) : null), [idx, selected]);
  const highlight = useMemo(() => {
    if (flowNodes) return flowNodes;
    if (!selected || !impact) return null;
    const s = new Set([selected, ...impact.direct]);
    for (const n of vis.nodes) if (idx.byId.get(n.id)?.parent === selected) s.add(n.id);
    return s;
  }, [selected, impact, flowNodes, vis, idx]);

  const crumbs: string[] = [];
  for (let c = root; c; c = idx.byId.get(c)?.parent ?? null) crumbs.unshift(c);

  const saveView = () => {
    const view = {
      $schema: '../schema/view.schema.json', viewVersion: '1', locale, theme: themeId, projection, lens,
      ...(root ? { focus: root } : {}),
      collapsed: [...idx.children.keys()].filter((g): g is string => !!g && !expanded.has(g)),
      ...(scenarioId ? { scenario: scenarioId } : {}),
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(view, null, 2)], { type: 'application/json' }));
    a.download = 'view.json';
    a.click();
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
  const btn = (label: string, on: () => void, active = false) => (
    <button onClick={on} style={{
      border: `1px solid ${active ? th.accent : th.panelBorder}`, background: active ? th.accent : th.panel,
      color: active ? th.bg : th.text, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: th.bg, color: th.text,
      backgroundImage: `radial-gradient(${th.bgDot} 1px, transparent 1px)`, backgroundSize: '22px 22px' }}>
      {/* top bar */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', zIndex: 2 }}>
        <div style={{ marginRight: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{L(graph.meta.name)}</div>
          <div style={{ fontSize: 12, color: th.sub }}>
            {crumbs.length ? <>
              <a style={{ color: th.accent, cursor: 'pointer' }} onClick={() => setRoot(null)}>{U('common.root')}</a>
              {crumbs.map((c) => <span key={c}> / <a style={{ color: th.accent, cursor: 'pointer' }} onClick={() => setRoot(c)}>{L(idx.byId.get(c)?.name)}</a></span>)}
            </> : `${graph.nodes.length} ${U('common.nodes')} · ${graph.edges.length} ${U('common.edges')}`}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {seg((['topology', 'health', 'replaceability'] as const).map((id) => ({ id, label: U(`lens.${id}`) })), lens, setLens)}
        {seg((['stack', 'iso', 'flat'] as const).map((id) => ({ id, label: U(`projection.${id}`) })), projection, setProjection)}
        {locales.length > 1 && seg(locales.map((l) => ({ id: l, label: l.startsWith('zh') ? '中' : l.split('-')[0]!.toUpperCase() })), locale, setLocale)}
        {btn(themeId === 'midnight' ? '☀' : '☾', () => setThemeId(themeId === 'midnight' ? 'paper' : 'midnight'))}
        {btn('PNG', () => exportPng(th, `${L(graph.meta.name)}.png`))}
        {btn('view.json', saveView)}
      </div>

      {/* flows & scenarios */}
      <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 2, maxWidth: '60%' }}>
        {(graph.flows ?? []).map((f) => btn(`▶ ${L(f.name)}`, () => setFlowId(flowId === f.id ? null : f.id), flowId === f.id))}
        {(base.scenarios ?? []).map((s) => btn(`⇄ ${L(s.name)}`, () => setScenarioId(scenarioId === s.id ? null : s.id), scenarioId === s.id))}
      </div>
      {flow && (
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 2, background: th.panel,
          border: `1px solid ${th.panelBorder}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, backdropFilter: 'blur(8px)' }}>
          {step === 0 ? L(flow.name) : `${step}/${flow.steps.length} · ${L(flow.steps[step - 1]!.action)}`}
          {step > 0 && flow.steps[step - 1]!.latencyMs !== undefined && <span style={{ color: th.sub }}> · {flow.steps[step - 1]!.latencyMs}ms</span>}
        </div>
      )}

      <div ref={svgWrap} style={{ position: 'absolute', inset: '70px 0 0 0', right: selected ? 380 : 0 }}>
        {layout && (
          <Scene idx={idx} layout={layout} projection={projection} theme={th} locale={locale} lens={lens}
            selected={selected} highlight={highlight} activeEdges={activeEdges} diff={diff}
            onSelect={setSelected}
            onOpen={(id) => { setRoot(id); setSelected(null); }} />
        )}
      </div>

      {selected && idx.byId.get(selected) && (
        <Inspector idx={idx} id={selected} theme={th} locale={locale} defaultLocale={defaultLocale} impact={impact!}
          expanded={expanded.has(selected)}
          onToggleExpand={() => setExpanded((s) => { const n = new Set(s); n.has(selected) ? n.delete(selected) : n.add(selected); return n; })}
          onOpen={() => { setRoot(selected); setSelected(null); }}
          onSelect={setSelected}
          onScenario={(sid) => setScenarioId(sid)}
          prompt={(opt) => replacementPrompt(idx, selected, opt, locale)}
          onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
