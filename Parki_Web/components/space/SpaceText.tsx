"use client";

import React from "react";

interface SpaceTextProps {
  progress: number; // scroll progress 0.0 to 1.0
}

/**
 * Two-phase text storytelling, centered vertically in the upper-middle of the screen
 * (below the navbar, above the Earth horizon).
 *
 * Phase 1 — visible at 0% scroll, fades out when satellite starts moving (~22%)
 * Phase 2 — fades in once phase-1 is gone (~26%), stays until satellite approaches horizon (~72%)
 */
export function SpaceText({ progress }: SpaceTextProps) {
  // ─── Phase 1: "From Raw Satellite Imagery" ───────────────────────────────
  // Full opacity from 0% → 15%, then fades out by 24%
  const p1Opacity = Math.max(
    0,
    progress < 0.15 ? 1 : 1 - (progress - 0.15) / 0.10
  );
  const p1Y = progress * -30; // slow upward parallax

  // ─── Phase 2: "To Enhanced Spatial Image" ────────────────────────────────
  // Fades in at 26% → full by 34%, then fades out starting at 64% → gone by 74%
  const p2RawIn  = (progress - 0.26) / 0.10;
  const p2RawOut = 1 - (progress - 0.64) / 0.10;
  const p2Opacity = Math.max(0, Math.min(p2RawIn, p2RawOut, 1));
  const p2Y = (1 - p2Opacity) * 18; // subtle rise-in

  return (
    <>
      {/* Phase 1 */}
      {p1Opacity > 0.01 && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none px-6 text-center"
          style={{
            top: "32%",          // well below the navbar, above the horizon
            opacity: p1Opacity,
            transform: `translateY(${p1Y}px)`,
            willChange: "opacity, transform",
          }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] sm:text-xs font-mono font-medium tracking-widest uppercase backdrop-blur-md shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SENTINEL-2 EARTH OBSERVATION
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-white text-2xl sm:text-4xl md:text-5xl font-normal leading-[1.15] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
              From Raw Satellite Imagery
            </h1>

            {/* Scroll cue */}
            <div className="mt-3 flex flex-col items-center gap-1 text-slate-400 text-[11px] font-mono tracking-wider opacity-75 animate-bounce">
              <span>SCROLL TO ORBIT</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 */}
      {p2Opacity > 0.01 && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none px-6 text-center"
          style={{
            top: "32%",
            opacity: p2Opacity,
            transform: `translateY(${p2Y}px)`,
            willChange: "opacity, transform",
          }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950/60 border border-teal-500/30 text-teal-300 text-[11px] sm:text-xs font-mono font-medium tracking-widest uppercase backdrop-blur-md shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              HYBRID ATTENTION TRANSFORMER
            </div>

            {/* Headline */}
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-white text-2xl sm:text-4xl md:text-5xl font-normal leading-[1.15] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
              To{" "}
              <span className="font-bold bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                Enhanced
              </span>{" "}
              Spatial Image
            </h2>
          </div>
        </div>
      )}
    </>
  );
}
