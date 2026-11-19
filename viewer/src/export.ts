import type { Theme } from './theme';
import { drawQrCanvas, encodeQr } from './qr';

export const ARCHRAY_REPO_URL = 'https://github.com/loofare/ArchRay';

interface Box { x: number; y: number; width: number; height: number }

export interface SharePosterMeta {
  title: string;
  stats: string;
  score: number;
  builtWith: string;
}

function paintBackdrop(ctx: CanvasRenderingContext2D, th: Theme, w: number, h: number) {
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  for (const [cx, cy, r, color] of [
    [w * 0.24, h * 0.16, w * 0.45, th.glow1],
    [w * 0.78, h * 0.78, w * 0.42, th.glow2],
    [w * 0.62, h * 0.28, w * 0.35, th.glow3],
  ] as const) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

async function renderSceneCanvas(
  th: Theme,
  opts: { full?: boolean; scale?: number } = {},
): Promise<HTMLCanvasElement> {
  const { full = false, scale = 2 } = opts;
  await document.fonts.ready;

  const stage = document.getElementById('archray-scene') as
    | (Element & { __archrayExport3D?: (o: { full?: boolean; scale?: number }) => Promise<HTMLCanvasElement> })
    | null;
  if (!stage) throw Error('Scene is not ready; retry after layout');

  if (stage.__archrayExport3D) {
    return stage.__archrayExport3D({ full, scale });
  }

  if (!(stage instanceof SVGSVGElement)) throw Error('Scene is not ready; retry after layout');

  const svg = stage;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.ar-particle, .ar-current').forEach((el) => el.remove());

  let box: Box;
  if (full) {
    const attr = svg.dataset.contentBox?.split(/\s+/).map(Number);
    if (attr && attr.length === 4 && attr.every(Number.isFinite)) {
      box = { x: attr[0]!, y: attr[1]!, width: attr[2]!, height: attr[3]! };
    } else {
      const b = svg.getBBox();
      const pad = 40;
      box = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
    }
  } else {
    const vb = svg.viewBox.baseVal;
    box = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  }
  const factor = Math.min(scale, 6400 / Math.max(box.width, box.height, 1));

  clone.setAttribute('width', String(box.width));
  clone.setAttribute('height', String(box.height));
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const rootCs = getComputedStyle(document.documentElement);
  const font = rootCs.getPropertyValue('--ar-font').trim();
  const mono = rootCs.getPropertyValue('--ar-mono').trim();
  if (font) clone.style.fontFamily = font;
  if (mono) clone.style.setProperty('--ar-mono', mono);

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(Error('Image decode failed; retry PNG export'));
      img.src = url;
    });
    const outW = Math.max(1, Math.round(box.width * factor));
    const outH = Math.max(1, Math.round(box.height * factor));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    paintBackdrop(ctx, th, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rasterise the active scene (2D SVG or 3D Canvas stage) as PNG.
 * `full` ignores the current camera/selection clip and exports the entire graph layout.
 */
export async function exportPng(th: Theme, filename: string, opts: { full?: boolean; scale?: number } = {}) {
  const canvas = await renderSceneCanvas(th, opts);
  downloadCanvas(canvas, filename);
}

/**
 * Render an editorial share poster combining the unclipped diagram with project summary
 * metrics and a scannable QR attribution footer pointing to the ArchRay open-source repo.
 */
export async function renderSharePosterCanvas(th: Theme, meta: SharePosterMeta): Promise<HTMLCanvasElement> {
  const sceneCanvas = await renderSceneCanvas(th, { full: true, scale: 2 });
  const pad = 48;
  const headerH = 88;
  const footerH = 114;
  const gapY = 20;

  const posterW = Math.max(1360, Math.min(2160, Math.round(sceneCanvas.width * 0.78)));
  const frameW = posterW - pad * 2;
  const aspect = sceneCanvas.height / Math.max(1, sceneCanvas.width);
  const frameH = Math.max(640, Math.min(1680, Math.round(frameW * aspect)));
  const posterH = pad + headerH + gapY + frameH + gapY + footerH + pad;

  const out = document.createElement('canvas');
  out.width = posterW;
  out.height = posterH;
  const ctx = out.getContext('2d')!;
  paintBackdrop(ctx, th, posterW, posterH);

  // Header strip
  const logoSz = 48;
  const gradLogo = ctx.createLinearGradient(pad, pad + 8, pad + logoSz, pad + 8 + logoSz);
  gradLogo.addColorStop(0, '#60A5FA');
  gradLogo.addColorStop(1, '#C084FC');
  ctx.fillStyle = gradLogo;
  ctx.beginPath();
  ctx.roundRect(pad, pad + 8, logoSz, logoSz, 14);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  const lx = pad + 24, ly = pad + 32;
  ctx.beginPath();
  ctx.moveTo(lx, ly - 13);
  ctx.lineTo(lx + 11, ly - 6.5);
  ctx.lineTo(lx + 11, ly + 6.5);
  ctx.lineTo(lx, ly + 13);
  ctx.lineTo(lx - 11, ly + 6.5);
  ctx.lineTo(lx - 11, ly - 6.5);
  ctx.closePath();
  ctx.moveTo(lx - 11, ly - 6.5);
  ctx.lineTo(lx, ly);
  ctx.lineTo(lx + 11, ly - 6.5);
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx, ly + 13);
  ctx.stroke();

  ctx.fillStyle = th.accent;
  ctx.font = '800 12px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('ARCHRAY · ARCHITECTURE SNAPSHOT', pad + 64, pad + 22);

  ctx.fillStyle = th.text;
  ctx.font = '750 26px "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(meta.title, pad + 64, pad + 52, frameW - 220);

  ctx.fillStyle = th.sub;
  ctx.font = '500 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(meta.stats, pad + 64, pad + 76);

  // Score pill on right
  const scoreColor = meta.score >= 75 ? th.good : meta.score >= 50 ? th.warn : th.critical;
  ctx.fillStyle = th.hudStrong;
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(posterW - pad - 116, pad + 18, 116, 42, 999);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = scoreColor;
  ctx.font = '800 18px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${meta.score}/100`, posterW - pad - 58, pad + 45);
  ctx.textAlign = 'left';

  // Scene frame
  const fy = pad + headerH + gapY;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, fy, frameW, frameH, 24);
  ctx.fillStyle = th.bg;
  ctx.fill();
  ctx.clip();
  const scaleFit = Math.min(frameW / sceneCanvas.width, frameH / sceneCanvas.height);
  const dw = sceneCanvas.width * scaleFit;
  const dh = sceneCanvas.height * scaleFit;
  ctx.drawImage(sceneCanvas, pad + (frameW - dw) / 2, fy + (frameH - dh) / 2, dw, dh);
  ctx.restore();

  ctx.strokeStyle = th.panelBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(pad, fy, frameW, frameH, 24);
  ctx.stroke();

  // Open-source attribution & QR footer
  const barY = fy + frameH + gapY;
  ctx.fillStyle = th.hudStrong;
  ctx.strokeStyle = th.panelBorder;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(pad, barY, frameW, footerH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = th.text;
  ctx.font = '700 18px "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.fillText(meta.builtWith, pad + 26, barY + 42);

  ctx.fillStyle = th.accent;
  ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(ARCHRAY_REPO_URL, pad + 26, barY + 74);

  const qrSize = 86;
  drawQrCanvas(ctx, encodeQr(ARCHRAY_REPO_URL), posterW - pad - qrSize - 18, barY + (footerH - qrSize) / 2, qrSize);

  return out;
}

export async function exportSharePosterPng(th: Theme, meta: SharePosterMeta, filename: string) {
  const poster = await renderSharePosterCanvas(th, meta);
  downloadCanvas(poster, filename);
}

export async function copySharePosterPng(th: Theme, meta: SharePosterMeta): Promise<'copied' | 'downloaded'> {
  const poster = await renderSharePosterCanvas(th, meta);
  const blob = await new Promise<Blob | null>((res) => poster.toBlob((b) => res(b), 'image/png'));
  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (blob && ClipboardItemCtor && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      return 'copied';
    } catch { /* fall back cleanly to PNG download */ }
  }
  downloadCanvas(poster, `${meta.title}-archray-share.png`);
  return 'downloaded';
}
