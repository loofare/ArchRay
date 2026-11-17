export type ArchNodeKind =
  | 'client'
  | 'gateway'
  | 'service'
  | 'worker'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'external-api'
  | 'ai-model';

export type ArchNodeStatus =
  | 'healthy'
  | 'bottleneck'
  | 'high-complexity'
  | 'planned'
  | 'deprecated';

export type ArchEdgeProtocol =
  | 'http'
  | 'grpc'
  | 'ws'
  | 'amqp'
  | 'sql'
  | 'redis'
  | 'ipc'
  | 'llm-stream';

export type ArchEdgeStatus = 'active' | 'bottleneck' | 'planned';
export type ArchEdgeBandwidth = 'low' | 'medium' | 'high';
export type ArchFlowCategory = 'core' | 'async' | 'evolution';
export type ArchLensMode = 'topology' | 'heatmap' | 'diff';

export interface ArchLayer {
  id: string;
  label: string;
  order: number;
  color?: string;
  description?: string;
}

export interface ArchNodeMetrics {
  complexity?: number;
  coupling?: number;
  loc?: number;
  latencyMs?: string;
  throughput?: string;
}

export interface ArchNodeContracts {
  exposes?: string[];
  consumes?: string[];
}

export interface ArchNodeChildren {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export interface ArchNode {
  id: string;
  label: string;
  subtitle?: string;
  layerId: string;
  kind: ArchNodeKind;
  status: ArchNodeStatus;
  description: string;
  techStack: string[];
  sourcePaths: string[];
  metrics?: ArchNodeMetrics;
  contracts?: ArchNodeContracts;
  refactorNotes?: string;
  children?: ArchNodeChildren;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: ArchEdgeProtocol;
  status?: ArchEdgeStatus;
  bandwidth?: ArchEdgeBandwidth;
}

export interface ArchFlowStep {
  step: number;
  from: string;
  to: string;
  edgeId?: string;
  action: string;
  payload: string;
  latencyMs?: number;
}

export interface ArchFlow {
  id: string;
  name: string;
  description: string;
  category?: ArchFlowCategory;
  steps: ArchFlowStep[];
}

export interface ArchGraphStats {
  totalFiles?: number;
  totalLoc?: number;
  healthScore?: number;
}

export interface ArchGraphMeta {
  name: string;
  description: string;
  generatedAt: string;
  repoRoot?: string;
  stats?: ArchGraphStats;
}

export interface ArchRayGraph {
  version: '1.0';
  meta: ArchGraphMeta;
  layers: ArchLayer[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  flows: ArchFlow[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface PositionedNode {
  node: ArchNode;
  x: number;
  y: number;
  isoU: number;
  isoV: number;
  layerOrder: number;
  width: number;
  height: number;
}

export interface PositionedEdge {
  edge: ArchEdge;
  points: Point2D[];
  pathD: string;
  midpoint: Point2D;
}

export interface PositionedLayerPlane {
  layer: ArchLayer;
  polygonPoints: [Point2D, Point2D, Point2D, Point2D];
  labelAnchor: Point2D;
  accentColor: string;
}

export interface IsoLayoutResult {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  layers: PositionedLayerPlane[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

declare global {
  interface Window {
    __ARCHRAY_DATA__?: ArchRayGraph;
  }
}
