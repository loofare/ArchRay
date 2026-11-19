export interface Theme {
  id: 'midnight' | 'paper' | 'blueprint' | 'glass';
  isDark: boolean;
  grid?: 'dots' | 'lines' | 'glow';
  bg: string;
  bgDot: string;
  glow1: string;
  glow2: string;
  glow3: string;
  panel: string;
  hudBg: string;
  hudStrong: string;
  panelBorder: string;
  specular: string;
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
    isDark: true,
    grid: 'glow',
    bg: '#0D1020',
    bgDot: 'rgba(203,213,225,0.10)',
    glow1: 'rgba(96,165,250,0.19)',
    glow2: 'rgba(168,85,247,0.17)',
    glow3: 'rgba(45,212,191,0.12)',
    panel: 'rgba(20,25,46,0.78)',
    hudBg: 'rgba(18,24,48,0.72)',
    hudStrong: 'rgba(22,28,52,0.88)',
    panelBorder: 'rgba(255,255,255,0.17)',
    specular: 'rgba(255,255,255,0.34)',
    text: '#F1F5F9',
    sub: '#CBD5E1',
    faint: '#7D8DA6',
    nodeTop: 'rgba(30,38,68,0.78)',
    nodeSide: 'rgba(14,19,38,0.86)',
    nodeStroke: 'rgba(255,255,255,0.18)',
    groupFill: 'rgba(168,85,247,0.055)',
    groupStroke: 'rgba(192,132,252,0.44)',
    edge: '#64748B',
    edgeDim: 'rgba(148,163,184,0.16)',
    accent: '#60A5FA',
    bandAlpha: 0.055,
    bandSideAlpha: 0.22,
    shadow: 'rgba(3,6,20,0.65)',
    good: '#34D399',
    warn: '#FBBF24',
    critical: '#F87171',
    unknown: '#64748B',
    planned: '#C084FC',
  },
  paper: {
    id: 'paper',
    isDark: false,
    grid: 'dots',
    bg: '#F4F6FA',
    bgDot: 'rgba(15,23,42,0.12)',
    glow1: 'rgba(56,189,248,0.13)',
    glow2: 'rgba(139,92,246,0.10)',
    glow3: 'rgba(16,185,129,0.09)',
    panel: 'rgba(255,255,255,0.82)',
    hudBg: 'rgba(255,255,255,0.78)',
    hudStrong: 'rgba(255,255,255,0.95)',
    panelBorder: 'rgba(15,23,42,0.10)',
    specular: 'rgba(255,255,255,0.96)',
    text: '#0F172A',
    sub: '#475569',
    faint: '#64748B',
    nodeTop: 'rgba(255,255,255,0.94)',
    nodeSide: '#DCE3F0',
    nodeStroke: 'rgba(15,23,42,0.12)',
    groupFill: 'rgba(99,102,241,0.045)',
    groupStroke: 'rgba(99,102,241,0.40)',
    edge: '#94A3B8',
    edgeDim: 'rgba(148,163,184,0.20)',
    accent: '#0284C7',
    bandAlpha: 0.06,
    bandSideAlpha: 0.20,
    shadow: 'rgba(15,23,42,0.14)',
    good: '#059669',
    warn: '#D97706',
    critical: '#DC2626',
    unknown: '#94A3B8',
    planned: '#7C3AED',
  },
  blueprint: {
    id: 'blueprint',
    isDark: true,
    grid: 'lines',
    bg: '#081A33',
    bgDot: 'rgba(125,211,252,0.16)',
    glow1: 'rgba(56,189,248,0.16)',
    glow2: 'rgba(37,99,235,0.14)',
    glow3: 'rgba(34,211,238,0.10)',
    panel: 'rgba(10,31,58,0.84)',
    hudBg: 'rgba(10,30,58,0.74)',
    hudStrong: 'rgba(11,34,66,0.90)',
    panelBorder: 'rgba(125,211,252,0.24)',
    specular: 'rgba(186,230,253,0.42)',
    text: '#E0F2FE',
    sub: '#93C5FD',
    faint: '#608BB8',
    nodeTop: 'rgba(14,42,76,0.84)',
    nodeSide: 'rgba(7,25,48,0.90)',
    nodeStroke: 'rgba(125,211,252,0.28)',
    groupFill: 'rgba(56,189,248,0.055)',
    groupStroke: 'rgba(56,189,248,0.46)',
    edge: '#4B83B4',
    edgeDim: 'rgba(125,211,252,0.16)',
    accent: '#38BDF8',
    bandAlpha: 0.055,
    bandSideAlpha: 0.22,
    shadow: 'rgba(0,10,25,0.52)',
    good: '#34D399',
    warn: '#FBBF24',
    critical: '#F87171',
    unknown: '#64748B',
    planned: '#22D3EE',
  },
  glass: {
    id: 'glass',
    isDark: false,
    grid: 'glow',
    bg: '#EEF3FB',
    bgDot: 'rgba(148,163,184,0.22)',
    glow1: 'rgba(96,165,250,0.17)',
    glow2: 'rgba(168,85,247,0.13)',
    glow3: 'rgba(45,212,191,0.11)',
    panel: 'rgba(255,255,255,0.78)',
    hudBg: 'rgba(255,255,255,0.68)',
    hudStrong: 'rgba(255,255,255,0.92)',
    panelBorder: 'rgba(15,23,42,0.10)',
    specular: 'rgba(255,255,255,0.98)',
    text: '#0B1220',
    sub: '#475569',
    faint: '#64748B',
    nodeTop: 'rgba(255,255,255,0.92)',
    nodeSide: 'rgba(203,213,225,0.82)',
    nodeStroke: 'rgba(15,23,42,0.11)',
    groupFill: 'rgba(99,102,241,0.045)',
    groupStroke: 'rgba(99,102,241,0.38)',
    edge: '#94A3B8',
    edgeDim: 'rgba(148,163,184,0.20)',
    accent: '#4F46E5',
    bandAlpha: 0.055,
    bandSideAlpha: 0.18,
    shadow: 'rgba(15,23,42,0.10)',
    good: '#059669',
    warn: '#D97706',
    critical: '#DC2626',
    unknown: '#94A3B8',
    planned: '#0891B2',
  },
};

export const LAYER_FALLBACK = ['#60A5FA', '#818CF8', '#34D399', '#F59E0B', '#EC4899', '#94A3B8', '#2DD4BF'];

export function alpha(hex: string, a: number): string {
  if (!hex.startsWith('#')) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
