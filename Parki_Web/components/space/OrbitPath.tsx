"use client";

import React from "react";
import { SPACE_CONFIG } from "./config";

export interface OrbitPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  isOccluded: boolean;
}

// Natural orbital sweep: enters upper-left, arcs gently over Earth, exits lower-right.
const P0 = { x: 10, y: 52 }; // left entry  — just above the left horizon limb
const P1 = { x: 30, y: 18 }; // control     — pulls arc up-right naturally
const P2 = { x: 70, y: 18 }; // control     — symmetric pull on the right
const P3 = { x: 90, y: 58 }; // right exit  — dips toward the right horizon

export function getOrbitPosition(t: number): OrbitPosition {
  const clampedT = Math.max(0, Math.min(1, t));

  const u  = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  const x = uuu * P0.x + 3 * uu * clampedT * P1.x + 3 * u * tt * P2.x + ttt * P3.x;
  const y = uuu * P0.y + 3 * uu * clampedT * P1.y + 3 * u * tt * P2.y + ttt * P3.y;

  // Tangent for orientation
  const dx =
    3 * uu * (P1.x - P0.x) +
    6 * u * clampedT * (P2.x - P1.x) +
    3 * tt * (P3.x - P2.x);
  const dy =
    3 * uu * (P1.y - P0.y) +
    6 * u * clampedT * (P2.y - P1.y) +
    3 * tt * (P3.y - P2.y);

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 10;

  // Subtle perspective scale: shrinks as it recedes right (depth illusion)
  const scale = 1.0 - clampedT * 0.22;

  // Occlusion: satellite fades as it dips into the Earth's far limb
  const { occlusionStart, occlusionEnd } = SPACE_CONFIG.timeline;
  let opacity = 1;
  let isOccluded = false;

  if (clampedT >= occlusionEnd) {
    isOccluded = true;
    opacity = 0;
  } else if (clampedT > occlusionStart) {
    const fp = (clampedT - occlusionStart) / (occlusionEnd - occlusionStart);
    opacity = Math.max(0, 1 - fp);
  }

  return { x, y, rotation: angle, scale, opacity, isOccluded };
}

interface OrbitPathSvgProps {
  progress?: number;
  showDebugPath?: boolean;
}

export function OrbitPathSvg({ progress: _progress = 0, showDebugPath = false }: OrbitPathSvgProps) {
  if (!showDebugPath) return null;
  const pathD = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-50">
        <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="0.4" strokeDasharray="1,1" />
      </svg>
    </div>
  );
}
