import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Compass, Layers, Maximize2, Minus, Plus, Undo2 } from 'lucide-react';
import type { ArchNode, IsoLayoutResult } from '../types/archray';

interface Canvas25DProps {
  layout: IsoLayoutResult;
  viewKey: string;
  drillStack: ArchNode[];
  onNavigateBreadcrumb: (depthIndex: number) => void;
  onClearSelection: () => void;
  children: React.ReactNode;
}

interface ViewportTransform {
  tx: number;
  ty: number;
  scale: number;
}

const MIN_SCALE = 0.32;
const MAX_SCALE = 2.2;

// Exact 26° isometric grid tile dimensions (L = 60)
const ISO_TILE_W = 107.855;
const ISO_TILE_H = 52.605;

export const Canvas25D: React.FC<Canvas25DProps> = ({
  layout,
  viewKey,
  drillStack,
  onNavigateBreadcrumb,
  onClearSelection,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportTransform>({ tx: 0, ty: 0, scale: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean }>({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    moved: false,
  });

  const fitToBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const padX = 110;
    const padY = 140;
    const usableW = Math.max(240, rect.width - padX);
    const usableH = Math.max(240, rect.height - padY);

    const scaleX = usableW / Math.max(1, layout.bounds.width);
    const scaleY = usableH / Math.max(1, layout.bounds.height);
    const nextScale = Math.min(1.15, Math.max(0.38, Math.min(scaleX, scaleY)));

    const centerX = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const centerY = (layout.bounds.minY + layout.bounds.maxY) / 2;

    setViewport({
      scale: nextScale,
      tx: rect.width / 2 - centerX * nextScale,
      ty: rect.height / 2 - centerY * nextScale - 16,
    });
  }, [layout.bounds]);

  useEffect(() => {
    fitToBounds();
  }, [viewKey, fitToBounds]);

  useEffect(() => {
    const handleResize = () => fitToBounds();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToBounds]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.91;
    setViewport((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * zoomFactor));
      const worldX = (mouseX - prev.tx) / prev.scale;
      const worldY = (mouseY - prev.ty) / prev.scale;
      return {
        scale: nextScale,
        tx: mouseX - worldX * nextScale,
        ty: mouseY - worldY * nextScale,
      };
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    dragOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      tx: viewport.tx,
      ty: viewport.ty,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    if (Math.hypot(dx, dy) > 4) {
      dragOrigin.current.moved = true;
    }
    setViewport((prev) => ({
      ...prev,
      tx: dragOrigin.current.tx + dx,
      ty: dragOrigin.current.ty + dy,
    }));
  };

  const handlePointerUp = () => {
    if (isPanning && !dragOrigin.current.moved) {
      onClearSelection();
    }
    setIsPanning(false);
  };

  const adjustZoom = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const worldX = (cx - prev.tx) / prev.scale;
      const worldY = (cy - prev.ty) / prev.scale;
      return {
        scale: nextScale,
        tx: cx - worldX * nextScale,
        ty: cy - worldY * nextScale,
      };
    });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('g.archray-nodes-layer') == null) {
          fitToBounds();
        }
      }}
      className={`relative w-full h-full overflow-hidden select-none bg-[#0B0F19] ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Ambient Deep-Space Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.08) 0%, rgba(129, 140, 248, 0.04) 36%, rgba(11, 15, 25, 0) 74%)',
        }}
      />

      {/* C4 Subgraph Drill-down Breadcrumb */}
      {drillStack.length > 0 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-16 left-5 z-20 flex items-center gap-1.5 rounded-xl border border-sky-500/35 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur-md"
        >
          <Layers className="h-3.5 w-3.5 text-sky-400" />
          <button
            type="button"
            onClick={() => onNavigateBreadcrumb(-1)}
            className="rounded px-1.5 py-0.5 font-medium text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200"
          >
            System Root
          </button>
          {drillStack.map((item, idx) => {
            const isLast = idx === drillStack.length - 1;
            return (
              <React.Fragment key={item.id}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => onNavigateBreadcrumb(idx)}
                  className={`rounded px-1.5 py-0.5 font-semibold transition ${
                    isLast
                      ? 'bg-sky-500/20 text-sky-200 cursor-default'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
          <button
            type="button"
            onClick={() => onNavigateBreadcrumb(drillStack.length - 2)}
            className="ml-2 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
          >
            <Undo2 className="h-3 w-3" />
            Up Level
          </button>
        </div>
      )}

      {/* Main 2.5D Isometric SVG Scene */}
      <svg className="h-full w-full block">
        <defs>
          <pattern
            id="archray-iso-grid"
            width={ISO_TILE_W}
            height={ISO_TILE_H}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.tx % (ISO_TILE_W * viewport.scale)}, ${
              viewport.ty % (ISO_TILE_H * viewport.scale)
            }) scale(${viewport.scale})`}
          >
            <path
              d={`M ${ISO_TILE_W / 2} 0 L ${ISO_TILE_W} ${ISO_TILE_H / 2} L ${ISO_TILE_W / 2} ${ISO_TILE_H} L 0 ${
                ISO_TILE_H / 2
              } Z`}
              fill="none"
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth="0.9"
            />
            <circle cx={ISO_TILE_W / 2} cy={0} r="1" fill="rgba(56, 189, 248, 0.16)" />
          </pattern>
        </defs>

        {/* Infinite Isometric Blueprint Grid */}
        <rect x="0" y="0" width="100%" height="100%" fill="url(#archray-iso-grid)" />

        {/* World Transform Group */}
        <g transform={`translate(${viewport.tx.toFixed(2)}, ${viewport.ty.toFixed(2)}) scale(${viewport.scale.toFixed(4)})`}>
          {/* Architectural Layer Isometric Platforms */}
          <g className="archray-layers-group">
            {layout.layers.map((plane) => {
              const [p0, p1, p2, p3] = plane.polygonPoints;
              const pointsAttr = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
              const thickness = 10;
              const frontLeftBevel = `${p3.x},${p3.y} ${p2.x},${p2.y} ${p2.x},${p2.y + thickness} ${p3.x},${
                p3.y + thickness
              }`;
              const frontRightBevel = `${p2.x},${p2.y} ${p1.x},${p1.y} ${p1.x},${p1.y + thickness} ${p2.x},${
                p2.y + thickness
              }`;
              const layerTitle = `L${plane.layer.order} · ${plane.layer.label.toUpperCase()}`;

              return (
                <g key={plane.layer.id}>
                  {/* 3D Extruded Tray Bevels */}
                  <polygon
                    points={frontLeftBevel}
                    fill={plane.accentColor}
                    fillOpacity="0.10"
                    stroke={plane.accentColor}
                    strokeOpacity="0.28"
                    strokeWidth="0.9"
                  />
                  <polygon
                    points={frontRightBevel}
                    fill={plane.accentColor}
                    fillOpacity="0.06"
                    stroke={plane.accentColor}
                    strokeOpacity="0.24"
                    strokeWidth="0.9"
                  />

                  {/* Top Isometric Tray Plane */}
                  <polygon
                    points={pointsAttr}
                    fill={plane.accentColor}
                    fillOpacity="0.045"
                    stroke={plane.accentColor}
                    strokeOpacity="0.34"
                    strokeWidth="1.25"
                  />

                  {/* Layer Title Pill anchored along isometric tray corner */}
                  <g transform={`translate(${plane.labelAnchor.x}, ${plane.labelAnchor.y}) rotate(26)`}>
                    <rect
                      x="0"
                      y="-14"
                      width={Math.max(160, layerTitle.length * 6.8 + 34)}
                      height="22"
                      rx="6"
                      fill="rgba(15, 23, 42, 0.88)"
                      stroke={plane.accentColor}
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <circle cx="13" cy="-3" r="3.5" fill={plane.accentColor} />
                    <text
                      x="24"
                      y="1"
                      fill="#E2E8F0"
                      fontSize="10.5"
                      fontWeight="700"
                      letterSpacing="0.04em"
                    >
                      {layerTitle}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Edges & Nodes rendered in order */}
          {children}
        </g>
      </svg>

      {/* Bottom-Right Viewport Controls */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-5 right-5 z-20 flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/85 p-1.5 text-slate-300 shadow-xl backdrop-blur-md"
      >
        <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-700/70 px-2.5 text-[11px] font-medium text-slate-400">
          <Compass className="h-3.5 w-3.5 text-sky-400" />
          <span>ISO 26°</span>
          <span className="text-slate-600">|</span>
          <span className="tabular-nums text-slate-200">{Math.round(viewport.scale * 100)}%</span>
        </div>
        <button
          type="button"
          title="Zoom Out"
          onClick={() => adjustZoom(0.84)}
          className="rounded-lg p-1.5 transition hover:bg-slate-800 hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Zoom In"
          onClick={() => adjustZoom(1.18)}
          className="rounded-lg p-1.5 transition hover:bg-slate-800 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Fit Architecture to View"
          onClick={fitToBounds}
          className="rounded-lg p-1.5 transition hover:bg-slate-800 hover:text-sky-300"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
