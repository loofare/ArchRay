import React from 'react';
import type { ArchFlow, ArchFlowStep, ArchLensMode, Point2D, PositionedEdge } from '../types/archray';

interface FlowEdgesProps {
  edges: PositionedEdge[];
  lensMode: ArchLensMode;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  activeFlow: ArchFlow | null;
  activeStepIndex: number;
  hasFocusFilter: boolean;
}

function buildReversedFilletedPath(points: Point2D[], cornerRadius = 14): string {
  const rev = [...points].reverse();
  if (rev.length === 0) return '';
  if (rev.length === 1) return `M ${rev[0].x} ${rev[0].y}`;
  if (rev.length === 2) {
    return `M ${rev[0].x.toFixed(1)} ${rev[0].y.toFixed(1)} L ${rev[1].x.toFixed(1)} ${rev[1].y.toFixed(1)}`;
  }

  const segments: string[] = [`M ${rev[0].x.toFixed(1)} ${rev[0].y.toFixed(1)}`];
  for (let i = 1; i < rev.length - 1; i++) {
    const prev = rev[i - 1];
    const curr = rev[i];
    const next = rev[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) {
      segments.push(`L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`);
      continue;
    }

    const r = Math.min(cornerRadius, len1 * 0.4, len2 * 0.4);
    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;

    segments.push(
      `L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`
    );
  }
  const last = rev[rev.length - 1];
  segments.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  return segments.join(' ');
}

function stepMatchesEdge(step: ArchFlowStep, pe: PositionedEdge): { matched: boolean; reversed: boolean } {
  if (step.edgeId && step.edgeId === pe.edge.id) {
    const reversed = step.from === pe.edge.target && step.to === pe.edge.source;
    return { matched: true, reversed };
  }
  if (step.from === pe.edge.source && step.to === pe.edge.target) {
    return { matched: true, reversed: false };
  }
  if (step.from === pe.edge.target && step.to === pe.edge.source) {
    return { matched: true, reversed: true };
  }
  return { matched: false, reversed: false };
}

function truncate(s: string, len: number): string {
  return s.length <= len ? s : `${s.slice(0, len - 1)}…`;
}

export const FlowEdges: React.FC<FlowEdgesProps> = ({
  edges,
  lensMode,
  hoveredNodeId,
  selectedNodeId,
  activeFlow,
  activeStepIndex,
  hasFocusFilter,
}) => {
  const currentStep = activeFlow ? activeFlow.steps[activeStepIndex] ?? null : null;

  return (
    <g className="archray-edges-layer">
      <defs>
        <filter id="archray-edge-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="archray-particle-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {edges.map((pe) => {
        const { edge, pathD, midpoint, points } = pe;
        const isPlanned = edge.status === 'planned';
        const isBottleneck = edge.status === 'bottleneck';

        const touchesHovered =
          hoveredNodeId !== null && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);
        const touchesSelected =
          selectedNodeId !== null && (edge.source === selectedNodeId || edge.target === selectedNodeId);

        const inActiveFlow = activeFlow
          ? activeFlow.steps.some((st) => stepMatchesEdge(st, pe).matched)
          : false;

        const currentStepMatch = currentStep
          ? stepMatchesEdge(currentStep, pe)
          : { matched: false, reversed: false };

        const isCurrentStep = currentStepMatch.matched;
        const isNeonActive = isCurrentStep || touchesHovered || (activeFlow !== null && inActiveFlow);

        let opacity = 0.72;
        if (hasFocusFilter) {
          opacity = isNeonActive || touchesSelected ? 1 : 0.12;
        } else if (lensMode === 'diff' && !isPlanned && !touchesSelected) {
          opacity = 0.28;
        }

        let strokeColor = 'rgba(148, 163, 184, 0.36)';
        if (isCurrentStep) {
          strokeColor = isPlanned ? '#38BDF8' : isBottleneck ? '#F59E0B' : '#22D3EE';
        } else if (touchesHovered || (activeFlow && inActiveFlow)) {
          strokeColor = isPlanned ? '#38BDF8' : '#818CF8';
        } else if (isPlanned) {
          strokeColor = 'rgba(56, 189, 248, 0.68)';
        } else if (isBottleneck) {
          strokeColor = 'rgba(245, 158, 11, 0.68)';
        } else if (touchesSelected) {
          strokeColor = 'rgba(56, 189, 248, 0.75)';
        }

        const motionPath = currentStepMatch.reversed ? buildReversedFilletedPath(points, 14) : pathD;

        return (
          <g
            key={edge.id}
            style={{ opacity, transition: 'opacity 220ms ease' }}
          >
            {/* Base Isometric Orthogonal Wire */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isCurrentStep ? 2.8 : isNeonActive ? 2.1 : 1.45}
              strokeDasharray={isPlanned ? '6 4' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={isNeonActive ? 'url(#archray-edge-glow)' : undefined}
            />

            {/* Animated Flow Stream Overlay when Hovered or Part of Active Flow */}
            {(isCurrentStep || touchesHovered) && (
              <path
                d={motionPath}
                fill="none"
                stroke={isCurrentStep ? '#E0F2FE' : '#7DD3FC'}
                strokeOpacity={isCurrentStep ? 0.85 : 0.65}
                strokeWidth={isCurrentStep ? 2.2 : 1.6}
                strokeDasharray="8 16"
                strokeLinecap="round"
                className="archray-dash-flow"
              />
            )}

            {/* Glowing Data Packet Particles for Current Step or Hovered Node Connections */}
            {isCurrentStep && (
              <g filter="url(#archray-particle-glow)">
                <circle r="5.5" fill="#22D3EE" fillOpacity="0.45">
                  <animateMotion dur="1.45s" repeatCount="indefinite" path={motionPath} />
                </circle>
                <circle r="3" fill="#F8FAFC">
                  <animateMotion dur="1.45s" repeatCount="indefinite" path={motionPath} />
                </circle>
                <circle r="2.2" fill="#38BDF8" fillOpacity="0.85">
                  <animateMotion dur="1.45s" begin="0.35s" repeatCount="indefinite" path={motionPath} />
                </circle>
              </g>
            )}

            {!isCurrentStep && touchesHovered && (
              <g filter="url(#archray-particle-glow)">
                <circle r="2.8" fill="#38BDF8">
                  <animateMotion
                    dur="1.9s"
                    repeatCount="indefinite"
                    path={edge.target === hoveredNodeId ? pathD : pathD}
                  />
                </circle>
              </g>
            )}

            {/* Edge Protocol / Label Tag on Active or Selected Edges */}
            {(isNeonActive || touchesSelected) && (edge.label || edge.protocol) && (
              <g transform={`translate(${midpoint.x.toFixed(1)}, ${midpoint.y.toFixed(1)})`}>
                <rect
                  x="-54"
                  y="-10"
                  width="108"
                  height="18"
                  rx="9"
                  fill="rgba(11, 15, 25, 0.92)"
                  stroke={strokeColor}
                  strokeOpacity="0.7"
                  strokeWidth="0.9"
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {truncate(
                    edge.protocol ? `${edge.protocol.toUpperCase()} · ${edge.label ?? ''}` : edge.label ?? '',
                    21
                  )}
                </text>
              </g>
            )}

            {/* Active Flow Step Payload Callout Bubble */}
            {isCurrentStep && currentStep && (
              <g transform={`translate(${midpoint.x.toFixed(1)}, ${(midpoint.y - 42).toFixed(1)})`}>
                <line
                  x1="0"
                  y1="26"
                  x2="0"
                  y2="34"
                  stroke="#22D3EE"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
                <rect
                  x="-118"
                  y="-24"
                  width="236"
                  height="50"
                  rx="10"
                  fill="rgba(15, 23, 42, 0.96)"
                  stroke="#22D3EE"
                  strokeWidth="1.3"
                  filter="url(#archray-edge-glow)"
                />
                <text x="-106" y="-8" fill="#22D3EE" fontSize="9" fontWeight="700" letterSpacing="0.05em">
                  STEP {currentStep.step}
                  {typeof currentStep.latencyMs === 'number' ? ` · ${currentStep.latencyMs}ms` : ''}
                </text>
                <text x="-106" y="6" fill="#F8FAFC" fontSize="10.5" fontWeight="600">
                  {truncate(currentStep.action, 34)}
                </text>
                <text x="-106" y="19" fill="#94A3B8" fontSize="8.5" fontFamily="ui-monospace, monospace">
                  {truncate(currentStep.payload, 38)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
