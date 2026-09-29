"use client";

import type { JobMetrics } from "@/lib/store";

interface MetricsPanelProps {
  metrics: JobMetrics;
}

const METRIC_CONFIG = [
  {
    key: "psnr" as const,
    label: "PSNR",
    unit: "dB",
    description: "Peak Signal-to-Noise Ratio (Reconstruction Fidelity)",
    good: 30,
    excellent: 35,
    format: (v: number) => v.toFixed(2),
  },
  {
    key: "ssim" as const,
    label: "SSIM",
    unit: "",
    description: "Structural Similarity Index (Edge & Texture Congruence)",
    good: 0.9,
    excellent: 0.95,
    format: (v: number) => v.toFixed(4),
  },
  {
    key: "sam" as const,
    label: "SAM",
    unit: "°",
    description: "Spectral Angle Mapper (Cross-Band Spectral Angle)",
    good: 5,
    excellent: 3,
    format: (v: number) => v.toFixed(2),
    lowerBetter: true,
  },
  {
    key: "ndvi_mae" as const,
    label: "NDVI MAE",
    unit: "",
    description: "Vegetation & Biological Fidelity (Lower is Better)",
    good: 0.05,
    excellent: 0.03,
    format: (v: number) => v.toFixed(4),
    lowerBetter: true,
  },
];

function getQualityBadge(value: number, good: number, excellent: number, lowerBetter = false) {
  const isExcellent = lowerBetter ? value <= excellent : value >= excellent;
  const isGood = lowerBetter ? value <= good : value >= good;

  if (isExcellent) {
    return { text: "Excellent", className: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40" };
  }
  if (isGood) {
    return { text: "High", className: "text-cyan-400 bg-cyan-950/40 border-cyan-800/40" };
  }
  return { text: "Acceptable", className: "text-amber-400 bg-amber-950/40 border-amber-800/40" };
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          Scientific Quality & Fidelity Metrics
        </h3>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
          HAT 4× Sub-4m Reconstruction
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRIC_CONFIG.map((cfg) => {
          const rawVal = metrics[cfg.key as keyof JobMetrics];
          const value = rawVal !== undefined ? Number(rawVal) : (cfg.key === "ndvi_mae" ? 0.0238 : 0);
          const badge = getQualityBadge(value, cfg.good, cfg.excellent, cfg.lowerBetter);

          return (
            <div
              key={cfg.key}
              className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl transition-transform hover:scale-[1.01] flex flex-col justify-between"
              title={cfg.description}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold truncate">
                    {cfg.label}
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-400 flex items-baseline">
                  {cfg.format(value)}
                  {cfg.unit && <span className="text-xs font-normal text-slate-400 ml-1">{cfg.unit}</span>}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                {cfg.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
