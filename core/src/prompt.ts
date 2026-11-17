import type { AlternativeOption } from './schema';
import { impactOf, type GraphIndex } from './graph';
import { t } from './i18n';

/** Build a migration prompt the user pastes back into their AI agent. Deterministic impact comes from the engine. */
export function replacementPrompt(idx: GraphIndex, nodeId: string, option: AlternativeOption | null, locale: string): string {
  const n = idx.byId.get(nodeId);
  if (!n) return '';
  const def = idx.graph.meta.defaultLocale ?? idx.graph.meta.locales[0] ?? 'en';
  const L = (x: Parameters<typeof t>[0]) => t(x, locale, def);
  const imp = impactOf(idx, nodeId);
  const name = (id: string) => L(idx.byId.get(id)?.name) || id;
  const zh = locale.startsWith('zh');

  const lines = [
    zh ? `# ArchRay 迁移任务：${L(n.name)}${option ? ` → ${L(option.name)}` : ''}` : `# ArchRay migration task: ${L(n.name)}${option ? ` → ${L(option.name)}` : ''}`,
    '',
    `- id: \`${n.id}\`  kind: \`${n.kind}\``,
    n.techStack?.length ? `- ${zh ? '当前技术栈' : 'Current stack'}: ${n.techStack.join(', ')}` : '',
    n.description ? `- ${zh ? '职责' : 'Responsibility'}: ${L(n.description)}` : '',
    '',
    `## ${zh ? '源码' : 'Source files'}`,
    ...(n.sourcePaths ?? []).map((p) => `- \`${p}\``),
    '',
    `## ${zh ? '影响范围（由 ArchRay 依赖图计算）' : 'Blast radius (computed by ArchRay from the dependency graph)'}`,
    `- ${zh ? '直接相连' : 'Direct'}: ${imp.direct.map(name).join(', ') || '-'}`,
    `- ${zh ? '上游调用方（会受契约变化影响）' : 'Upstream callers (break if contract changes)'}: ${imp.upstream.map(name).join(', ') || '-'}`,
    `- ${zh ? '必须保持的契约' : 'Contracts to preserve'}: ${imp.mustKeep.join('; ') || '-'}`,
    `- ${zh ? '涉及链路' : 'Affected flows'}: ${imp.flows.map((f) => L(idx.graph.flows?.find((x) => x.id === f)?.name) || f).join(', ') || '-'}`,
  ];
  if (option) {
    lines.push(
      '',
      `## ${zh ? '目标方案' : 'Target option'}: ${L(option.name)} (${option.type}${option.effort ? `, effort ${option.effort}` : ''}${option.risk ? `, risk ${option.risk}` : ''})`,
      L(option.summary),
      ...(option.pros ?? []).map((p) => `+ ${L(p)}`),
      ...(option.cons ?? []).map((c) => `- ${L(c)}`),
    );
  }
  lines.push(
    '',
    `## ${zh ? '请求' : 'Request'}`,
    zh
      ? '请阅读上述源码，在保持契约不变的前提下给出分步迁移计划（含回滚方案），然后实施第一步并更新 .archray/graph.json。'
      : 'Read the files above, produce a step-by-step migration plan (with rollback) that preserves the listed contracts, implement step 1, then update .archray/graph.json.'
  );
  return lines.filter((l) => l !== '').join('\n').replace(/\n## /g, '\n\n## ');
}
