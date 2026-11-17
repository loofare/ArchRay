import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  FileCode2,
  GitFork,
  Layers,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import type { ArchEdge, ArchLayer, ArchNode } from '../types/archray';

interface InspectorProps {
  node: ArchNode | null;
  layers: ArchLayer[];
  allNodes: ArchNode[];
  edges: ArchEdge[];
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  onDrillDown: (node: ArchNode) => void;
}

function StatusBadge({ status }: { status: ArchNode['status'] }) {
  const styles: Record<ArchNode['status'], string> = {
    healthy: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    bottleneck: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    'high-complexity': 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    planned: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    deprecated: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {(status === 'bottleneck' || status === 'high-complexity') && (
        <AlertTriangle className="h-3 w-3" />
      )}
      {status === 'planned' && <Sparkles className="h-3 w-3" />}
      {status}
    </span>
  );
}

export const Inspector: React.FC<InspectorProps> = ({
  node,
  layers,
  allNodes,
  edges,
  onClose,
  onFocusNode,
  onDrillDown,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (!node) return null;

  const layer = layers.find((l) => l.id === node.layerId);
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const inboundEdges = edges.filter((e) => e.target === node.id);
  const outboundEdges = edges.filter((e) => e.source === node.id);
  const hasChildren = Boolean(node.children && node.children.nodes.length > 0);

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1600);
    } catch {
      // Clipboard blocked in restricted contexts
    }
  };

  const handleCopyAiPrompt = async () => {
    const inboundText =
      inboundEdges.length > 0
        ? inboundEdges
            .map(
              (e) =>
                `- ${nodeMap.get(e.source)?.label ?? e.source} -> [${e.protocol ?? 'ipc'}] ${e.label ?? ''}`
            )
            .join('\n')
        : '- None';

    const outboundText =
      outboundEdges.length > 0
        ? outboundEdges
            .map(
              (e) =>
                `- [${e.protocol ?? 'ipc'}] ${e.label ?? ''} -> ${nodeMap.get(e.target)?.label ?? e.target}`
            )
            .join('\n')
        : '- None';

    const prompt = [
      `# ArchRay Refactoring Context: ${node.label} (${node.id})`,
      '',
      `- **Layer**: ${layer ? `L${layer.order} ${layer.label}` : node.layerId}`,
      `- **Kind / Status**: \`${node.kind}\` / \`${node.status}\``,
      `- **Tech Stack**: ${node.techStack.join(', ')}`,
      `- **Responsibility**: ${node.description}`,
      '',
      '## Mapped Source Files',
      ...node.sourcePaths.map((p) => `- \`${p}\``),
      '',
      '## Metrics & Vitals',
      `- Complexity: ${node.metrics?.complexity ?? 'N/A'} | Coupling: ${node.metrics?.coupling ?? 'N/A'} | LOC: ${node.metrics?.loc ?? 'N/A'}`,
      node.metrics?.latencyMs ? `- Latency: ${node.metrics.latencyMs}` : '',
      node.metrics?.throughput ? `- Throughput: ${node.metrics.throughput}` : '',
      '',
      '## Contracts',
      `- Exposes: ${(node.contracts?.exposes ?? []).join('; ') || 'N/A'}`,
      `- Consumes: ${(node.contracts?.consumes ?? []).join('; ') || 'N/A'}`,
      '',
      '## Inbound Callers',
      inboundText,
      '',
      '## Outbound Dependencies',
      outboundText,
      '',
      node.refactorNotes ? `## Architecture Notes\n${node.refactorNotes}\n` : '',
      '## Request',
      'Inspect the mapped source files above, preserve all upstream/downstream contracts, and propose a concrete refactoring plan + patch to reduce complexity/bottlenecks.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2200);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <aside
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute top-20 right-4 bottom-24 z-30 flex w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/92 shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
              {node.kind}
            </span>
            <StatusBadge status={node.status} />
          </div>
          <h2 className="mt-1.5 truncate text-base font-bold text-slate-100">{node.label}</h2>
          {node.subtitle && <p className="truncate text-xs text-slate-400">{node.subtitle}</p>}
          {layer && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Layers className="h-3 w-3 text-indigo-400" />
              <span>
                L{layer.order} · {layer.label}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3.5 text-xs">
        {/* C4 Subgraph Drill-down CTA */}
        {hasChildren && (
          <button
            type="button"
            onClick={() => onDrillDown(node)}
            className="flex w-full items-center justify-between rounded-xl border border-sky-500/50 bg-sky-500/15 px-3.5 py-2.5 text-left font-semibold text-sky-200 transition hover:bg-sky-500/25"
          >
            <span className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-sky-400" />
              Drill Down into C4 Subgraph
            </span>
            <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[10.5px] text-sky-300">
              {node.children?.nodes.length} modules
            </span>
          </button>
        )}

        {/* Description */}
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Responsibility
          </h3>
          <p className="leading-relaxed text-slate-200">{node.description}</p>
        </div>

        {/* Tech Stack Pills */}
        {node.techStack.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {node.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics & Vitals */}
        {node.metrics && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              System Vitals
            </h3>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
              {typeof node.metrics.complexity === 'number' && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Complexity</span>
                    <span className="font-mono font-bold text-slate-200">
                      {node.metrics.complexity}/100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        node.metrics.complexity >= 70
                          ? 'bg-rose-500'
                          : node.metrics.complexity >= 45
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, node.metrics.complexity)}%` }}
                    />
                  </div>
                </div>
              )}
              {typeof node.metrics.coupling === 'number' && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Coupling</span>
                    <span className="font-mono font-bold text-slate-200">
                      {node.metrics.coupling}/100
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        node.metrics.coupling >= 70
                          ? 'bg-rose-500'
                          : node.metrics.coupling >= 45
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                      }`}
                      style={{ width: `${Math.min(100, node.metrics.coupling)}%` }}
                    />
                  </div>
                </div>
              )}
              {typeof node.metrics.loc === 'number' && (
                <div className="text-[11px] text-slate-400">
                  LOC: <span className="font-mono font-semibold text-slate-200">{node.metrics.loc.toLocaleString()}</span>
                </div>
              )}
              {node.metrics.latencyMs && (
                <div className="text-[11px] text-slate-400">
                  Latency: <span className="font-mono font-semibold text-emerald-300">{node.metrics.latencyMs}</span>
                </div>
              )}
              {node.metrics.throughput && (
                <div className="col-span-2 text-[11px] text-slate-400">
                  Throughput: <span className="font-mono font-semibold text-sky-300">{node.metrics.throughput}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refactor Notes */}
        {node.refactorNotes && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Wrench className="h-3.5 w-3.5" />
              Architecture Advisory
            </div>
            <p className="mt-1 leading-relaxed text-amber-100/90">{node.refactorNotes}</p>
          </div>
        )}

        {/* Mapped Source Paths */}
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Mapped Source Paths ({node.sourcePaths.length})
          </h3>
          <div className="space-y-1.5">
            {node.sourcePaths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => handleCopyPath(path)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-left font-mono text-[11px] text-slate-300 transition hover:border-sky-500/50 hover:text-sky-200"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span className="truncate">{path}</span>
                </span>
                {copiedPath === path ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 text-slate-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contracts */}
        {node.contracts && (
          <div className="space-y-2">
            {node.contracts.exposes && node.contracts.exposes.length > 0 && (
              <div>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Exposes
                </h3>
                <ul className="space-y-1 font-mono text-[11px] text-emerald-300">
                  {node.contracts.exposes.map((c) => (
                    <li key={c} className="rounded bg-slate-950/70 px-2 py-1">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {node.contracts.consumes && node.contracts.consumes.length > 0 && (
              <div>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Consumes
                </h3>
                <ul className="space-y-1 font-mono text-[11px] text-indigo-300">
                  {node.contracts.consumes.map((c) => (
                    <li key={c} className="rounded bg-slate-950/70 px-2 py-1">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upstream & Downstream Dependencies */}
        <div className="space-y-2.5">
          <div>
            <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
              Inbound Callers ({inboundEdges.length})
            </h3>
            {inboundEdges.length === 0 ? (
              <p className="text-[11px] text-slate-500">Entry node / no inbound links.</p>
            ) : (
              <div className="space-y-1">
                {inboundEdges.map((edge) => {
                  const src = nodeMap.get(edge.source);
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => onFocusNode(edge.source)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/65 px-2.5 py-1.5 text-left transition hover:border-slate-600"
                    >
                      <span className="truncate font-medium text-slate-200">
                        {src?.label ?? edge.source}
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                        {edge.protocol?.toUpperCase() ?? 'LINK'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
              Outbound Dependencies ({outboundEdges.length})
            </h3>
            {outboundEdges.length === 0 ? (
              <p className="text-[11px] text-slate-500">Leaf node / no outbound links.</p>
            ) : (
              <div className="space-y-1">
                {outboundEdges.map((edge) => {
                  const dst = nodeMap.get(edge.target);
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => onFocusNode(edge.target)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/65 px-2.5 py-1.5 text-left transition hover:border-slate-600"
                    >
                      <span className="truncate font-medium text-slate-200">
                        {dst?.label ?? edge.target}
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                        {edge.protocol?.toUpperCase() ?? 'LINK'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA: Copy AI Refactor Prompt */}
      <div className="border-t border-slate-800 bg-slate-950/80 p-3">
        <button
          type="button"
          onClick={handleCopyAiPrompt}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-indigo-500"
        >
          {copiedPrompt ? (
            <>
              <Check className="h-4 w-4 text-emerald-200" />
              <span>Copied AI Refactoring Context!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy AI Refactor Context Prompt</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
