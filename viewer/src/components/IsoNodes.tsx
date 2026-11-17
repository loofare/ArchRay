import React from 'react';
import type { ArchLensMode, ArchNode, ArchNodeKind, ArchNodeStatus, PositionedNode } from '../types/archray';

interface IsoNodesProps {
  nodes: PositionedNode[];
  lensMode: ArchLensMode;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedNodeIds: Set<string>;
  hasFocusFilter: boolean;
  onHoverNode: (nodeId: string | null) => void;
  onSelectNode: (node: ArchNode) => void;
  onDrillDown: (node: ArchNode) => void;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function computeHeatScore(node: ArchNode): number {
  const base = Math.max(node.metrics?.complexity ?? 24, node.metrics?.coupling ?? 22);
  if (node.status === 'high-complexity') return Math.max(base, 82);
  if (node.status === 'bottleneck') return Math.max(base, 72);
  if (node.status === 'deprecated') return Math.max(base, 65);
  return base;
}

function getHeatColor(score: number): { stroke: string; fill: string; text: string; label: string } {
  if (score >= 75) {
    return { stroke: '#EF4444', fill: 'rgba(239, 68, 68, 0.22)', text: '#FCA5A5', label: 'CRITICAL' };
  }
  if (score >= 48) {
    return { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.22)', text: '#FDE68A', label: 'WARM' };
  }
  return { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.18)', text: '#6EE7B7', label: 'COOL' };
}

function getStatusAccent(status: ArchNodeStatus, lensMode: ArchLensMode, node: ArchNode) {
  if (lensMode === 'heatmap') {
    if (status === 'planned') {
      return { color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.35)', badge: 'PLANNED' };
    }
    const heat = computeHeatScore(node);
    const h = getHeatColor(heat);
    return { color: h.stroke, glow: h.fill, badge: `${heat}° HEAT` };
  }

  switch (status) {
    case 'healthy':
      return { color: '#10B981', glow: 'rgba(16, 185, 129, 0.32)', badge: null };
    case 'bottleneck':
      return { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.42)', badge: 'BOTTLENECK' };
    case 'high-complexity':
      return { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.44)', badge: 'COMPLEXITY' };
    case 'planned':
      return { color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.45)', badge: '+ PLANNED' };
    case 'deprecated':
      return { color: '#64748B', glow: 'rgba(100, 116, 139, 0.25)', badge: 'LEGACY' };
  }
}

function renderKindGlyph(kind: ArchNodeKind, isPlanned: boolean, accentColor: string): React.ReactNode {
  const strokeDash = isPlanned ? '4 2.5' : undefined;
  const fillOpacity = isPlanned ? 0.32 : 1;

  switch (kind) {
    case 'client':
      // 2.5D Holographic Workstation Display + Base Deck
      return (
        <g opacity={fillOpacity}>
          {/* Keyboard/Touch Deck */}
          <polygon
            points="0,-10 26,3 0,16 -26,3"
            fill="#1E293B"
            stroke={accentColor}
            strokeWidth="1.2"
            strokeDasharray={strokeDash}
          />
          <polygon
            points="-26,3 0,16 0,21 -26,8"
            fill="#0F172A"
            stroke="#334155"
            strokeWidth="0.9"
          />
          <polygon
            points="26,3 0,16 0,21 26,8"
            fill="#162032"
            stroke="#334155"
            strokeWidth="0.9"
          />
          {/* Holographic Screen Stand */}
          <polygon
            points="-18,-8 14,-24 14,-48 -18,-32"
            fill="url(#grad-cyan-face)"
            stroke="#38BDF8"
            strokeWidth="1.4"
            strokeDasharray={strokeDash}
          />
          {/* Screen UI telemetry bars */}
          <line x1="-12" y1="-30" x2="8" y2="-40" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
          <line x1="-12" y1="-24" x2="2" y2="-31" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="-12" y1="-18" x2="6" y2="-27" stroke="#7DD3FC" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );

    case 'gateway':
      // 2.5D Hexagonal Twin-Tower Security Portal
      return (
        <g opacity={fillOpacity}>
          {/* Left Security Pillar */}
          <polygon points="-16,-4 -6,-9 -6,-36 -16,-31" fill="#1E3A5F" stroke="#38BDF8" strokeWidth="1.1" strokeDasharray={strokeDash} />
          <polygon points="-26,-9 -16,-4 -16,-31 -26,-36" fill="#0F233D" stroke="#38BDF8" strokeWidth="1.1" strokeDasharray={strokeDash} />
          <polygon points="-16,-41 -6,-36 -16,-31 -26,-36" fill="#38BDF8" fillOpacity="0.45" stroke="#7DD3FC" strokeWidth="1" />
          {/* Right Security Pillar */}
          <polygon points="16,4 26,-1 26,-28 16,-23" fill="#1E3A5F" stroke="#38BDF8" strokeWidth="1.1" strokeDasharray={strokeDash} />
          <polygon points="6,-1 16,4 16,-23 6,-28" fill="#0F233D" stroke="#38BDF8" strokeWidth="1.1" strokeDasharray={strokeDash} />
          <polygon points="16,-33 26,-28 16,-23 6,-28" fill="#38BDF8" fillOpacity="0.45" stroke="#7DD3FC" strokeWidth="1" />
          {/* Top Arch Bridge + Laser Gate */}
          <polygon points="-16,-41 16,-25 26,-30 -6,-46" fill="#1E293B" stroke="#7DD3FC" strokeWidth="1.2" strokeDasharray={strokeDash} />
          <line x1="-11" y1="-22" x2="11" y2="-11" stroke="#22D3EE" strokeWidth="2.2" strokeDasharray="3 2" />
          <line x1="-11" y1="-15" x2="11" y2="-4" stroke="#38BDF8" strokeWidth="1.6" />
        </g>
      );

    case 'service':
      // 2.5D Dual-Core Microservice Server Cube
      return (
        <g opacity={fillOpacity}>
          {/* Top Face */}
          <polygon
            points="0,-44 26,-31 0,-18 -26,-31"
            fill="url(#grad-indigo-top)"
            stroke="#818CF8"
            strokeWidth="1.2"
            strokeDasharray={strokeDash}
          />
          {/* Left Face */}
          <polygon
            points="-26,-31 0,-18 0,14 -26,1"
            fill="#1E1B4B"
            stroke="#6366F1"
            strokeWidth="1.1"
            strokeDasharray={strokeDash}
          />
          {/* Right Face */}
          <polygon
            points="26,-31 0,-18 0,14 26,1"
            fill="#312E81"
            stroke="#818CF8"
            strokeWidth="1.1"
            strokeDasharray={strokeDash}
          />
          {/* Top Circuit Matrix */}
          <polygon points="0,-38 14,-31 0,-24 -14,-31" fill="none" stroke="#A5B4FC" strokeWidth="1.1" />
          <circle cx="0" cy="-31" r="2.6" fill="#C7D2FE" />
          {/* Side Cooling & Status LEDs */}
          <line x1="-19" y1="-20" x2="-7" y2="-14" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="-19" y1="-13" x2="-7" y2="-7" stroke="#818CF8" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="-19" y1="-6" x2="-7" y2="0" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="13" cy="-12" r="2.2" fill={accentColor} />
          <circle cx="13" cy="-4" r="2.2" fill="#38BDF8" />
        </g>
      );

    case 'worker':
      // 2.5D Heavy Compute Pod with Energy Core
      return (
        <g opacity={fillOpacity}>
          <polygon points="0,-42 28,-28 0,-14 -28,-28" fill="#3B1D5E" stroke="#C084FC" strokeWidth="1.2" strokeDasharray={strokeDash} />
          <polygon points="-28,-28 0,-14 0,14 -28,0" fill="#1F1235" stroke="#A855F7" strokeWidth="1.1" strokeDasharray={strokeDash} />
          <polygon points="28,-28 0,-14 0,14 28,0" fill="#2E1650" stroke="#C084FC" strokeWidth="1.1" strokeDasharray={strokeDash} />
          {/* Power Turbine Core */}
          <ellipse cx="0" cy="-28" rx="11" ry="6" fill="#0F172A" stroke="#E879F9" strokeWidth="1.4" />
          <ellipse cx="0" cy="-28" rx="4.5" ry="2.5" fill="#F0ABFC" />
          {/* Heat Fins */}
          <line x1="8" y1="-12" x2="21" y2="-18.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="-5" x2="21" y2="-11.5" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="2" x2="21" y2="-4.5" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        </g>
      );

    case 'database':
      // 2.5D Stacked 3-Tier Cylindrical Database Array
      return (
        <g opacity={fillOpacity}>
          {[0, -11, -22].map((dy, idx) => (
            <g key={dy} transform={`translate(0, ${dy})`}>
              <path
                d="M -22 0 L -22 9 A 22 10 0 0 0 22 9 L 22 0 Z"
                fill={idx === 2 ? '#064E3B' : '#065F46'}
                stroke="#34D399"
                strokeWidth="1.1"
                strokeDasharray={strokeDash}
              />
              <ellipse
                cx="0"
                cy="0"
                rx="22"
                ry="10"
                fill="#0D9488"
                fillOpacity="0.85"
                stroke="#6EE7B7"
                strokeWidth="1.2"
                strokeDasharray={strokeDash}
              />
            </g>
          ))}
          <ellipse cx="0" cy="-22" rx="11" ry="4.5" fill="none" stroke="#A7F3D0" strokeWidth="1" />
          <circle cx="-11" cy="5" r="1.8" fill="#34D399" />
          <circle cx="-11" cy="-6" r="1.8" fill="#34D399" />
          <circle cx="-11" cy="-17" r="1.8" fill="#6EE7B7" />
        </g>
      );

    case 'cache':
      // 2.5D Superconducting Memory Lattice Slab
      return (
        <g opacity={fillOpacity}>
          <polygon points="0,-24 30,-9 0,6 -30,-9" fill="#0F292E" stroke="#2DD4BF" strokeWidth="1.3" strokeDasharray={strokeDash} />
          <polygon points="-30,-9 0,6 0,14 -30,-1" fill="#081C21" stroke="#14B8A6" strokeWidth="1.1" />
          <polygon points="30,-9 0,6 0,14 30,-1" fill="#11333A" stroke="#2DD4BF" strokeWidth="1.1" />
          {/* 4 Glowing Memory Chips */}
          <polygon points="0,-20 11,-14.5 0,-9 -11,-14.5" fill="#2DD4BF" fillOpacity="0.5" stroke="#99F6E4" strokeWidth="0.9" />
          <polygon points="-13,-13.5 -2,-8 -13,-2.5 -24,-8" fill="#38BDF8" fillOpacity="0.45" stroke="#7DD3FC" strokeWidth="0.9" />
          <polygon points="13,-13.5 24,-8 13,-2.5 2,-8" fill="#38BDF8" fillOpacity="0.45" stroke="#7DD3FC" strokeWidth="0.9" />
          <polygon points="0,-7 11,-1.5 0,4 -11,-1.5" fill="#2DD4BF" fillOpacity="0.55" stroke="#99F6E4" strokeWidth="0.9" />
        </g>
      );

    case 'queue':
      // 2.5D Streaming Message Pipeline Corridor
      return (
        <g opacity={fillOpacity}>
          <polygon points="-8,-34 26,-17 8,-8 -26,-25" fill="#1E293B" stroke="#FB923C" strokeWidth="1.2" strokeDasharray={strokeDash} />
          <polygon points="-26,-25 8,-8 8,8 -26,-9" fill="#0F172A" stroke="#F97316" strokeWidth="1.1" />
          <polygon points="26,-17 8,-8 8,8 26,-1" fill="#291A12" stroke="#FB923C" strokeWidth="1.1" />
          {/* Packet chevrons inside stream */}
          <polygon points="-14,-21 -6,-17 -14,-13" fill="#FDBA74" />
          <polygon points="-4,-16 4,-12 -4,-8" fill="#FB923C" />
          <polygon points="6,-11 14,-7 6,-3" fill="#F97316" />
          <line x1="-18" y1="-11" x2="2" y2="-1" stroke="#FDBA74" strokeWidth="1.8" strokeDasharray="3 3" />
        </g>
      );

    case 'storage':
      // 2.5D High-Density Object Vault Matrix
      return (
        <g opacity={fillOpacity}>
          <polygon points="0,-40 26,-27 0,-14 -26,-27" fill="#1E293B" stroke="#60A5FA" strokeWidth="1.2" strokeDasharray={strokeDash} />
          <polygon points="-26,-27 0,-14 0,14 -26,1" fill="#0F172A" stroke="#3B82F6" strokeWidth="1.1" />
          <polygon points="26,-27 0,-14 0,14 26,1" fill="#172554" stroke="#60A5FA" strokeWidth="1.1" />
          {/* Vault Drawer Bays */}
          <polygon points="-20,-17 -5,-9.5 -5,-2 -20,-9.5" fill="#1D4ED8" fillOpacity="0.45" stroke="#93C5FD" strokeWidth="0.8" />
          <polygon points="-20,-6 -5,1.5 -5,9 -20,1.5" fill="#1D4ED8" fillOpacity="0.45" stroke="#93C5FD" strokeWidth="0.8" />
          <polygon points="5,-9.5 20,-17 20,-9.5 5,-2" fill="#2563EB" fillOpacity="0.55" stroke="#BFDBFE" strokeWidth="0.8" />
          <polygon points="5,1.5 20,-6 20,1.5 5,9" fill="#2563EB" fillOpacity="0.55" stroke="#BFDBFE" strokeWidth="0.8" />
        </g>
      );

    case 'external-api':
      // 2.5D Satellite Transceiver & Orbital Ring
      return (
        <g opacity={fillOpacity}>
          <polygon points="0,-16 24,-4 0,8 -24,-4" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray={strokeDash} />
          <ellipse cx="0" cy="-24" rx="22" ry="9" fill="none" stroke="#38BDF8" strokeWidth="1.3" strokeDasharray="4 3" />
          <path d="M -14 -22 Q 0 -10 14 -22 L 0 -38 Z" fill="#0EA5E9" fillOpacity="0.35" stroke="#7DD3FC" strokeWidth="1.3" />
          <line x1="0" y1="-22" x2="0" y2="-45" stroke="#E0F2FE" strokeWidth="1.6" />
          <circle cx="0" cy="-46" r="3" fill="#38BDF8" />
        </g>
      );

    case 'ai-model':
      // 2.5D Floating Neural Octahedron Hypercube
      return (
        <g opacity={fillOpacity}>
          <ellipse cx="0" cy="-2" rx="22" ry="9.5" fill="none" stroke="#A855F7" strokeWidth="1.4" strokeDasharray="4 2" />
          <g className="archray-holo-float">
            <polygon points="0,-54 18,-32 0,-22" fill="#C084FC" fillOpacity="0.85" stroke="#F3E8FF" strokeWidth="1.1" />
            <polygon points="0,-54 -18,-32 0,-22" fill="#7E22CE" fillOpacity="0.9" stroke="#E9D5FF" strokeWidth="1.1" />
            <polygon points="-18,-32 0,-22 0,-10" fill="#581C87" fillOpacity="0.9" stroke="#D8B4FE" strokeWidth="1.1" />
            <polygon points="18,-32 0,-22 0,-10" fill="#9333EA" fillOpacity="0.85" stroke="#E9D5FF" strokeWidth="1.1" />
            <circle cx="0" cy="-32" r="3.5" fill="#FDF4FF" />
          </g>
        </g>
      );
  }
}

export const IsoNodes: React.FC<IsoNodesProps> = ({
  nodes,
  lensMode,
  selectedNodeId,
  hoveredNodeId,
  highlightedNodeIds,
  hasFocusFilter,
  onHoverNode,
  onSelectNode,
  onDrillDown,
}) => {
  // Depth sort back-to-front by Y coordinate for authentic 2.5D painter's occlusion
  const sortedNodes = [...nodes].sort((a, b) => a.y - b.y);

  return (
    <g className="archray-nodes-layer">
      <defs>
        <linearGradient id="grad-cyan-face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id="grad-indigo-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#312E81" stopOpacity="0.95" />
        </linearGradient>
        <filter id="archray-node-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {sortedNodes.map((pn) => {
        const { node, x, y } = pn;
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isHighlighted = !hasFocusFilter || highlightedNodeIds.has(node.id);
        const isPlanned = node.status === 'planned';
        const isAlert = node.status === 'bottleneck' || node.status === 'high-complexity';
        const hasChildren = Boolean(node.children && node.children.nodes.length > 0);

        const accent = getStatusAccent(node.status, lensMode, node);

        // Compute visual opacity for focus dimming and Evolution Diff lens
        let nodeOpacity = 1;
        if (hasFocusFilter && !isHighlighted) {
          nodeOpacity = 0.26;
        } else if (lensMode === 'diff' && !isPlanned && !isSelected && !isHovered && !hasFocusFilter) {
          nodeOpacity = 0.42;
        } else if (node.status === 'deprecated') {
          nodeOpacity = 0.6;
        }

        const primaryStack = node.techStack.slice(0, 2).join(' · ');

        return (
          <g
            key={node.id}
            transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}
            style={{
              opacity: nodeOpacity,
              transition: 'opacity 220ms ease, transform 220ms ease',
              cursor: 'pointer',
            }}
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                onDrillDown(node);
              }
            }}
          >
            {/* Living System Vitals: Pulse or Breathing Aura */}
            {(isAlert || (lensMode === 'heatmap' && computeHeatScore(node) >= 70)) && (
              <polygon
                points="0,-28 60,2 0,32 -60,2"
                fill="none"
                stroke={accent.color}
                strokeWidth="2"
                className="archray-pulse-ring"
              />
            )}

            {node.status === 'healthy' && lensMode !== 'diff' && (
              <polygon
                points="0,-24 54,3 0,30 -54,3"
                fill={accent.glow}
                className="archray-breathe"
              />
            )}

            {isPlanned && (
              <polygon
                points="0,-26 58,3 0,32 -58,3"
                fill="rgba(56, 189, 248, 0.16)"
                stroke="#38BDF8"
                strokeWidth="1.4"
                strokeDasharray="5 3"
                className="archray-breathe"
              />
            )}

            {/* Selection / Hover Ring */}
            {(isSelected || isHovered) && (
              <polygon
                points="0,-31 64,1 0,33 -64,1"
                fill="none"
                stroke={isSelected ? '#38BDF8' : '#E2E8F0'}
                strokeWidth={isSelected ? '2.2' : '1.4'}
                filter="url(#archray-node-glow)"
              />
            )}

            {/* 2.5D Isometric Pedestal Base */}
            <g>
              {/* Drop shadow */}
              <polygon points="0,-17 50,8 0,33 -50,8" fill="rgba(2, 6, 23, 0.72)" />
              {/* Pedestal Left Extrusion */}
              <polygon
                points="-46,4 0,27 0,33 -46,10"
                fill="#0F172A"
                stroke={accent.color}
                strokeOpacity="0.6"
                strokeWidth="0.9"
              />
              {/* Pedestal Right Extrusion */}
              <polygon
                points="46,4 0,27 0,33 46,10"
                fill="#1E293B"
                stroke={accent.color}
                strokeOpacity="0.6"
                strokeWidth="0.9"
              />
              {/* Pedestal Top Diamond */}
              <polygon
                points="0,-19 46,4 0,27 -46,4"
                fill={isPlanned ? 'rgba(14, 116, 144, 0.28)' : '#162033'}
                stroke={accent.color}
                strokeWidth={isSelected || isHovered ? '1.8' : '1.2'}
                strokeDasharray={isPlanned ? '4 3' : undefined}
              />
            </g>

            {/* 2.5D Volumetric Node Primitive */}
            <g transform={isHovered || isSelected ? 'translate(0, -3)' : undefined}>
              {renderKindGlyph(node.kind, isPlanned, accent.color)}
            </g>

            {/* Floating Info Card */}
            <g transform="translate(0, 38)">
              <rect
                x="-95"
                y="0"
                width="190"
                height={hasChildren ? 64 : 52}
                rx="10"
                fill="rgba(15, 23, 42, 0.90)"
                stroke={isSelected ? '#38BDF8' : isHovered ? '#94A3B8' : accent.color}
                strokeOpacity={isSelected ? 0.95 : isHovered ? 0.75 : 0.42}
                strokeWidth={isSelected ? 1.6 : 1}
              />

              {/* Kind Tag & Status / Heat Badge */}
              <text
                x="-84"
                y="16"
                fill="#94A3B8"
                fontSize="9"
                fontWeight="600"
                letterSpacing="0.06em"
              >
                {node.kind.toUpperCase()}
              </text>

              {accent.badge && (
                <g transform="translate(84, 6)">
                  <rect
                    x="-66"
                    y="0"
                    width="66"
                    height="14"
                    rx="7"
                    fill={accent.glow}
                    stroke={accent.color}
                    strokeOpacity="0.65"
                    strokeWidth="0.8"
                  />
                  <text
                    x="-33"
                    y="10"
                    textAnchor="middle"
                    fill={accent.color}
                    fontSize="8"
                    fontWeight="700"
                    letterSpacing="0.04em"
                  >
                    {accent.badge}
                  </text>
                </g>
              )}

              {/* Healthy indicator dot when no alert badge */}
              {!accent.badge && (
                <circle cx="81" cy="12" r="3.5" fill={accent.color} />
              )}

              {/* Node Primary Title */}
              <text
                x="-84"
                y="32"
                fill="#F8FAFC"
                fontSize="12"
                fontWeight="700"
              >
                {truncateText(node.label, 22)}
              </text>

              {/* Tech Stack Summary */}
              <text
                x="-84"
                y="45"
                fill="#94A3B8"
                fontSize="9.5"
                fontWeight="500"
              >
                {truncateText(primaryStack || node.subtitle || '', 27)}
              </text>

              {/* C4 Drilldown Pill */}
              {hasChildren && (
                <g transform="translate(-84, 51)">
                  <text fill="#38BDF8" fontSize="9" fontWeight="600" y="7">
                    ◈ Double-click: C4 Subgraph ({node.children?.nodes.length})
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
};
