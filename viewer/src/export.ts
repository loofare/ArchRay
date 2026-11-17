import type { Theme } from './theme';

/** Rasterise the scene SVG at 2x with the theme background. Pure client side. */
export async function exportPng(th: Theme, filename: string, scale = 2) {
  const svg = document.getElementById('archray-scene') as SVGSVGElement | null;
  if (!svg) throw Error('Scene is not ready; retry after layout');
  await document.fonts.ready;
  const vb = svg.viewBox.baseVal;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(vb.width));
  clone.setAttribute('height', String(vb.height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--ar-font');
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  Object.entries({ x: vb.x, y: vb.y, width: vb.width, height: vb.height, fill: th.bg }).forEach(([k, v]) => bg.setAttribute(k, String(v)));
  clone.insertBefore(bg, clone.firstChild);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  try {
  await new Promise((r, j) => { img.onload = r; img.onerror = () => j(Error('Image decode failed; retry PNG export')); img.src = url; });
  const c = document.createElement('canvas');
  c.width = vb.width * scale;
  c.height = vb.height * scale;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);

  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = filename;
  a.click();
  } finally { URL.revokeObjectURL(url); }
}
