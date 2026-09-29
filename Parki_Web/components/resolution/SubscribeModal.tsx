"use client";

import React, { useState, useId } from "react";
import { useAppState } from "@/lib/store";
import { subscribeAOI, type SubscribeResponse } from "@/lib/api";

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional override if opened from a specific context
  customCoords?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export function SubscribeModal({ isOpen, onClose, customCoords }: SubscribeModalProps) {
  const state = useAppState();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SubscribeResponse | null>(null);

  const emailInputId = useId();

  if (!isOpen) return null;

  // Resolve bounding box coordinates
  let minLat = 12.9658;
  let maxLat = 12.9774;
  let minLon = 77.5887;
  let maxLon = 77.6005;

  if (customCoords) {
    minLat = customCoords.minLat;
    maxLat = customCoords.maxLat;
    minLon = customCoords.minLon;
    maxLon = customCoords.maxLon;
  } else if (state.aoiGeometry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gAny = state.aoiGeometry as any;
    if (gAny.bounds && typeof gAny.bounds.minLat === "number") {
      minLat = gAny.bounds.minLat;
      maxLat = gAny.bounds.maxLat;
      minLon = gAny.bounds.minLng;
      maxLon = gAny.bounds.maxLng;
    } else if (state.aoiGeometry.type === "Polygon") {
      const coords = (state.aoiGeometry as GeoJSON.Polygon).coordinates[0];
      if (coords && coords.length > 0) {
        minLon = coords[0][0];
        maxLon = coords[0][0];
        minLat = coords[0][1];
        maxLat = coords[0][1];
        for (const [lon, lat] of coords) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  } else if (state.selectedTile?.bounds && state.selectedTile.bounds.length === 4) {
    minLon = state.selectedTile.bounds[0];
    minLat = state.selectedTile.bounds[1];
    maxLon = state.selectedTile.bounds[2];
    maxLat = state.selectedTile.bounds[3];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await subscribeAOI({
        email: trimmedEmail,
        min_lat: minLat,
        max_lat: maxLat,
        min_lon: minLon,
        max_lon: maxLon,
        geometry: state.aoiGeometry || undefined,
        jobId: state.srResult?.jobId,
        tileId: state.selectedTile?.tileId,
      });
      setSuccessResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to register email subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setError(null);
    setSuccessResult(null);
    setEmail("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={handleResetAndClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Area Surveillance Alerts
              </h3>
              <p className="text-xs text-slate-400">
                Automated periodic Sentinel-2 intelligence reports sent directly to your inbox
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* AOI Coordinate Inspection Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" x2="9" y1="3" y2="18" />
                  <line x1="15" x2="15" y1="6" y2="21" />
                </svg>
                Active AOI Selection Bounds
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                1.28 × 1.28 km (Native SEN2VENµS)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Latitude Bounds</span>
                <span className="text-slate-200 font-semibold">{minLat.toFixed(5)}° → {maxLat.toFixed(5)}°</span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-sans">Longitude Bounds</span>
                <span className="text-slate-200 font-semibold">{minLon.toFixed(5)}° → {maxLon.toFixed(5)}°</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-captured from your active map viewport and bounding box.</span>
            </div>
          </div>

          {/* Success State */}
          {successResult ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-300">Initial Dossier Dispatched & Surveillance Active</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    An initial PDF report containing current GeoTIFF values has been emailed to{" "}
                    <span className="text-emerald-300 font-semibold">{successResult.email}</span>. Recurring surveillance reports will follow every 3 hours.
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono pt-1">
                    Subscription ID: {successResult.subscriptionId}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Subscription Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor={emailInputId} className="block text-xs font-medium text-slate-300">
                  Recipient Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    id={emailInputId}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. analyst@isro.gov.in or name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* What will be included */}
              <div className="rounded-xl bg-slate-950/40 border border-slate-800/80 p-3 space-y-1.5 text-xs text-slate-400">
                <div className="text-slate-300 font-medium text-[11px] uppercase tracking-wider">
                  Report Contents (PDF Attachment):
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> Instant Initial PDF Email
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> Current GeoTIFF Values
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> 5m Super-Resolved Visual
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> Uncertainty Heatmap & Metrics
                  </li>
                </ul>
                <p className="text-[10px] text-emerald-400/90 pt-0.5 font-medium">
                  An initial PDF dossier is sent immediately to your email upon subscribing.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer"
                  id="submit-subscribe-btn"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      <span>Subscribe to Email Reports</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
