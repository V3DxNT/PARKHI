"use client";

import React, { useEffect, useRef, useState } from "react";
import { SPACE_CONFIG } from "./config";
import { StarField } from "./StarField";
import { Earth } from "./Earth";
import { Satellite } from "./Satellite";
import { SpaceText } from "./SpaceText";
import { getOrbitPosition, OrbitPathSvg } from "./OrbitPath";

interface SpaceExperienceProps {
  onThemeProgress?: (progress: number) => void;
}

export function SpaceExperience({ onThemeProgress }: SpaceExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [smoothProgress, setSmoothProgress] = useState(0);

  /**
   * SINGLE rAF loop — no scroll listener.
   *
   * Each frame we read the container's bounding rect (cheap), compute
   * the raw scroll progress, lerp toward it, then call setSmoothProgress
   * ONCE per frame.  This means exactly ONE React render per animation
   * frame instead of the previous double-effect pattern.
   *
   * Lerp factor 0.20 → snappy enough to feel responsive, smooth enough
   * to avoid janky jumps.
   */
  useEffect(() => {
    let frameId: number;
    let target = 0;
    let current = 0;

    const tick = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const scrollableDist = container.offsetHeight - window.innerHeight;
        if (scrollableDist > 0) {
          target = Math.max(0, Math.min(1, -rect.top / scrollableDist));
        }
      }

      // Lerp: close the gap by 20% each frame (≈60fps → settles in ~15 frames / 250ms)
      const diff = target - current;
      if (Math.abs(diff) > 0.0003) {
        current += diff * 0.20;
      } else {
        current = target;
      }

      setSmoothProgress(current);
      onThemeProgress?.(current);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [onThemeProgress]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const { timeline } = SPACE_CONFIG;

  const orbitT = Math.max(
    0,
    Math.min(
      1,
      (smoothProgress - timeline.orbitStart) /
        (timeline.orbitEnd - timeline.orbitStart)
    )
  );

  const satPos = getOrbitPosition(orbitT);

  const transitionProgress = Math.max(
    0,
    Math.min(
      1,
      (smoothProgress - timeline.transitionStart) /
        (timeline.transitionEnd - timeline.transitionStart)
    )
  );

  return (
    <section
      ref={containerRef}
      className="relative w-full"
      style={{ height: SPACE_CONFIG.sectionHeight }}
    >
      {/* Sticky viewport — stays in place while the container scrolls */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#020305] select-none">

        {/* Deep space background — neutral dark, no blue/purple bias */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, #06080f 0%, #020305 70%)",
          }}
        />

        {/* Stars */}
        <StarField progress={smoothProgress} />

        {/* Debug orbit path (off by default) */}
        <OrbitPathSvg progress={orbitT} showDebugPath={false} />

        {/* Earth */}
        <Earth scrollProgress={smoothProgress} />

        {/* Satellite */}
        <Satellite
          x={satPos.x}
          y={satPos.y}
          rotation={satPos.rotation}
          scale={satPos.scale}
          opacity={satPos.opacity}
          isOccluded={satPos.isOccluded}
        />

        {/* Scroll-driven text phases */}
        <SpaceText progress={smoothProgress} />

        {/* Dark → light transition overlay */}
        <div
          className="absolute inset-0 pointer-events-none bg-surface"
          style={{
            opacity: transitionProgress,
            zIndex: 40,
          }}
        />
      </div>
    </section>
  );
}
