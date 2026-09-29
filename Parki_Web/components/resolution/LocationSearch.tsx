"use client";

import { useState } from "react";
import { VoiceCommand } from "./VoiceCommand";

export function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [loading, setLoading] = useState(false);

  const executeSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&limit=5`
      );
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    executeSearch(query);
  };

  const handleVoiceCommand = (spokenText: string) => {
    /* 1. Broadcast global command event for resolution controls (e.g. enhance, crop, urban, disaster) */
    window.dispatchEvent(new CustomEvent("voiceCommand", { detail: spokenText }));

    /* 2. Update search input & trigger location query */
    setQuery(spokenText);
    executeSearch(spokenText);
  };

  const handleSelect = (result: { lat: string; lon: string }) => {
    /* Dispatch a custom browser event containing the coordinates */
    window.dispatchEvent(
      new CustomEvent("flyToLocation", {
        detail: {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
        },
      })
    );
    setResults([]);
    setQuery("");
  };

  return (
    <div className="relative z-50 w-full max-w-md">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Search location..."
          className="w-72 sm:w-80 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 px-3.5 py-2 text-sm outline-none transition-all"
          id="location-search"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20"
          id="location-search-btn"
          title="Search location"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          )}
        </button>
        <VoiceCommand onCommand={handleVoiceCommand} />
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <ul className="absolute z-[9999] top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-slate-800 hover:bg-emerald-50/60 transition-colors border-b border-slate-100/80 last:border-b-0"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
