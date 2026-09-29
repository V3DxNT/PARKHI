"use client";

import { useCallback, useState } from "react";
import { useAppState, useAppDispatch } from "@/lib/store";
import { runAnalysis } from "@/lib/api";

const ANALYSIS_MODES = [
  {
    key: "crop" as const,
    label: "Crop Analysis",
    description: "NDVI-based crop type classification",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    needsSecondDate: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5 0.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>
    ),
  },
  {
    key: "urban" as const,
    label: "Urban Analysis",
    description: "Built-up area segmentation & land use",
    color: "from-sky-500 to-blue-500",
    bgColor: "bg-sky-500/10",
    textColor: "text-sky-400",
    borderColor: "border-sky-500/30",
    needsSecondDate: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" />
        <path d="M16 6h.01" />
        <path d="M12 6h.01" />
        <path d="M12 10h.01" />
        <path d="M12 14h.01" />
        <path d="M16 10h.01" />
        <path d="M16 14h.01" />
        <path d="M8 10h.01" />
        <path d="M8 14h.01" />
      </svg>
    ),
  },
  {
    key: "disaster" as const,
    label: "Change & Detection",
    description: "Building change detection & structural impact",
    color: "from-rose-500 to-amber-500",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-400",
    borderColor: "border-rose-500/30",
    needsSecondDate: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
        <path d="m7.5 10.5 2 2" />
        <path d="m10.5 7.5 2 2" />
        <path d="m13.5 4.5 2 2" />
        <path d="m4.5 13.5 2 2" />
      </svg>
    ),
  },
];

/* Modal for historical Before Date & Time input (SR image serves as After state) */
function SecondDateModal({
  mode,
  onSubmit,
  onCancel,
}: {
  mode: string;
  onSubmit: (dateTime: string) => void;
  onCancel: () => void;
}) {
  // Default to 7 days prior at 10:30 (typical Sentinel-2 sun-synchronous pass)
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(10, 30, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [beforeDateTime, setBeforeDateTime] = useState<string>(getDefaultDateTime);

  const applyOffsetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(10, 30, 0, 0);
    setBeforeDateTime(d.toISOString().slice(0, 16));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-6 max-w-md w-full text-slate-200">
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-white mb-2 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <circle cx="12" cy="15" r="2" />
          </svg>
          Select Pre-Event Baseline Date &amp; Time
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Building detection and disaster damage assessment compares the selected historical baseline acquisition against the current Super-Resolved (SR) scene.
        </p>

        {/* Quick Presets */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Quick Baseline Presets</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "7 Days Prior", days: 7 },
              { label: "15 Days Prior", days: 15 },
              { label: "30 Days Prior", days: 30 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyOffsetDays(p.days)}
                className="text-xs py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 font-medium transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Time Picker */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
            <span>Baseline Date &amp; Time</span>
            <span className="text-[10px] text-cyan-400 font-normal">UTC / Local</span>
          </label>
          <input
            type="datetime-local"
            value={beforeDateTime}
            onChange={(e) => setBeforeDateTime(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-sm"
            id="before-datetime-input"
          />
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => beforeDateTime && onSubmit(beforeDateTime)}
            disabled={!beforeDateTime}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 px-5 py-2 text-sm font-bold text-slate-950 transition-all disabled:opacity-40 shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <span>Run Detection &amp; Assessment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnalysisRow() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [secondDateModal, setSecondDateModal] = useState<string | null>(null);

  const executeAnalysis = useCallback(
    async (mode: "crop" | "urban" | "disaster", compareDate?: string) => {
      if (!state.srResult) return;
      dispatch({ type: "SET_ANALYSIS_LOADING", mode, loading: true });
      dispatch({ type: "SET_ERROR", error: null });

      try {
        const result = await runAnalysis(
          state.srResult.jobId,
          mode,
          compareDate
        );
        if (compareDate && !result.beforeDate) {
          result.beforeDate = compareDate;
        }
        dispatch({ type: "SET_ANALYSIS_RESULT", mode, result });
      } catch (err: unknown) {
        dispatch({
          type: "SET_ERROR",
          error: (err as Error).message || `${mode} analysis failed`,
        });
      } finally {
        dispatch({ type: "SET_ANALYSIS_LOADING", mode, loading: false });
      }
    },
    [state.srResult, state.aoiGeometry, dispatch]
  );

  const handleAnalysis = useCallback(
    (mode: "crop" | "urban" | "disaster") => {
      const cfg = ANALYSIS_MODES.find((m) => m.key === mode);
      if (cfg?.needsSecondDate) {
        setSecondDateModal(mode);
      } else {
        executeAnalysis(mode);
      }
    },
    [executeAnalysis]
  );

  const handleSecondDateSubmit = useCallback(
    (compareDate: string) => {
      if (secondDateModal) {
        executeAnalysis(secondDateModal as "crop" | "urban" | "disaster", compareDate);
        setSecondDateModal(null);
      }
    },
    [secondDateModal, executeAnalysis]
  );

  const isDisabled = !state.srResult;

  return (
    <>
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl transition-all p-6 text-slate-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-white tracking-wide uppercase">
            Downstream Spectral Intelligence
          </h3>
          {isDisabled && (
            <span className="text-[11px] text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded-full px-3 py-0.5 font-medium">
              Enhance a tile first to unlock
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ANALYSIS_MODES.map((mode) => {
            const isLoading = state.analysisLoading[mode.key];
            const hasResult = !!state.analysisResults[mode.key];

            return (
              <button
                key={mode.key}
                onClick={() => handleAnalysis(mode.key)}
                disabled={isDisabled || isLoading}
                className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 group ${isDisabled
                    ? "opacity-40 cursor-not-allowed border-slate-800/60 bg-slate-900/30"
                    : hasResult
                      ? `${mode.borderColor} ${mode.bgColor} shadow-sm`
                      : "border-slate-800/80 bg-slate-900/40 backdrop-blur-sm hover:border-cyan-500/50 hover:bg-slate-800/60 hover:-translate-y-0.5 shadow-xs"
                  }`}
                id={`analysis-${mode.key}`}
              >
                {/* Gradient top bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mode.color} ${isDisabled ? "opacity-20" : ""
                    }`}
                />

                <div className="flex items-start gap-3 pt-1">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${hasResult ? mode.bgColor : "bg-slate-800/80 group-hover:bg-slate-700/80"
                      } transition-colors ${hasResult ? mode.textColor : "text-slate-300"}`}
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      mode.icon
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      {mode.label}
                      {hasResult && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Second-date modal */}
      {secondDateModal && (
        <SecondDateModal
          mode={secondDateModal}
          onSubmit={handleSecondDateSubmit}
          onCancel={() => setSecondDateModal(null)}
        />
      )}
    </>
  );
}
