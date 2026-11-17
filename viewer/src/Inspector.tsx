import { useState } from 'react';
import { t, ui, type AlternativeOption, type GraphIndex, type Impact, type UiKey } from '@archray/core';
import { kindLabel, kindSpec } from './kinds';
import { alpha, type Theme } from './theme';

interface Props {
  idx: GraphIndex;
  id: string;
  theme: Theme;
  locale: string;
  defaultLocale: string;
  impact: Impact;
  expanded: boolean;
  onToggleExpand(): void;
  onOpen(): void;
  onSelect(id: string): void;
  onScenario(id: string): void;
  prompt(opt: AlternativeOption | null): string;
  onClose(): void;
}

export function Inspector(p: Props) {
  const { idx, theme: th, locale } = p;
  const n = idx.byId.get(p.id)!;
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, p.defaultLocale);
  const U = (k: UiKey) => ui(k, locale);
  const spec = kindSpec(n.kind);
  const Icon = spec.icon;
  const [copied, setCopied] = useState<string | null>(null);
  const [fallback, setFallback] = useState('');
  const copy = async (key: string, opt: AlternativeOption | null) => {
    const text = p.prompt(opt);
    try { await navigator.clipboard.writeText(text); } catch { setFallback(text); return; }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  const kids = idx.children.get(n.id) ?? [];
  const inbound = idx.graph.edges.filter((e) => e.target === n.id);
  const outbound = idx.graph.edges.filter((e) => e.source === n.id);
  const name = (id: string) => L(idx.byId.get(id)?.name) || id;

  const H = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: th.faint, textTransform: 'uppercase', margin: '18px 0 8px' }}>{children}</div>
  );
  const chip = (text: string, c = th.sub) => (
    <span key={text} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: alpha(c, 0.12), color: c, marginRight: 6, display: 'inline-block', marginBottom: 4 }}>{text}</span>
  );
  const link = (id: string) => (
    <a key={id} onClick={() => p.onSelect(id)} style={{ color: th.accent, cursor: 'pointer', marginRight: 10, fontSize: 13 }}>{name(id)}</a>
  );
  const small = (label: string, on: () => void, primary = false) => (
    <button onClick={on} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', marginRight: 6,
      border: `1px solid ${primary ? th.accent : th.panelBorder}`, background: primary ? alpha(th.accent, 0.15) : 'transparent', color: primary ? th.accent : th.text }}>{label}</button>
  );
  const alt = n.alternatives;
  const sevColor = (s?: string) => (s === 'critical' ? th.critical : s === 'warn' ? th.warn : th.sub);
  const repColor = alt?.replaceability === 'high' ? th.good : alt?.replaceability === 'medium' ? th.warn : th.critical;

  return (
    <div className="ar-scroll ar-inspector" style={{
      background: th.panel, border: `1px solid ${th.panelBorder}`, borderRadius: 14, padding: 18, backdropFilter: 'blur(12px)', fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: alpha(spec.hue, 0.15), display: 'grid', placeItems: 'center' }}>
          <Icon size={22} color={spec.hue} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{L(n.name)}</div>
          <div style={{ color: th.sub, fontSize: 12 }}>{kindLabel(n.kind, locale)}{n.lifecycle && n.lifecycle !== 'active' ? ` · ${U(`lifecycle.${n.lifecycle}`)}` : ''}</div>
        </div>
        <button onClick={p.onClose} style={{ background: 'none', border: 0, color: th.sub, fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
      {fallback && <div role="alert" style={{ borderLeft: `3px solid ${th.warn}`, paddingLeft: 10, marginTop: 8 }}>
        <div>{U('inspector.copyFallback')}</div>
        <textarea aria-label={U('inspector.promptText')} readOnly value={fallback} style={{ width: '100%', minHeight: 220, marginTop: 6 }} />
      </div>}
      <p style={{ color: th.sub, fontSize: 12 }}>{U('inspector.evidence')}</p>
      {n.description && <p style={{ color: th.sub, margin: '12px 0 0' }}>{L(n.description)}</p>}
      {kids.length > 0 && <div style={{ marginTop: 12 }}>
        {small(U('inspector.children'), p.onOpen, true)}
        {small(p.expanded ? '⊟' : '⊞', p.onToggleExpand)}
      </div>}

      {n.techStack?.length ? <><H>{U('inspector.stack')}</H>{n.techStack.map((s) => chip(s, th.accent))}</> : null}

      {n.metrics && <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        {Object.entries(n.metrics).map(([k, m]) => (
          <div key={k}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{m.value.toLocaleString()}{m.unit ?? ''}</div>
            <div style={{ fontSize: 11, color: th.faint }}>{k} · {m.origin === 'measured' ? U('common.measured') : U('common.estimated')}</div>
          </div>
        ))}
      </div>}

      {n.health?.findings?.length ? <><H>{U('inspector.findings')}</H>
        {n.health.findings.map((f, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${sevColor(f.severity)}`, paddingLeft: 10, marginBottom: 8 }}>
            <div>{L(f.text)}</div>
            {f.evidence?.length ? <div style={{ fontSize: 11, color: th.faint, fontFamily: 'ui-monospace, monospace' }}>{f.evidence.join(', ')}</div> : null}
          </div>
        ))}</> : null}

      {alt && <>
        <H>{U('lens.replaceability')}</H>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chip(U(`replace.${alt.replaceability}`), repColor)}
        </div>
        {alt.rationale && <div style={{ color: th.sub }}>{L(alt.rationale)}</div>}
        {alt.lockIn?.length ? <div style={{ marginTop: 6 }}><span style={{ color: th.faint, fontSize: 12 }}>{U('inspector.lockIn')}: </span>{alt.lockIn.map((x) => L(x)).join(' · ')}</div> : null}
        {(alt.options ?? []).map((o) => (
          <div key={o.id} style={{ border: `1px solid ${th.panelBorder}`, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b>{L(o.name)}</b>{chip(U(`alt.${o.type}`))}
            </div>
            <div style={{ color: th.sub, margin: '4px 0' }}>{L(o.summary)}</div>
            {o.pros?.map((x, i) => <div key={'p' + i} style={{ color: th.good, fontSize: 12 }}>+ {L(x)}</div>)}
            {o.cons?.map((x, i) => <div key={'c' + i} style={{ color: th.warn, fontSize: 12 }}>− {L(x)}</div>)}
            {(o.effort || o.risk) && <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>
              {o.effort && `${U('inspector.effort')}: ${o.effort}`}{o.effort && o.risk && ' · '}{o.risk && `${U('inspector.risk')}: ${o.risk}`}
            </div>}
            {o.references?.length ? <div style={{ marginTop: 6, fontSize: 12 }}>
              <span style={{ color: th.faint }}>{U('inspector.references')}: </span>
              {o.references.map((r) => <a key={r} href={r} target="_blank" rel="noreferrer" style={{ color: th.accent, marginRight: 8, overflowWrap: 'anywhere' }}>{r}</a>)}
            </div> : null}
            <div style={{ marginTop: 8 }}>
              {o.scenario && small(U('inspector.preview'), () => p.onScenario(o.scenario!), true)}
              {small(copied === o.id ? U('inspector.copied') : U('inspector.copyPrompt'), () => copy(o.id, o))}
            </div>
          </div>
        ))}
      </>}

      <H>{U('inspector.impact')}</H>
      <div style={{ color: th.sub, fontSize: 12 }}>{U('inspector.inbound')}:</div>
      <div>{p.impact.upstream.length ? p.impact.upstream.map(link) : '—'}</div>
      {p.impact.mustKeep.length > 0 && <div style={{ marginTop: 6 }}>{p.impact.mustKeep.map((m) => chip(m, th.warn))}</div>}
      {p.impact.flows.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: th.sub }}>▶ {p.impact.flows.map((f) => L(idx.graph.flows?.find((x) => x.id === f)?.name)).join(', ')}</div>}
      {!alt && <div style={{ marginTop: 8 }}>{small(copied === '_' ? U('inspector.copied') : U('inspector.copyPrompt'), () => copy('_', null))}</div>}

      {(inbound.length > 0 || outbound.length > 0) && <>
        <H>{U('inspector.outbound')}</H>
        <div>{outbound.length ? outbound.map((e) => link(e.target)) : '—'}</div>
        <H>{U('inspector.inbound')}</H>
        <div>{inbound.length ? inbound.map((e) => link(e.source)) : '—'}</div>
      </>}

      {n.sourcePaths?.length ? <><H>{U('inspector.sources')}</H>
        {n.sourcePaths.map((s) => <div key={s} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: th.sub }}>{s}</div>)}</> : null}
    </div>
  );
}
