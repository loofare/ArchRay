import React from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import type { ArchFlow, ArchNode } from '../types/archray';

interface FlowPlayerProps {
  flows: ArchFlow[];
  nodes: ArchNode[];
  activeFlowId: string | null;
  activeStepIndex: number;
  isPlaying: boolean;
  onSelectFlow: (flowId: string | null) => void;
  onTogglePlay: () => void;
  onStepChange: (index: number) => void;
}

export const FlowPlayer: React.FC<FlowPlayerProps> = ({
  flows,
  nodes,
  activeFlowId,
  activeStepIndex,
  isPlaying,
  onSelectFlow,
  onTogglePlay,
  onStepChange,
}) => {
  if (flows.length === 0) return null;

  const activeFlow = flows.find((f) => f.id === activeFlowId) ?? null;
  const currentStep = activeFlow ? activeFlow.steps[activeStepIndex] ?? activeFlow.steps[0] : null;
  const nodeLabelMap = new Map(nodes.map((n) => [n.id, n.label]));

  const getCategoryIcon = (category?: ArchFlow['category']) => {
    switch (category) {
      case 'async':
        return <Zap className="h-3.5 w-3.5 text-amber-400" />;
      case 'evolution':
        return <Sparkles className="h-3.5 w-3.5 text-sky-400" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute bottom-5 left-1/2 z-20 w-[min(92vw,760px)] -translate-x-1/2"
    >
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl">
        {/* Flow Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Flows
            </span>
            {flows.map((flow) => {
              const selected = flow.id === activeFlowId;
              return (
                <button
                  key={flow.id}
                  type="button"
                  onClick={() => onSelectFlow(selected ? null : flow.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    selected
                      ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {getCategoryIcon(flow.category)}
                  <span className="max-w-[190px] truncate">{flow.name}</span>
                  <span className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {flow.steps.length}
                  </span>
                </button>
              );
            })}
          </div>

          {activeFlow && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Previous Step"
                onClick={() =>
                  onStepChange(
                    (activeStepIndex - 1 + activeFlow.steps.length) % activeFlow.steps.length
                  )
                }
                className="rounded-lg border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                title={isPlaying ? 'Pause Flow' : 'Play Flow'}
                onClick={onTogglePlay}
                className="flex items-center gap-1 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/30"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                title="Next Step"
                onClick={() => onStepChange((activeStepIndex + 1) % activeFlow.steps.length)}
                className="rounded-lg border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Exit Flow Replay"
                onClick={() => onSelectFlow(null)}
                className="ml-1 rounded-lg border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Active Step Timeline & Payload Preview */}
        {activeFlow && currentStep && (
          <div className="mt-2.5 border-t border-slate-800 pt-2.5">
            {/* Step Progress Dots */}
            <div className="mb-2 flex items-center gap-1.5">
              {activeFlow.steps.map((st, idx) => {
                const isCurr = idx === activeStepIndex;
                const isDone = idx < activeStepIndex;
                return (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => onStepChange(idx)}
                    className={`group flex flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition ${
                      isCurr
                        ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/60'
                        : isDone
                          ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-900/70 text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCurr ? 'bg-cyan-400' : isDone ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <span>S{st.step}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Step Narrative + Payload Bubble */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/75 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-cyan-300">
                    Step {currentStep.step}/{activeFlow.steps.length}
                  </span>
                  <span className="font-semibold text-slate-100">
                    {nodeLabelMap.get(currentStep.from) ?? currentStep.from}
                  </span>
                  <span className="text-cyan-400">→</span>
                  <span className="font-semibold text-slate-100">
                    {nodeLabelMap.get(currentStep.to) ?? currentStep.to}
                  </span>
                  {typeof currentStep.latencyMs === 'number' && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                      {currentStep.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-300">{currentStep.action}</p>
              </div>
              <div className="max-w-full sm:max-w-[330px] rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 font-mono text-[10.5px] text-sky-300 truncate">
                {currentStep.payload}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
