"use client";

import { useEffect } from "react";
import { useAppState, useAppDispatch } from "@/lib/store";
import { getLLMSummary } from "@/lib/api";

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-slate-200">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700/60">$1</code>');
}

function renderMarkdownBlock(block: string, key: number) {
  const trimmed = block.trim();
  if (trimmed.startsWith("### ")) {
    return (
      <h4 key={key} className="text-xs font-bold text-cyan-400 uppercase tracking-wider mt-3 mb-1">
        {trimmed.replace(/^###\s+/, "")}
      </h4>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h3 key={key} className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-1 mt-2 mb-1">
        {trimmed.replace(/^##\s+/, "")}
      </h3>
    );
  }

  const lines = trimmed.split("\n");
  const isList = lines.every((line) => line.trim().startsWith("- ") || line.trim().match(/^\d+\.\s/));
  if (isList) {
    return (
      <ul key={key} className="space-y-1.5 pl-4 list-disc text-slate-300 text-sm">
        {lines.map((l, idx) => {
          const content = l.replace(/^[-*]\s+|\d+\.\s+/, "");
          return <li key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />;
        })}
      </ul>
    );
  }

  return (
    <p
      key={key}
      className="text-slate-300 leading-relaxed text-sm"
      dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
    />
  );
}

export function LLMSummaryPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  /* Auto-fetch summary when SR result is available */
  useEffect(() => {
    if (state.srResult && !state.llmSummary && !state.llmLoading) {
      dispatch({ type: "SET_LLM_LOADING", loading: true });
      getLLMSummary(state.srResult.jobId)
        .then((summary) => {
          dispatch({ type: "SET_LLM_SUMMARY", summary });
        })
        .catch(() => {
          /* Silently fail — LLM summary is optional */
        })
        .finally(() => {
          dispatch({ type: "SET_LLM_LOADING", loading: false });
        });
    }
  }, [state.srResult, state.llmSummary, state.llmLoading, dispatch]);

  if (!state.srResult) return null;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-white flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
          AI Geospatial Intelligence Summary
        </h3>
        <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
          Automated Synthesis
        </span>
      </div>

      <div>
        {state.llmLoading ? (
          <div className="flex items-center gap-3 py-6 justify-center">
            <svg className="animate-spin h-5 w-5 text-cyan-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-slate-400">Generating analytical summary...</span>
          </div>
        ) : state.llmSummary ? (
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            {state.llmSummary.split("\n\n").map((para, i) => renderMarkdownBlock(para, i))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic text-center py-4">
            Analysis summary will appear after enhancement completes.
          </div>
        )}
      </div>
    </div>
  );
}
