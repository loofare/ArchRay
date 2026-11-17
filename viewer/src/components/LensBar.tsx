import React, { useRef } from 'react';
import {
  Activity,
  Box,
  Flame,
  GitBranchPlus,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { ArchLensMode, ArchRayGraph } from '../types/archray';

interface LensBarProps {
  graph: ArchRayGraph;
  lensMode: ArchLensMode;
  onChangeLens: (mode: ArchLensMode) => void;
  onLoadCustomGraph: (graph: ArchRayGraph) => void;
  onResetDefaultGraph: () => void;
  isCustomLoaded: boolean;
}

export const LensBar: React.FC<LensBarProps> = ({
  graph,
  lensMode,
  onChangeLens,
  onLoadCustomGraph,
  onResetDefaultGraph,
  isCustomLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottleneckCount = graph.nodes.filter(
    (n) => n.status === 'bottleneck' || n.status === 'high-complexity'
  ).length;
  const plannedCount = graph.nodes.filter((n) => n.status === 'planned').length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ArchRayGraph;
      if (parsed && Array.isArray(parsed.layers) && Array.isArray(parsed.nodes)) {
        onLoadCustomGraph(parsed);
      }
    } catch {
      // Ignore invalid JSON upload
    } finally {
      e.target.value = '';
    }
  };

  const lenses: Array<{
    id: ArchLensMode;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'topology',
      label: 'Topology',
      icon: <Box className="h-3.5 w-3.5" />,
    },
    {
      id: 'heatmap',
      label: 'Vitals Heatmap',
      icon: <Flame className="h-3.5 w-3.5" />,
      badge: bottleneckCount > 0 ? `${bottleneckCount} hot` : undefined,
    },
    {
      id: 'diff',
      label: 'Evolution Diff',
      icon: <GitBranchPlus className="h-3.5 w-3.5" />,
      badge: plannedCount > 0 ? `+${plannedCount}` : undefined,
    },
  ];

  return (
    <header
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute top-3.5 left-1/2 z-30 flex w-[min(96vw,1160px)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/75 bg-slate-900/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl"
    >
      {/* Left: Brand + System Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-500 to-indigo-600 shadow-lg shadow-sky-500/20">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" />
            <polyline points="3 7 12 12 21 7" />
            <line x1="12" y1="12" x2="12" y2="22" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">ArchRay</span>
            <span className="text-slate-600">/</span>
            <h1 className="truncate text-sm font-bold text-slate-100">{graph.meta.name}</h1>
            {typeof graph.meta.stats?.healthScore === 'number' && (
              <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                <Activity className="h-3 w-3" />
                {graph.meta.stats.healthScore}/100
              </span>
            )}
          </div>
          <p className="hidden sm:block truncate text-[11px] text-slate-400">
            {graph.layers.length} Layers · {graph.nodes.length} Modules · {graph.edges.length} Links ·{' '}
            {graph.flows.length} Flows
          </p>
        </div>
      </div>

      {/* Center: Multidimensional Lens Switcher */}
      <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-950/75 p-1">
        {lenses.map((lens) => {
          const active = lensMode === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              onClick={() => onChangeLens(lens.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lens.icon}
              <span>{lens.label}</span>
              {lens.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    lens.id === 'heatmap'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {lens.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Contextual Legend + Load JSON */}
      <div className="flex items-center gap-2">
        {lensMode === 'heatmap' && (
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[10.5px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Cool
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Warm
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
        >
          <Upload className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">Load JSON</span>
        </button>

        {isCustomLoaded && (
          <button
            type="button"
            title="Restore Built-in Graph"
            onClick={onResetDefaultGraph}
            className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-amber-500/60 hover:text-amber-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
