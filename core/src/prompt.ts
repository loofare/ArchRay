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
    `- generatedAt: ${idx.graph.meta.generatedAt}; commit: ${idx.graph.meta.repo?.commit ?? 'unknown'}`,
    zh ? '依据仅限输入图；源码路径及依赖须复核，遗漏与动态依赖未知，候选不是现有源码。' : 'Evidence is limited to the input graph; verify source paths and dependencies. Missing/dynamic dependencies are unknown; candidates are not existing source.',
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
      ? '请先复核源码及图中事实，说明评价目标、依据与未知，评估保持现状；给出保持契约的迁移、回滚及验证计划。等待用户另行授权实施。'
      : 'Review source and graph facts first; state the goal, evidence and unknowns, including keeping the current implementation. Propose migration, rollback and verification plans preserving contracts. Wait for separate user authorization to implement.'
  );
  return lines.filter((l) => l !== '').join('\n').replace(/\n## /g, '\n\n## ');
}
