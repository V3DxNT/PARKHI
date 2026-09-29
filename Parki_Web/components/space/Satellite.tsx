"use client";

import React from "react";
import Image from "next/image";

interface SatelliteProps {
  x: number;          // screen X percentage (0..100)
  y: number;          // screen Y percentage (0..100)
  rotation: number;   // orientation angle in degrees along trajectory tangent
  scale?: number;
  opacity?: number;
  isOccluded?: boolean;
}

export function Satellite({
  x,
  y,
  rotation,
  scale = 1,
  opacity = 1,
  isOccluded = false,
}: SatelliteProps) {
  return (
    <div
      className="absolute pointer-events-none will-change-transform select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
        opacity: isOccluded ? 0 : opacity,
        transition: "opacity 0.2s ease-out",
        zIndex: 25, // Above background, below Earth front occlusion horizon
      }}
      aria-label="Sentinel-2 Earth Observation Satellite"
    >
      <div className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-44 md:h-44 filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]">
        {/* Photorealistic Sentinel-2 Transparent PNG */}
        <div className="relative w-full h-full">
          <Image
            src="/assets/space/satellite/sentinel2-photorealistic.png"
            alt="Sentinel-2 Satellite"
            fill
            sizes="(max-width: 768px) 160px, 200px"
            className="object-contain"
            priority
          />
        </div>

        {/* Optical Sensor Scanning Cone Glow (Earth Observation beam) */}
        <div
          className="absolute -bottom-6 left-1/4 w-28 h-36 pointer-events-none opacity-20"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 0%, rgba(56, 189, 248, 0.45) 0deg, rgba(20, 184, 166, 0.2) 25deg, transparent 40deg, transparent 320deg, rgba(56, 189, 248, 0.45) 360deg)",
            transform: "rotate(-15deg)",
            filter: "blur(4px)",
          }}
        />

        {/* Active Telemetry Beacon LED */}
        <div className="absolute top-[36%] left-[40%] w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
        <div className="absolute top-[36%] left-[40%] w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_#34d399]" />

        {/* Minimal HUD callout */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-black/80 border border-cyan-500/40 backdrop-blur-xs text-[9px] font-mono font-medium text-cyan-300 tracking-wider flex items-center gap-1.5 shadow-lg shadow-black/80"
          style={{ transform: `rotate(${-rotation}deg)` }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          SENTINEL-2 • 786 KM
        </div>
      </div>
    </div>
  );
}
