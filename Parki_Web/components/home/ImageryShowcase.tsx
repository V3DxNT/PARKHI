"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Multi-Stage Model Benchmarks
 * Demonstrates:
 * 1. Super-Resolution (10m → <4m) - Agricultural & Vegetation Zone
 * 2. Urban Building Extraction - Residual UNet
 * 3. Disaster Damage Assessment - Hurricane Michael Triage
 */

interface ColumnInfo {
  title: string;
  subtitle: string;
  badge: string;
  url: string;
  type: "lr" | "hr" | "sr";
}

interface BenchmarkItem {
  id: number;
  label: string;
  description: string;
  arrow1Text: string;
  arrow2Text: string;
  col1: ColumnInfo;
  col2: ColumnInfo;
  col3: ColumnInfo;
  fullPlotUrl: string;
  fullPlotTitle: string;
  fullPlotSubtitle: string;
}

const BENCHMARK_ITEMS: BenchmarkItem[] = [
  {
    id: 1,
    label: "Agricultural & Vegetation Zone",
    description: "Actual model evaluation: raw 10m Sentinel-2 vs 5m reference vs super-resolved output",
    arrow1Text: "2× SCALE",
    arrow2Text: "DUAL-SR",
    col1: {
      title: "LR (10m)",
      subtitle: "Raw Sentinel-2",
      badge: "LR (10m)",
      url: "/images/sample-lr-plot.jpeg",
      type: "lr",
    },
    col2: {
      title: "HR (5m)",
      subtitle: "Reference Truth",
      badge: "HR (5m)",
      url: "/images/sample-hr-plot.jpeg",
      type: "hr",
    },
    col3: {
      title: "SR (Fixed Norm)",
      subtitle: "Reconstructed <4m",
      badge: "SR (Fixed Norm)",
      url: "/images/sample-sr-plot.jpeg",
      type: "sr",
    },
    fullPlotUrl: "/images/sample-comparison-full.jpeg",
    fullPlotTitle: "Agricultural Super-Resolution Calibration Matrix",
    fullPlotSubtitle: "LR (10m) vs HR (5m) vs SR (fixed normalization) empirical matrix",
  },
  {
    id: 2,
    label: "Urban Infrastructure",
    description: "Residual UNet commercial building footprints & density extraction",
    arrow1Text: "INFERENCE",
    arrow2Text: "SEGMENTATION",
    col1: {
      title: "Input Image",
      subtitle: "Raw Optical Tile",
      badge: "Input Image",
      url: "/images/urban-input.png",
      type: "lr",
    },
    col2: {
      title: "Building Probability",
      subtitle: "Confidence Heat...",
      badge: "Building Probability",
      url: "/images/urban-probability.png",
      type: "hr",
    },
    col3: {
      title: "Building Mask",
      subtitle: "Extracted Footpri...",
      badge: "Building Mask",
      url: "/images/urban-mask.png",
      type: "sr",
    },
    fullPlotUrl: "/images/urban-combined-full.png",
    fullPlotTitle: "Urban Infrastructure & Building Footprint Extraction",
    fullPlotSubtitle: "Raw Optical Tile → Building Probability Heatmap → Binary Extraction Mask",
  },
  {
    id: 3,
    label: "Disaster & Damage Assessment",
    description: "Structural destruction analysis & building damage classification (Hurricane Michael)",
    arrow1Text: "IMPACT EVENT",
    arrow2Text: "DAMAGE TRIAGE",
    col1: {
      title: "Before Disaster",
      subtitle: "Pre-Event Baseline",
      badge: "Before Disaster",
      url: "/images/disaster-before.png",
      type: "lr",
    },
    col2: {
      title: "After Disaster",
      subtitle: "Post-Event Capture",
      badge: "After Disaster",
      url: "/images/disaster-after.png",
      type: "hr",
    },
    col3: {
      title: "AI Damage Map",
      subtitle: "Classified Damag...",
      badge: "AI Damage Map",
      url: "/images/disaster-damage-map.png",
      type: "sr",
    },
    fullPlotUrl: "/images/disaster-combined-full.png",
    fullPlotTitle: "Post-Disaster Structural Damage Classification",
    fullPlotSubtitle: "Pre-Event Baseline → Post-Event Capture → AI Damage Triage Map",
  },
];

/* Right arrow icon (horizontal) */
function ArrowRight() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-secondary shrink-0"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* Down arrow icon (vertical, for narrow mobile viewports) */
function ArrowDown() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-secondary shrink-0"
    >
      <path d="M12 5v14" />
      <path d="m5 12 7 7 7-7" />
    </svg>
  );
}

/* Single image tile */
function TripletTile({
  col,
  setLabel,
  onImageClick,
}: {
  col: ColumnInfo;
  setLabel: string;
  onImageClick?: () => void;
}) {
  const badgeColors = {
    lr: "bg-blue-600/90 text-white border-blue-400/40",
    hr: "bg-amber-500/90 text-white border-amber-400/40",
    sr: "bg-teal-500/90 text-white border-teal-300/40",
  };

  return (
    <div className="flex flex-col gap-2 flex-1 w-full max-w-[280px]">
      {/* Column Mini-Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white tracking-wide truncate">
          {col.title}
        </span>
        <span
          className="text-[10px] text-white/40 hidden sm:inline truncate max-w-[130px]"
          title={col.subtitle}
        >
          {col.subtitle}
        </span>
      </div>

      <div
        onClick={onImageClick}
        className={`relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 bg-black/80 shadow-lg group transition-transform duration-200 hover:scale-[1.02] cursor-pointer`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={col.url}
          alt={`${setLabel} — ${col.title}`}
          className="w-full h-full object-cover bg-black"
        />
        <span
          className={`absolute bottom-2.5 left-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-md ${badgeColors[col.type]}`}
        >
          {col.badge}
        </span>
      </div>
    </div>
  );
}

interface ModalPlot {
  url: string;
  title: string;
  subtitle: string;
}

export function ImageryShowcase() {
  const [selectedModalPlot, setSelectedModalPlot] = useState<ModalPlot | null>(null);

  return (
    <>
      <div className="relative overflow-hidden w-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 sm:p-8 space-y-8 shadow-2xl shadow-black/50">
        {/* Subtle glowing top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Card Header matching reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Multi-Stage Model Benchmarks
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Super-Resolution (10m → &lt;4m), Urban Building Extraction, and Disaster Damage Assessment
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              3 Benchmark Sets
            </span>
          </div>
        </div>

        {/* 3 Benchmark Rows */}
        <div className="space-y-8">
          {BENCHMARK_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-xl p-4 sm:p-5 transition-all duration-300 group hover:border-primary/40 hover:shadow-[0_0_25px_rgba(46,125,225,0.12)] bg-white/[0.04] border border-white/10"
            >
              {/* Row subtle glowing top accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Row metadata header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2.5 mb-1">
                    <span className="font-mono text-sm sm:text-base text-secondary font-bold">
                      0{idx + 1}.
                    </span>
                    <h4 className="font-[family-name:var(--font-space-grotesk)] text-lg sm:text-xl font-bold text-white tracking-tight">
                      {item.label}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400/80 mt-0.5">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                  className="text-xs text-secondary hover:text-white bg-secondary/10 hover:bg-secondary/20 px-3 py-1 rounded-lg border border-secondary/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                  <span>Full Comparison</span>
                </button>
              </div>

              {/* Horizontal layout on md+, Vertical on mobile */}
              <div className="hidden md:flex items-center justify-between gap-3">
                <TripletTile
                  col={item.col1}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />

                <div className="flex flex-col items-center justify-center px-1">
                  <ArrowRight />
                  <span className="text-[9px] font-mono text-white/40 uppercase mt-1">
                    {item.arrow1Text}
                  </span>
                </div>

                <TripletTile
                  col={item.col2}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />

                <div className="flex flex-col items-center justify-center px-1">
                  <ArrowRight />
                  <span className="text-[9px] font-mono text-secondary uppercase mt-1">
                    {item.arrow2Text}
                  </span>
                </div>

                <TripletTile
                  col={item.col3}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />
              </div>

              {/* Vertical layout on mobile (< md) */}
              <div className="flex md:hidden flex-col items-center gap-3">
                <TripletTile
                  col={item.col1}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />
                <div className="flex items-center gap-2">
                  <ArrowDown />
                  <span className="text-[9px] font-mono text-white/40 uppercase">
                    {item.arrow1Text}
                  </span>
                </div>
                <TripletTile
                  col={item.col2}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />
                <div className="flex items-center gap-2">
                  <ArrowDown />
                  <span className="text-[9px] font-mono text-secondary uppercase">
                    {item.arrow2Text}
                  </span>
                </div>
                <TripletTile
                  col={item.col3}
                  setLabel={item.label}
                  onImageClick={() =>
                    setSelectedModalPlot({
                      url: item.fullPlotUrl,
                      title: item.fullPlotTitle,
                      subtitle: item.fullPlotSubtitle,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dialog for Full Comparison Plot */}
      {selectedModalPlot && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedModalPlot(null)}
        >
          <div
            className="relative w-[85vw] h-[85vh] max-w-6xl bg-[#05070D]/95 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0 border-b border-white/10 pb-4">
              <div>
                <h4 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-space-grotesk)]">
                  {selectedModalPlot.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {selectedModalPlot.subtitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedModalPlot(null)}
                className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/90 flex-1 flex items-center justify-center min-h-0 p-3">
              <Image
                src={selectedModalPlot.url}
                alt={selectedModalPlot.title}
                width={2048}
                height={1024}
                className="w-full h-full object-contain rounded-xl"
                unoptimized
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10 shrink-0">
              <span className="font-mono text-[11px] text-slate-400">
                Source: Empirical evaluation &amp; ground-truth validation dataset
              </span>
              <button
                onClick={() => setSelectedModalPlot(null)}
                className="px-5 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
