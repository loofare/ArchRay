export interface Theme {
  id: 'midnight' | 'paper';
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
};

export const LAYER_FALLBACK = ['#38BDF8', '#818CF8', '#C084FC', '#34D399', '#F59E0B', '#F472B6'];

export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
