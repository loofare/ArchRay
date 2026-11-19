import { createElement } from 'react';

/**
 * Pure TypeScript offline ISO/IEC 18004 QR code encoder (Error Correction Level L, Versions 1–4).
 * Zero dependencies; used both in the Share modal SVG preview and Share Poster canvas renderer.
 */

interface QrVersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  ecCodewords: number;
  alignCenters: number[];
}

// Version 1..4 Level L single-block specifications from ISO/IEC 18004.
const SPECS: QrVersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, ecCodewords: 7, alignCenters: [] },
  { version: 2, size: 25, totalCodewords: 44, ecCodewords: 10, alignCenters: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, ecCodewords: 15, alignCenters: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, ecCodewords: 20, alignCenters: [6, 26] },
];

function rsComputeEc(data: number[], ecLen: number): number[] {
  const gfMul = (a: number, b: number) => {
    let r = 0;
    for (let i = 7; i >= 0; i--) {
      r = ((r << 1) ^ ((r >> 7) * 0x11d)) & 0xff;
      if ((b >> i) & 1) r ^= a;
    }
    return r;
  };
  let gen = [1];
  let root = 1;
  for (let i = 0; i < ecLen; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j]! ^= gen[j]!;
      next[j + 1]! ^= gfMul(gen[j]!, root);
    }
    gen = next;
    root = gfMul(root, 2);
  }
  const rem = new Array<number>(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem.shift()!;
    rem.push(0);
    for (let j = 0; j < ecLen; j++) rem[j]! ^= gfMul(gen[j + 1]!, factor);
  }
  return rem;
}

function formatBits(mask: number): number {
  // EC Level L = 0b01; 5-bit header = (01 << 3) | mask.
  const data = (1 << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function penaltyScore(mod: boolean[][]): number {
  const n = mod.length;
  let score = 0;
  // Rule 1: runs of 5+ same color in rows and columns
  const checkRuns = (rowWise: boolean) => {
    for (let r = 0; r < n; r++) {
      let runColor = false;
      let runLen = 0;
      for (let c = 0; c < n; c++) {
        const val = rowWise ? mod[r]![c]! : mod[c]![r]!;
        if (val === runColor) {
          runLen++;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = val;
          runLen = 1;
        }
      }
    }
  };
  checkRuns(true);
  checkRuns(false);
  // Rule 2: 2x2 solid blocks
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = mod[r]![c]!;
      if (mod[r]![c + 1] === v && mod[r + 1]![c] === v && mod[r + 1]![c + 1] === v) score += 3;
    }
  }
  // Rule 3: finder-like 1:1:3:1:1 patterns
  const matchFinderPat = (line: boolean[]) => {
    for (let i = 0; i <= line.length - 7; i++) {
      if (line[i] && !line[i + 1] && line[i + 2] && line[i + 3] && line[i + 4] && !line[i + 5] && line[i + 6]) {
        const leftLight = i >= 4 && !line[i - 1] && !line[i - 2] && !line[i - 3] && !line[i - 4];
        const rightLight = i + 10 < line.length && !line[i + 7] && !line[i + 8] && !line[i + 9] && !line[i + 10];
        if (leftLight || rightLight) score += 40;
      }
    }
  };
  for (let i = 0; i < n; i++) {
    matchFinderPat(mod[i]!);
    matchFinderPat(mod.map((row) => row[i]!));
  }
  // Rule 4: dark module ratio deviation from 50%
  let dark = 0;
  for (const row of mod) for (const cell of row) if (cell) dark++;
  const total = n * n;
  const k = Math.floor(Math.abs(dark * 20 - total * 10) / total);
  score += k * 10;
  return score;
}

export function encodeQr(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  const spec = SPECS.find((s) => (s.totalCodewords - s.ecCodewords) - 2 >= bytes.length) ?? SPECS[SPECS.length - 1]!;
  const dataCap = spec.totalCodewords - spec.ecCodewords;

  const bits: number[] = [];
  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  // Mode indicator 0100 (Byte), 8-bit count for V1..9
  pushBits(0b0100, 4);
  pushBits(Math.min(bytes.length, dataCap - 2), 8);
  for (let i = 0; i < Math.min(bytes.length, dataCap - 2); i++) pushBits(bytes[i]!, 8);
  const maxBits = dataCap * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
    dataCodewords.push(b);
  }
  for (let pad = 0; dataCodewords.length < dataCap; pad++) dataCodewords.push(pad % 2 === 0 ? 0xec : 0x11);

  const codewords = [...dataCodewords, ...rsComputeEc(dataCodewords, spec.ecCodewords)];
  const n = spec.size;
  const mod = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const isFunc = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const setFunc = (r: number, c: number, dark: boolean) => {
    isFunc[r]![c] = true;
    mod[r]![c] = dark;
  };

  // 1. Finder patterns + separators
  for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || c < 0 || r >= n || c >= n) continue;
        const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        const dark = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && dist !== 2;
        setFunc(r, c, dark);
      }
    }
  }

  // 2. Alignment patterns
  const cen = spec.alignCenters;
  for (let i = 0; i < cen.length; i++) {
    for (let j = 0; j < cen.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === cen.length - 1) || (i === cen.length - 1 && j === 0)) continue;
      const r0 = cen[i]!, c0 = cen[j]!;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunc(r0 + dr, c0 + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // 3. Timing patterns & dark module
  for (let i = 8; i <= n - 9; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }
  setFunc(n - 8, 8, true);

  // 4. Reserve format information cells before data placement
  for (let i = 0; i <= 5; i++) { setFunc(i, 8, false); setFunc(8, i, false); }
  setFunc(7, 8, false); setFunc(8, 7, false); setFunc(8, 8, false);
  for (let i = 0; i < 8; i++) setFunc(8, n - 1 - i, false);
  for (let i = 0; i < 7; i++) setFunc(n - 1 - i, 8, false);

  // 5. Place data + EC bits in standard zig-zag order
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? n - 1 - vert : vert;
        if (!isFunc[r]![c] && bitIdx < totalBits) {
          const byte = codewords[bitIdx >> 3]!;
          mod[r]![c] = ((byte >> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
        }
      }
    }
  }

  // 6. Pick optimal ISO mask pattern 0..7
  const maskPred = (m: number, r: number, c: number) => {
    switch (m) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  };
  const applyFormat = (grid: boolean[][], m: number) => {
    const fmt = formatBits(m);
    const bit = (i: number) => ((fmt >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) grid[i]![8] = bit(i);
    grid[7]![8] = bit(6);
    grid[8]![8] = bit(7);
    grid[8]![7] = bit(8);
    for (let i = 9; i < 15; i++) grid[8]![14 - i] = bit(i);
    for (let i = 0; i < 8; i++) grid[8]![n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) grid[n - 15 + i]![8] = bit(i);
  };

  let bestGrid = mod;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const candidate = mod.map((row, r) => row.map((v, c) => (isFunc[r]![c] ? v : v !== maskPred(m, r, c))));
    applyFormat(candidate, m);
    const s = penaltyScore(candidate);
    if (s < bestScore) { bestScore = s; bestGrid = candidate; }
  }
  return bestGrid;
}

export function drawQrCanvas(
  ctx: CanvasRenderingContext2D,
  matrix: boolean[][],
  x: number,
  y: number,
  size: number,
  fg = '#0F172A',
  bg = '#FFFFFF',
) {
  const n = matrix.length;
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.save();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, Math.min(10, size * 0.12));
  ctx.fill();
  ctx.fillStyle = fg;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r]![c]) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell * 100) / 100, Math.ceil(cell * 100) / 100);
      }
    }
  }
  ctx.restore();
}

export function QrSvg({ value, size = 76, fg = '#0F172A', bg = '#FFFFFF' }: {
  value: string; size?: number; fg?: string; bg?: string;
}) {
  const matrix = encodeQr(value);
  const n = matrix.length;
  const quiet = 2;
  const vb = n + quiet * 2;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r]![c]) parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
    }
  }
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: `0 0 ${vb} ${vb}`,
      role: 'img',
      'aria-label': `QR code for ${value}`,
      style: { borderRadius: 8, display: 'block', flexShrink: 0 },
    },
    createElement('rect', { x: 0, y: 0, width: vb, height: vb, rx: 2, fill: bg }),
    createElement('path', { d: parts.join(''), fill: fg }),
  );
}
