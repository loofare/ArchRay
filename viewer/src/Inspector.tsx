import { useState } from 'react';
import { t, ui, type AlternativeOption, type GraphIndex, type Impact, type UiKey } from '@archray/core';
import { kindLabel, kindSpec } from './kinds';
import { alpha, type Theme } from './theme';
import { brandFor, BrandGlyph } from './brands';

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
  const brand = brandFor(...(n.techStack ?? []), L(n.name));
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
    <div className="ar-ins-sec">{children}</div>
  );
  const chip = (text: string, c = th.sub) => (
    <span key={text} className="ar-chip" style={{ background: alpha(c, 0.13), color: c, borderColor: alpha(c, 0.28) }}>{text}</span>
  );
  const link = (id: string) => (
    <button key={id} type="button" className="ar-dep-chip" onClick={() => p.onSelect(id)}>{name(id)}</button>
  );
  const small = (label: string, on: () => void, primary = false) => (
    <button type="button" onClick={on} className={`ar-ins-btn${primary ? ' is-primary' : ''}`}>{label}</button>
  );
  const alt = n.alternatives;
  const safeReference = (value: string): string | null => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  };
  const sevColor = (s?: string) => (s === 'critical' ? th.critical : s === 'warn' ? th.warn : th.sub);
  const repColor = alt?.replaceability === 'high' ? th.good : alt?.replaceability === 'medium' ? th.warn : th.critical;

  return (
    <div className="ar-scroll ar-inspector ar-glass">
      <div className="ar-inspector-head">
        <div className="ar-inspector-icon" style={{
          background: brand ? (brand.dark ? '#0F172A' : 'rgba(255,255,255,0.96)') : alpha(spec.hue, 0.15),
          borderColor: brand ? (brand.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)') : alpha(spec.hue, 0.34),
        }}>
          {brand ? <BrandGlyph brand={brand} size={23} /> : <Icon size={21} color={spec.hue} />}
        </div>
        <div className="ar-inspector-title-wrap">
          <div className="ar-inspector-title">{L(n.name)}</div>
          <div className="ar-inspector-sub">
            {kindLabel(n.kind, locale)}
            {n.lifecycle && n.lifecycle !== 'active' ? ` · ${U(`lifecycle.${n.lifecycle}`)}` : ''}
          </div>
        </div>
        <button type="button" className="ar-inspector-close" onClick={p.onClose} aria-label={U('common.close')}>×</button>
      </div>

      {fallback && (
        <div role="alert" className="ar-finding-card" style={{ borderLeftColor: th.warn, marginTop: 10 }}>
          <div>{U('inspector.copyFallback')}</div>
          <textarea aria-label={U('inspector.promptText')} readOnly value={fallback} className="ar-inspector-fallback" />
        </div>
      )}

      <p className="ar-inspector-note">{U('inspector.evidence')}</p>
      {n.summary && !n.description && <p className="ar-inspector-desc">{L(n.summary)}</p>}
      {n.description && <p className="ar-inspector-desc">{L(n.description)}</p>}

      {kids.length > 0 && (
        <div className="ar-inspector-actions">
          {small(U('inspector.children'), p.onOpen, true)}
          {small(U(p.expanded ? 'inspector.collapseChildren' : 'inspector.expandChildren'), p.onToggleExpand)}
        </div>
      )}

      {n.techStack?.length ? <><H>{U('inspector.stack')}</H><div className="ar-chip-row">{n.techStack.map((s) => chip(s, th.accent))}</div></> : null}

      {n.metrics && (
        <div className="ar-stat-grid">
          {Object.entries(n.metrics).map(([k, m]) => (
            <div key={k} className="ar-stat-card">
              <b>{m.value.toLocaleString()}{m.unit ?? ''}</b>
              <small>{k} · {m.origin === 'measured' ? U('common.measured') : U('common.estimated')}</small>
            </div>
          ))}
        </div>
      )}

      {n.health?.findings?.length ? (
        <>
          <H>{U('inspector.findings')}</H>
          <div className="ar-finding-list">
            {n.health.findings.map((f, i) => (
              <div key={i} className="ar-finding-card" style={{ borderLeftColor: sevColor(f.severity) }}>
                <div>{L(f.text)}</div>
                {f.evidence?.length ? <div className="ar-finding-ev">{f.evidence.join(', ')}</div> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {alt && (
        <>
          <H>{U('lens.replaceability')}</H>
          <div className="ar-chip-row">{chip(U(`replace.${alt.replaceability}`), repColor)}</div>
          {alt.rationale && <div className="ar-inspector-desc">{L(alt.rationale)}</div>}
          {alt.lockIn?.length ? (
            <div className="ar-inspector-lockin">
              <span>{U('inspector.lockIn')}: </span>
              {alt.lockIn.map((x) => L(x)).join(' · ')}
            </div>
          ) : null}
          {(alt.options ?? []).map((o) => (
            <div key={o.id} className="ar-alt-card">
              <div className="ar-alt-head">
                <b>{L(o.name)}</b>{chip(U(`alt.${o.type}`))}
              </div>
              <div className="ar-alt-sum">{L(o.summary)}</div>
              {o.pros?.map((x, i) => <div key={'p' + i} className="ar-alt-pro">+ {L(x)}</div>)}
              {o.cons?.map((x, i) => <div key={'c' + i} className="ar-alt-con">− {L(x)}</div>)}
              {(o.effort || o.risk) && (
                <div className="ar-alt-meta">
                  {o.effort && `${U('inspector.effort')}: ${o.effort}`}
                  {o.effort && o.risk && ' · '}
                  {o.risk && `${U('inspector.risk')}: ${U(`risk.${o.risk}` as UiKey)}`}
                </div>
              )}
              {o.references?.length ? (
                <div className="ar-alt-refs">
                  <span>{U('inspector.references')}: </span>
                  {o.references.map((r) => {
                    const href = safeReference(r);
                    return href
                      ? <a key={r} href={href} target="_blank" rel="noopener noreferrer">{r}</a>
                      : <span key={r} title={U('inspector.unsafeUrl')} className="ar-alt-ref-bad">{r}</span>;
                  })}
                </div>
              ) : null}
              <div className="ar-inspector-actions">
                {o.scenario && small(U('inspector.preview'), () => p.onScenario(o.scenario!), true)}
                {small(copied === o.id ? U('inspector.copied') : U('inspector.copyPrompt'), () => copy(o.id, o))}
              </div>
            </div>
          ))}
        </>
      )}

      <H>{U('inspector.impact')}</H>
      <div className="ar-ins-sublabel">{U('inspector.inbound')}:</div>
      <div className="ar-dep-list">{p.impact.upstream.length ? p.impact.upstream.map(link) : <span className="ar-ins-dash">—</span>}</div>
      {p.impact.mustKeep.length > 0 && <div className="ar-chip-row">{p.impact.mustKeep.map((m) => chip(m, th.warn))}</div>}
      {p.impact.flows.length > 0 && (
        <div className="ar-inspector-flows">
          ▶ {p.impact.flows.map((f) => L(idx.graph.flows?.find((x) => x.id === f)?.name)).join(', ')}
        </div>
      )}
      {!alt && <div className="ar-inspector-actions">{small(copied === '_' ? U('inspector.copied') : U('inspector.copyPrompt'), () => copy('_', null))}</div>}

      {(inbound.length > 0 || outbound.length > 0) && (
        <>
          <H>{U('inspector.outbound')}</H>
          <div className="ar-dep-list">{outbound.length ? [...new Set(outbound.map((e) => e.target))].map(link) : <span className="ar-ins-dash">—</span>}</div>
          <H>{U('inspector.inbound')}</H>
          <div className="ar-dep-list">{inbound.length ? [...new Set(inbound.map((e) => e.source))].map(link) : <span className="ar-ins-dash">—</span>}</div>
        </>
      )}

      {n.sourcePaths?.length ? (
        <>
          <H>{U('inspector.sources')}</H>
          <div className="ar-source-list">
            {n.sourcePaths.map((s) => <div key={s} className="ar-source-chip">{s}</div>)}
          </div>
        </>
      ) : null}
    </div>
  );
}
