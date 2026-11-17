import type { Theme } from './theme';

interface Box { x: number; y: number; width: number; height: number }

/**
 * Rasterise the scene as PNG. `full` ignores the current camera and exports the
 * complete visible layout at up to 2x (capped to a safe canvas size).
 */
export async function exportPng(th: Theme, filename: string, opts: { full?: boolean; scale?: number } = {}) {
  const { full = false, scale = 2 } = opts;
  const svg = document.getElementById('archray-scene') as SVGSVGElement | null;
  if (!svg) throw Error('Scene is not ready; retry after layout');
  await document.fonts.ready;

  let box: Box;
  if (full) {
    const b = svg.getBBox();
    const pad = 28;
    box = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
  } else {
    const vb = svg.viewBox.baseVal;
    box = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  }
  const factor = Math.min(scale, 9000 / Math.max(box.width, box.height, 1));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Ambient particles/current are time-based; a still image should not freeze them mid-path.
  clone.querySelectorAll('.ar-particle, .ar-current').forEach((el) => el.remove());
  clone.setAttribute('width', String(box.width));
  clone.setAttribute('height', String(box.height));
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--ar-font');

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  Object.entries({ x: box.x, y: box.y, width: box.width, height: box.height, fill: th.bg })
    .forEach(([k, v]) => bg.setAttribute(k, String(v)));
  clone.insertBefore(bg, clone.firstChild);

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(Error('Image decode failed; retry PNG export'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(box.width * factor);
    canvas.height = Math.round(box.height * factor);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
