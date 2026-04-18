"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "personaPanel.dimensions";

const MARGIN = 48; // px — min distance to viewport edge
const MOBILE_BREAKPOINT = 768;

interface Dimensions {
  width: number;
  height: number;
}

const DEFAULT_DIMENSIONS: Dimensions = {
  width: 720,
  height: 800,
};

const LIMITS = {
  minWidth: 560,
  maxWidthVw: 0.9,
  maxWidthPx: 1100,
  minHeight: 480,
};

interface PanelShellProps {
  open: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  /** Optional node rendered as a sticky footer (e.g. Save/Cancel). */
  footer?: ReactNode;
  /** Custom content for the panel header (left side). Defaults to a spacer. */
  headerLeft?: ReactNode;
  /** Custom content for the panel header (right side, next to close). */
  headerRight?: ReactNode;
  /** Called when the fullscreen toggle state changes. */
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function PanelShell({
  open,
  onRequestClose,
  children,
  footer,
  headerLeft,
  headerRight,
  onFullscreenChange,
}: PanelShellProps) {
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>(DEFAULT_DIMENSIONS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    direction: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal pattern: must wait for client mount
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Dimensions;
        if (parsed.width && parsed.height) {
          setDimensions(clampDimensions(parsed));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setDimensions((d) => clampDimensions(d));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onRequestClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onRequestClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  const persistDimensions = useCallback((d: Dimensions) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      // ignore
    }
  }, []);

  const handlePointerDown = useCallback(
    (direction: string) => (e: React.PointerEvent) => {
      if (isFullscreen || isMobile) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      resizingRef.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startW: dimensions.width,
        startH: dimensions.height,
      };
    },
    [dimensions, isFullscreen, isMobile]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const r = resizingRef.current;
    if (!r) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    let newW = r.startW;
    let newH = r.startH;
    if (r.direction.includes("e")) newW = r.startW + dx * 2;
    if (r.direction.includes("w")) newW = r.startW - dx * 2;
    if (r.direction.includes("s")) newH = r.startH + dy * 2;
    if (r.direction.includes("n")) newH = r.startH - dy * 2;
    setDimensions(clampDimensions({ width: newW, height: newH }));
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!resizingRef.current) return;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      resizingRef.current = null;
      persistDimensions(dimensions);
    },
    [dimensions, persistDimensions]
  );

  const resetDimensions = useCallback(() => {
    setDimensions(DEFAULT_DIMENSIONS);
    persistDimensions(DEFAULT_DIMENSIONS);
  }, [persistDimensions]);

  if (!mounted) return null;

  const appliedDimensions = isFullscreen || isMobile
    ? { width: "calc(100vw - " + (isMobile ? 0 : MARGIN * 2) + "px)", height: "calc(100vh - " + (isMobile ? 0 : MARGIN * 2) + "px)" }
    : { width: dimensions.width, height: dimensions.height };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onRequestClose}
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.8 }}
            className="fixed z-[101] flex flex-col"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: appliedDimensions.width,
              height: appliedDimensions.height,
              maxWidth: isMobile ? undefined : "calc(100vw - " + MARGIN * 2 + "px)",
              maxHeight: isMobile ? undefined : "calc(100vh - " + MARGIN * 2 + "px)",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-default)",
              borderRadius: isMobile ? 0 : "var(--radius-xl)",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-subtle)",
              overflow: "hidden",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-[var(--space-4)] py-[var(--space-3)] shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-[var(--space-2)] min-w-0">
                <button
                  onClick={() => setIsFullscreen((v) => !v)}
                  aria-label={isFullscreen ? "Avsluta fullskarm" : "Fullskarm"}
                  className="w-8 h-8 flex items-center justify-center transition-colors"
                  style={{
                    color: "var(--text-tertiary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
                </button>
                <div className="min-w-0">{headerLeft}</div>
              </div>
              <div className="flex items-center gap-[var(--space-1)]">
                {headerRight}
                <button
                  onClick={resetDimensions}
                  aria-label="Atersall panelstorlek"
                  title="Aterstall panelstorlek"
                  className="w-8 h-8 flex items-center justify-center transition-colors hidden lg:flex"
                  style={{
                    color: "var(--text-tertiary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <ResetIcon />
                </button>
                <button
                  onClick={onRequestClose}
                  aria-label="Stang"
                  className="w-8 h-8 flex items-center justify-center transition-colors"
                  style={{
                    color: "var(--text-tertiary)",
                    borderRadius: "var(--radius-sm)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto">{children}</div>

            {/* Footer (sticky) */}
            {footer && (
              <div
                className="shrink-0 px-[var(--space-5)] py-[var(--space-4)]"
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  background: "var(--bg-panel)",
                }}
              >
                {footer}
              </div>
            )}

            {/* Resize handles — hidden in fullscreen/mobile */}
            {!isFullscreen && !isMobile && (
              <>
                {/* Edges */}
                <ResizeHandle direction="n" onPointerDown={handlePointerDown("n")} />
                <ResizeHandle direction="s" onPointerDown={handlePointerDown("s")} />
                <ResizeHandle direction="e" onPointerDown={handlePointerDown("e")} />
                <ResizeHandle direction="w" onPointerDown={handlePointerDown("w")} />
                {/* Corners */}
                <ResizeHandle direction="ne" onPointerDown={handlePointerDown("ne")} />
                <ResizeHandle direction="nw" onPointerDown={handlePointerDown("nw")} />
                <ResizeHandle direction="se" onPointerDown={handlePointerDown("se")} />
                <ResizeHandle direction="sw" onPointerDown={handlePointerDown("sw")} />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function clampDimensions(d: Dimensions): Dimensions {
  if (typeof window === "undefined") return d;
  const maxW = Math.min(window.innerWidth * LIMITS.maxWidthVw, LIMITS.maxWidthPx);
  const maxH = window.innerHeight - MARGIN * 2;
  return {
    width: Math.max(LIMITS.minWidth, Math.min(d.width, maxW)),
    height: Math.max(LIMITS.minHeight, Math.min(d.height, maxH)),
  };
}

function ResizeHandle({
  direction,
  onPointerDown,
}: {
  direction: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    touchAction: "none",
  };
  let style: React.CSSProperties = { ...base };
  let cursor = "";
  const THICK = 6;
  const CORNER = 16;

  switch (direction) {
    case "n":
      style = { ...style, top: 0, left: CORNER, right: CORNER, height: THICK };
      cursor = "ns-resize";
      break;
    case "s":
      style = { ...style, bottom: 0, left: CORNER, right: CORNER, height: THICK };
      cursor = "ns-resize";
      break;
    case "e":
      style = { ...style, right: 0, top: CORNER, bottom: CORNER, width: THICK };
      cursor = "ew-resize";
      break;
    case "w":
      style = { ...style, left: 0, top: CORNER, bottom: CORNER, width: THICK };
      cursor = "ew-resize";
      break;
    case "ne":
      style = { ...style, top: 0, right: 0, width: CORNER, height: CORNER };
      cursor = "nesw-resize";
      break;
    case "nw":
      style = { ...style, top: 0, left: 0, width: CORNER, height: CORNER };
      cursor = "nwse-resize";
      break;
    case "se":
      style = { ...style, bottom: 0, right: 0, width: CORNER, height: CORNER };
      cursor = "nwse-resize";
      break;
    case "sw":
      style = { ...style, bottom: 0, left: 0, width: CORNER, height: CORNER };
      cursor = "nesw-resize";
      break;
  }
  return (
    <div
      role="separator"
      aria-orientation={direction === "n" || direction === "s" ? "horizontal" : "vertical"}
      style={{ ...style, cursor }}
      onPointerDown={onPointerDown}
    />
  );
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3h3v3M13 3l-4 4M6 13H3v-3M3 13l4-4" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3v3H3M6 6l-3-3M10 13v-3h3M10 10l3 3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8a5 5 0 109-3l1.5 1.5M12.5 3v3h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
