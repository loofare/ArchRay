import React, { useEffect, useMemo, useState } from 'react';
import demoSystemJson from '../../examples/demo-system.json';
import { Canvas25D } from './components/Canvas25D';
import { FlowEdges } from './components/FlowEdges';
import { FlowPlayer } from './components/FlowPlayer';
import { Inspector } from './components/Inspector';
import { IsoNodes } from './components/IsoNodes';
import { LensBar } from './components/LensBar';
import { computeIsoLayout } from './layout/isoLayout';
import type {
  ArchEdge,
  ArchFlow,
  ArchLayer,
  ArchLensMode,
  ArchNode,
  ArchRayGraph,
  IsoLayoutResult,
} from './types/archray';

const DEFAULT_GRAPH = demoSystemJson as ArchRayGraph;

function getInitialGraph(): ArchRayGraph {
  if (typeof window !== 'undefined' && window.__ARCHRAY_DATA__) {
    return window.__ARCHRAY_DATA__;
  }
  return DEFAULT_GRAPH;
}

export const App: React.FC = () => {
  const [baseGraph] = useState<ArchRayGraph>(getInitialGraph);
  const [customGraph, setCustomGraph] = useState<ArchRayGraph | null>(null);
  const graph = customGraph ?? baseGraph;

  const [lensMode, setLensMode] = useState<ArchLensMode>('topology');
  const [drillStack, setDrillStack] = useState<ArchNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [layout, setLayout] = useState<IsoLayoutResult>({
    nodes: [],
    edges: [],
    layers: [],
    bounds: { minX: -400, minY: -300, maxX: 400, maxY: 300, width: 800, height: 600 },
  });

  // Resolve active C4 depth view
  const currentDrillParent = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;
  const activeNodes: ArchNode[] = useMemo(() => {
    if (currentDrillParent?.children) {
      return currentDrillParent.children.nodes;
    }
    return graph.nodes;
  }, [currentDrillParent, graph.nodes]);

  const activeEdges: ArchEdge[] = useMemo(() => {
    if (currentDrillParent?.children) {
      return currentDrillParent.children.edges;
    }
    return graph.edges;
  }, [currentDrillParent, graph.edges]);

  const activeLayers: ArchLayer[] = useMemo(() => {
    const existingIds = new Set(graph.layers.map((l) => l.id));
    const extraLayers: ArchLayer[] = [];
    activeNodes.forEach((n) => {
      if (!existingIds.has(n.layerId)) {
        existingIds.add(n.layerId);
        extraLayers.push({
          id: n.layerId,
          label: n.layerId,
          order: graph.layers.length + extraLayers.length,
        });
      }
    });
    return [...graph.layers, ...extraLayers];
  }, [graph.layers, activeNodes]);

  const activeFlows: ArchFlow[] = useMemo(() => {
    if (drillStack.length > 0) return [];
    return graph.flows ?? [];
  }, [drillStack.length, graph.flows]);

  const activeFlow = useMemo(
    () => activeFlows.find((f) => f.id === activeFlowId) ?? null,
    [activeFlows, activeFlowId]
  );

  const viewKey = `${graph.meta.name}:${drillStack.map((d) => d.id).join('/') || 'root'}`;

  useEffect(() => {
    let cancelled = false;
    computeIsoLayout(activeLayers, activeNodes, activeEdges).then((res) => {
      if (!cancelled) {
        setLayout(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeLayers, activeNodes, activeEdges]);

  // Auto-advance flow playback
  useEffect(() => {
    if (!isPlaying || !activeFlow || activeFlow.steps.length === 0) return;
    const timer = window.setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % activeFlow.steps.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeFlow]);

  // Compute highlighted nodes on hover or active flow
  const { highlightedNodeIds, hasFocusFilter } = useMemo(() => {
    const ids = new Set<string>();
    if (activeFlow) {
      activeFlow.steps.forEach((st) => {
        ids.add(st.from);
        ids.add(st.to);
      });
      return { highlightedNodeIds: ids, hasFocusFilter: true };
    }
    if (hoveredNodeId) {
      ids.add(hoveredNodeId);
      activeEdges.forEach((e) => {
        if (e.source === hoveredNodeId) ids.add(e.target);
        if (e.target === hoveredNodeId) ids.add(e.source);
      });
      return { highlightedNodeIds: ids, hasFocusFilter: true };
    }
    return { highlightedNodeIds: ids, hasFocusFilter: false };
  }, [activeFlow, hoveredNodeId, activeEdges]);

  const selectedNode = useMemo(
    () => activeNodes.find((n) => n.id === selectedNodeId) ?? null,
    [activeNodes, selectedNodeId]
  );

  const handleSelectFlow = (flowId: string | null) => {
    setActiveFlowId(flowId);
    setActiveStepIndex(0);
    setIsPlaying(flowId !== null);
  };

  const handleDrillDown = (node: ArchNode) => {
    if (!node.children || node.children.nodes.length === 0) return;
    setDrillStack((prev) => [...prev, node]);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setActiveFlowId(null);
    setIsPlaying(false);
  };

  const handleNavigateBreadcrumb = (depthIndex: number) => {
    if (depthIndex < 0) {
      setDrillStack([]);
    } else {
      setDrillStack((prev) => prev.slice(0, depthIndex + 1));
    }
    setSelectedNodeId(null);
    setHoveredNodeId(null);
  };

  const handleLoadCustomGraph = (nextGraph: ArchRayGraph) => {
    setCustomGraph(nextGraph);
    setDrillStack([]);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setActiveFlowId(null);
    setIsPlaying(false);
  };

  const handleResetDefaultGraph = () => {
    setCustomGraph(null);
    setDrillStack([]);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setActiveFlowId(null);
    setIsPlaying(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-100">
      <LensBar
        graph={graph}
        lensMode={lensMode}
        onChangeLens={setLensMode}
        onLoadCustomGraph={handleLoadCustomGraph}
        onResetDefaultGraph={handleResetDefaultGraph}
        isCustomLoaded={customGraph !== null}
      />

      <Canvas25D
        layout={layout}
        viewKey={viewKey}
        drillStack={drillStack}
        onNavigateBreadcrumb={handleNavigateBreadcrumb}
        onClearSelection={() => setSelectedNodeId(null)}
      >
        <FlowEdges
          edges={layout.edges}
          lensMode={lensMode}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
          activeFlow={activeFlow}
          activeStepIndex={activeStepIndex}
          hasFocusFilter={hasFocusFilter}
        />
        <IsoNodes
          nodes={layout.nodes}
          lensMode={lensMode}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          highlightedNodeIds={highlightedNodeIds}
          hasFocusFilter={hasFocusFilter}
          onHoverNode={setHoveredNodeId}
          onSelectNode={(node) => setSelectedNodeId(node.id)}
          onDrillDown={handleDrillDown}
        />
      </Canvas25D>

      <Inspector
        node={selectedNode}
        layers={activeLayers}
        allNodes={activeNodes}
        edges={activeEdges}
        onClose={() => setSelectedNodeId(null)}
        onFocusNode={(nodeId) => setSelectedNodeId(nodeId)}
        onDrillDown={handleDrillDown}
      />

      <FlowPlayer
        flows={activeFlows}
        nodes={activeNodes}
        activeFlowId={activeFlowId}
        activeStepIndex={activeStepIndex}
        isPlaying={isPlaying}
        onSelectFlow={handleSelectFlow}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onStepChange={(idx) => {
          setActiveStepIndex(idx);
          setIsPlaying(false);
        }}
      />
    </div>
  );
};

export default App;
