export interface Theme {
  id: 'midnight' | 'paper' | 'blueprint' | 'glass';
  grid?: 'dots' | 'lines' | 'glow';
  bg: string;
  bgDot: string;
  panel: string;
  panelBorder: string;
  text: string;
  sub: string;
  faint: string;
  nodeTop: string;
  nodeSide: string;
  nodeStroke: string;
  groupFill: string;
  groupStroke: string;
  edge: string;
  edgeDim: string;
  accent: string;
  bandAlpha: number;
  bandSideAlpha: number;
  shadow: string;
  good: string;
  warn: string;
  critical: string;
  unknown: string;
  planned: string;
}

export const THEMES: Record<Theme['id'], Theme> = {
  midnight: {
    id: 'midnight',
    grid: 'dots',
    bg: '#090D16',
    bgDot: '#1A2233',
    panel: 'rgba(13,18,30,0.86)',
    panelBorder: 'rgba(148,163,184,0.16)',
    text: '#E9EEF7',
    sub: '#8D9AB2',
    faint: '#55627A',
    nodeTop: '#131A2A',
    nodeSide: '#0A101B',
    nodeStroke: '#28344C',
    groupFill: 'rgba(129,140,248,0.05)',
    groupStroke: 'rgba(129,140,248,0.45)',
    edge: '#4A5A78',
    edgeDim: 'rgba(74,90,120,0.18)',
    accent: '#38BDF8',
    bandAlpha: 0.07,
    bandSideAlpha: 0.22,
    shadow: 'rgba(0,0,0,0.55)',
    good: '#34D399',
    warn: '#FBBF24',
    critical: '#F87171',
    unknown: '#64748B',
    planned: '#22D3EE',
  },
  paper: {
    id: 'paper',
    grid: 'dots',
    bg: '#F4F6FA',
    bgDot: '#DCE1EA',
    panel: 'rgba(255,255,255,0.92)',
    panelBorder: 'rgba(15,23,42,0.10)',
    text: '#0F172A',
    sub: '#5B6478',
    faint: '#94A0B4',
    nodeTop: '#FFFFFF',
    nodeSide: '#D5DBE6',
    nodeStroke: '#CBD3E0',
    groupFill: 'rgba(99,102,241,0.05)',
    groupStroke: 'rgba(99,102,241,0.45)',
    edge: '#97A3B8',
    edgeDim: 'rgba(151,163,184,0.25)',
    accent: '#0284C7',
    bandAlpha: 0.09,
    bandSideAlpha: 0.30,
    shadow: 'rgba(15,23,42,0.12)',
    good: '#059669',
    warn: '#D97706',
    critical: '#DC2626',
    unknown: '#94A3B8',
    planned: '#0891B2',
  },
  blueprint: {
    id: 'blueprint',
    grid: 'lines',
    bg: '#081A33',
    bgDot: 'rgba(125,211,252,0.16)',
    panel: 'rgba(10,31,58,0.92)',
    panelBorder: 'rgba(125,211,252,0.24)',
    text: '#E0F2FE',
    sub: '#93C5FD',
    faint: '#5B7FA6',
    nodeTop: '#0D294A',
    nodeSide: '#07182C',
    nodeStroke: '#2F6FA8',
    groupFill: 'rgba(56,189,248,0.06)',
    groupStroke: 'rgba(56,189,248,0.5)',
    edge: '#7DD3FC',
    edgeDim: 'rgba(125,211,252,0.20)',
    accent: '#38BDF8',
    bandAlpha: 0.08,
    bandSideAlpha: 0.24,
    shadow: 'rgba(0,10,25,0.45)',
    good: '#34D399',
    warn: '#FBBF24',
    critical: '#F87171',
    unknown: '#64748B',
    planned: '#22D3EE',
  },
  glass: {
    id: 'glass',
    grid: 'glow',
    bg: '#EEF3FB',
    bgDot: 'rgba(148,163,184,0.22)',
    panel: 'rgba(255,255,255,0.72)',
    panelBorder: 'rgba(15,23,42,0.08)',
    text: '#0B1220',
    sub: '#475569',
    faint: '#94A3B8',
    nodeTop: 'rgba(255,255,255,0.88)',
    nodeSide: 'rgba(203,213,225,0.85)',
    nodeStroke: 'rgba(100,116,139,0.28)',
    groupFill: 'rgba(79,70,229,0.05)',
    groupStroke: 'rgba(79,70,229,0.38)',
    edge: '#94A3B8',
    edgeDim: 'rgba(148,163,184,0.22)',
    accent: '#4F46E5',
    bandAlpha: 0.06,
    bandSideAlpha: 0.20,
    shadow: 'rgba(15,23,42,0.08)',
    good: '#059669',
    warn: '#D97706',
    critical: '#DC2626',
    unknown: '#94A3B8',
    planned: '#0891B2',
  },
};

export const LAYER_FALLBACK = ['#38BDF8', '#818CF8', '#C084FC', '#34D399', '#F59E0B', '#F472B6'];

export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
