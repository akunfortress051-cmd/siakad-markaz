"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, Printer } from "lucide-react";
import Link from "next/link";

interface DocumentViewerProps {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  /** Original document width in px (before scaling) */
  docWidthPx: number;
  /** Original document height in px (before scaling) */
  docHeightPx: number;
  onPrint?: () => void;
}

export function DocumentViewer({
  backHref,
  backLabel,
  children,
  docWidthPx,
  docHeightPx,
  onPrint,
}: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute an initial "fit" zoom when component mounts so the entire doc is visible
  useEffect(() => {
    const computeFit = () => {
      if (!containerRef.current) return;
      const availW = containerRef.current.clientWidth - 48; // subtract padding
      const availH = window.innerHeight - 140; // subtract toolbar + some breathing
      const fitZoom = Math.min(availW / docWidthPx, availH / docHeightPx, 1);
      setZoom(Math.max(0.2, fitZoom));
    };
    computeFit();
    window.addEventListener("resize", computeFit);
    return () => window.removeEventListener("resize", computeFit);
  }, [docWidthPx, docHeightPx]);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(3, Math.max(0.2, +(z + delta).toFixed(2))));
  }, []);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const availW = containerRef.current.clientWidth - 48;
    const availH = window.innerHeight - 140;
    const fitZoom = Math.min(availW / docWidthPx, availH / docHeightPx, 1);
    setZoom(Math.max(0.2, fitZoom));
  }, [docWidthPx, docHeightPx]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Pinch-to-zoom support
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / pinchRef.current.dist;
      const newZoom = Math.min(3, Math.max(0.2, +(pinchRef.current.zoom * ratio).toFixed(2)));
      setZoom(newZoom);
    }
  };
  const handleTouchEnd = () => {
    pinchRef.current = null;
  };

  // Mouse wheel zoom (ctrl + scroll)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      adjustZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }
  };

  const scaledW = docWidthPx * zoom;
  const scaledH = docHeightPx * zoom;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col print:bg-white print:min-h-0">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-neutral-800/90 backdrop-blur border-b border-neutral-700 print:hidden">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-neutral-300 hover:text-white text-sm font-semibold transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-neutral-700/60 rounded-xl px-2 py-1">
          <button
            onClick={() => adjustZoom(-0.1)}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-600 transition"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={fitToScreen}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-neutral-200 hover:text-white hover:bg-neutral-600 transition min-w-[52px] text-center"
            title="Fit to screen"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => adjustZoom(0.1)}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-600 transition"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onPrint ?? (() => window.print())}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Document Stage */}
      <div
        ref={containerRef}
        className="flex-1 flex items-start justify-center overflow-auto p-6 print:p-0 print:block"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: "grab" }}
      >
        {/* 
          The outer shell is sized to the visual (scaled) dimensions.
          The inner content div retains its natural width/minHeight and is
          shrunk/grown via CSS transform so browsers never clip it.
        */}
        <div
          className="print:transform-none print:w-auto relative"
          style={{
            width: scaledW,
            minHeight: scaledH,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: docWidthPx,
              minHeight: docHeightPx,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
