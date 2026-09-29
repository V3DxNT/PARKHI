"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { AppStateProvider, useAppDispatch } from "@/lib/store";
import { MapPanel } from "@/components/resolution/MapPanel";
import { ResultPanel } from "@/components/resolution/ResultPanel";
import { AnalysisRow } from "@/components/resolution/AnalysisRow";

function ResolutionContent() {
  const dispatch = useAppDispatch();

  const handleVoiceCommand = useCallback(
    (command: string) => {
      if (command.includes("search") || command.includes("find")) {
        const btn = document.getElementById("search-tiles-btn");
        if (btn) btn.click();
      } else if (command.includes("enhance") || command.includes("super resolution")) {
        const btn = document.getElementById("enhance-btn");
        if (btn) btn.click();
      } else if (command.includes("swipe") || command.includes("compare")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "swipe" });
      } else if (command.includes("uncertainty")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "uncertainty" });
      } else if (command.includes("side by side") || command.includes("side-by-side")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "sidebyside" });
      } else if (command.includes("urban") || command.includes("city")) {
        const btn = document.getElementById("analysis-urban");
        if (btn) btn.click();
      } else if (command.includes("crop") || command.includes("agriculture")) {
        const btn = document.getElementById("analysis-crop");
        if (btn) btn.click();
      } else if (command.includes("disaster") || command.includes("damage")) {
        const btn = document.getElementById("analysis-disaster");
        if (btn) btn.click();
      }
    },
    [dispatch]
  );

  /* Listen for voice commands emitted from inline VoiceCommand in LocationSearch */
  useEffect(() => {
    const handleVoiceEvent = (e: Event) => {
      const command = (e as CustomEvent).detail;
      if (typeof command === "string") {
        handleVoiceCommand(command);
      }
    };
    window.addEventListener("voiceCommand", handleVoiceEvent);
    return () => window.removeEventListener("voiceCommand", handleVoiceEvent);
  }, [handleVoiceCommand]);

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pt-28 pb-24"
    >
      {/* Main container structured top-to-bottom */}
      <div className="w-[70vw] mx-auto space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Super-Resolution Studio
              </h1>
              <span className="text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                Sentinel-2 → Sub-4m
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Interactive high-precision satellite super-resolution & downstream geospatial analytics pipeline
            </p>
          </div>
        </div>

        {/* 1. FIRST: AOI Selection Map Section (w-[70vw] container) */}
        <section id="section-aoi" className="w-full scroll-mt-28">
          <MapPanel />
        </section>

        {/* 2. SECOND: Super-Resolution Result Section */}
        <section id="section-result" className="w-full scroll-mt-28">
          <ResultPanel />
        </section>

        {/* 3. THIRD: Advanced Analysis Section */}
        <section id="section-analysis" className="w-full">
          <AnalysisRow />
        </section>
      </div>
    </motion.main>
  );
}

export default function ResolutionPage() {
  return (
    <AppStateProvider>
      <ResolutionContent />
    </AppStateProvider>
  );
}
