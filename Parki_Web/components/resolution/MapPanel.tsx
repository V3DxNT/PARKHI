"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppState, useAppDispatch, type TileResult } from "@/lib/store";
import { searchTiles, submitJob, streamJobProgress } from "@/lib/api";
import { LocationSearch } from "./LocationSearch";
import { SubscribeModal } from "./SubscribeModal";

/* Leaflet CSS is imported globally, Leaflet loaded dynamically */

const WMS_INSTANCE_ID = (process.env.NEXT_PUBLIC_COPERNICUS_INSTANCE_ID || "").trim();
const WMS_LAYER_ID = (process.env.NEXT_PUBLIC_COPERNICUS_LAYER_ID || "TRUE_COLOR").replace(/["']/g, "").trim();
const WMS_BASE_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${WMS_INSTANCE_ID}`;

function getAoiBboxString(geometry: GeoJSON.Geometry | null): string {
  if (!geometry) return "-180,-90,180,90";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geomWithBounds = geometry as any;
  if (geomWithBounds.bounds && typeof geomWithBounds.bounds.minLng === "number") {
    return `${geomWithBounds.bounds.minLng},${geomWithBounds.bounds.minLat},${geomWithBounds.bounds.maxLng},${geomWithBounds.bounds.maxLat}`;
  }
  if (geometry.type === "Polygon") {
    const coords = (geometry as GeoJSON.Polygon).coordinates[0];
    if (coords && coords.length > 0) {
      let minLng = coords[0][0];
      let maxLng = coords[0][0];
      let minLat = coords[0][1];
      let maxLat = coords[0][1];
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return `${minLng},${minLat},${maxLng},${maxLat}`;
    }
  }
  return "-180,-90,180,90";
}

function getTileWmsUrl(
  tile: { date: string; bounds?: [number, number, number, number] },
  aoiBbox: string,
  width = 512,
  height = 512
): string {
  // Always prioritize the user's drawn AOI bounding box so the preview exactly matches the map selection!
  let bbox = aoiBbox && aoiBbox !== "-180,-90,180,90" ? aoiBbox : "";
  if (!bbox) {
    if (tile.bounds && tile.bounds.length === 4) {
      bbox = `${tile.bounds[0]},${tile.bounds[1]},${tile.bounds[2]},${tile.bounds[3]}`;
    } else {
      bbox = "-180,-90,180,90";
    }
  }

  // Sentinel-2 has a 5-day orbit revisit interval. Querying a single exact calendar day
  // (e.g. TIME=2026-09-08/2026-09-08) returns black if the satellite passed on adjacent days (e.g. 2026-09-06).
  // A 5-day window around the tile acquisition date ensures Copernicus WMS resolves the actual overpass scene.
  let timeParam = `${tile.date}/${tile.date}`;
  try {
    const d = new Date(tile.date);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setDate(start.getDate() - 4);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      timeParam = `${start.toISOString().split("T")[0]}/${end.toISOString().split("T")[0]}`;
    }
  } catch {
    // fallback
  }

  return `${WMS_BASE_URL}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${WMS_LAYER_ID}&FORMAT=image/jpeg&TIME=${timeParam}&WIDTH=${width}&HEIGHT=${height}&CRS=CRS:84&BBOX=${bbox}&MAXCC=100`;
}

interface LeafletModules {
  L: typeof import("leaflet") | null;
  map: import("leaflet").Map | null;
}

interface AoiMetrics {
  widthMeters: number;
  heightMeters: number;
  pixelWidth: number;
  pixelHeight: number;
  areaSqKm: number;
}

const PATCH_METERS = 1280; // 128 pixels * 10m GSD (SEN2VENµS patch size: 1.28 km x 1.28 km)
const METERS_PER_DEG_LAT = 111320;

function computeFixedPatch(centerLat: number, centerLng: number) {
  const halfLat = (PATCH_METERS / 2) / METERS_PER_DEG_LAT;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const halfLng = (PATCH_METERS / 2) / (METERS_PER_DEG_LAT * (Math.abs(cosLat) > 0.0001 ? Math.abs(cosLat) : 1));

  let minLat = centerLat - halfLat;
  let maxLat = centerLat + halfLat;
  let minLng = centerLng - halfLng;
  let maxLng = centerLng + halfLng;

  // Clamping to valid coordinate space
  if (minLat < -90) minLat = -90;
  if (maxLat > 90) maxLat = 90;
  if (minLng < -180) minLng = -180;
  if (maxLng > 180) maxLng = 180;

  const geometry: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ]],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (geometry as any).bounds = {
    minLng,
    minLat,
    maxLng,
    maxLat,
  };

  const metrics: AoiMetrics = {
    widthMeters: PATCH_METERS,
    heightMeters: PATCH_METERS,
    pixelWidth: 128,
    pixelHeight: 128,
    areaSqKm: 1.6384,
  };

  return { geometry, metrics, bounds: { minLng, minLat, maxLng, maxLat }, centerLat, centerLng };
}

export function MapPanel() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletModules>({ L: null, map: null });
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [aoiMetrics, setAoiMetrics] = useState<AoiMetrics | null>(null);
  const [previewModalTile, setPreviewModalTile] = useState<TileResult | null>(null);
  const [forceRefresh, setForceRefresh] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const cancelStreamRef = useRef<(() => void) | null>(null);

  /* Initialize Leaflet */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapContainerRef.current) return;

      /* Fix default marker icons */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bengaluru Urban Reference
      const DEFAULT_ZOOM = 15;

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        zoomControl: true,
      });

      const copernicusWmsUrl = WMS_BASE_URL;

      /* Copernicus Sentinel Data WMS Layer */
      const copernicusLayer = L.tileLayer.wms(copernicusWmsUrl, {
        attribution: "&copy; Copernicus Sentinel Data",
        format: "image/png",
        layers: WMS_LAYER_ID,
        transparent: false,
        minZoom: 3,
        maxZoom: 19,
      });

      copernicusLayer.addTo(map);

      // Invalidate size once mounted and responsive to widescreen aspect ratio
      const timers = [100, 300, 600].map((delay) =>
        setTimeout(() => {
          map.invalidateSize();
        }, delay)
      );

      const handleResize = () => {
        map.invalidateSize();
      };
      window.addEventListener("resize", handleResize);

      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      /* Fixed 1.28km AOI Selector Layer Group */
      const aoiGroup = new L.FeatureGroup();
      map.addLayer(aoiGroup);

      let currentCenter = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
      let rectLayer: import("leaflet").Rectangle | null = null;
      let centerMarker: import("leaflet").Marker | null = null;

      const centerIcon = L.divIcon({
        className: "aoi-center-handle-icon",
        html: `
          <div style="
            width: 34px;
            height: 34px;
            margin-left: -17px;
            margin-top: -17px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background: #059669;
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            cursor: grab;
            color: white;
            transition: transform 0.15s ease;
          " title="Drag to reposition 1.28 km² patch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const renderFixedAoi = (lat: number, lng: number, commitToStore = true) => {
        currentCenter = { lat, lng };
        const patch = computeFixedPatch(lat, lng);
        const latLngBounds = L.latLngBounds(
          [patch.bounds.minLat, patch.bounds.minLng],
          [patch.bounds.maxLat, patch.bounds.maxLng]
        );

        if (!rectLayer) {
          rectLayer = L.rectangle(latLngBounds, {
            color: "#059669",
            weight: 2.5,
            fillColor: "#10B981",
            fillOpacity: 0.2,
          });
          rectLayer.addTo(aoiGroup);
          rectLayer.bindTooltip(
            "<b>1.28 km × 1.28 km (128×128px @ 10m)</b><br/><span style='font-size:11px;color:#059669;'>SEN2VENµS Native Patch</span><br/><span style='font-size:10px;opacity:0.8;'>Click map or drag handle to move</span>",
            { permanent: false, direction: "top", offset: [0, -10] }
          );

          // Direct rectangle dragging handlers
          let isDragging = false;
          let dragStartPos: import("leaflet").LatLng | null = null;
          let dragStartCenter: { lat: number; lng: number } | null = null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rectLayer.on("mousedown", (e: any) => {
            L.DomEvent.stopPropagation(e);
            isDragging = true;
            dragStartPos = e.latlng;
            dragStartCenter = { ...currentCenter };
            map.dragging.disable();
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const onMapMouseMove = (e: any) => {
            if (!isDragging || !dragStartPos || !dragStartCenter) return;
            const dLat = e.latlng.lat - dragStartPos.lat;
            const dLng = e.latlng.lng - dragStartPos.lng;
            const newLat = dragStartCenter.lat + dLat;
            const newLng = dragStartCenter.lng + dLng;
            renderFixedAoi(newLat, newLng, false);
          };

          const onMapMouseUp = () => {
            if (isDragging) {
              isDragging = false;
              map.dragging.enable();
              dragStartPos = null;
              dragStartCenter = null;
              renderFixedAoi(currentCenter.lat, currentCenter.lng, true);
            }
          };

          map.on("mousemove", onMapMouseMove);
          map.on("mouseup", onMapMouseUp);
          window.addEventListener("mouseup", onMapMouseUp);
        } else {
          rectLayer.setBounds(latLngBounds);
        }

        if (!centerMarker) {
          centerMarker = L.marker([lat, lng], {
            icon: centerIcon,
            draggable: true,
            zIndexOffset: 1000,
          });
          centerMarker.addTo(aoiGroup);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          centerMarker.on("drag", (e: any) => {
            const pos = e.target.getLatLng();
            renderFixedAoi(pos.lat, pos.lng, false);
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          centerMarker.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            renderFixedAoi(pos.lat, pos.lng, true);
          });
        } else {
          centerMarker.setLatLng([lat, lng]);
        }

        if (commitToStore) {
          setAoiMetrics(patch.metrics);
          dispatch({ type: "SET_AOI", geometry: patch.geometry, area: patch.metrics.areaSqKm });
        }
      };

      // Click map anywhere to reposition 1.28km patch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        renderFixedAoi(e.latlng.lat, e.latlng.lng, true);
      });

      // Recenter custom event
      const handleRecenterAoi = (e: Event) => {
        const customEvent = e as CustomEvent<{ lat: number; lng?: number; lon?: number }>;
        if (!customEvent.detail) return;
        const lat = customEvent.detail.lat;
        const lng = customEvent.detail.lng ?? customEvent.detail.lon;
        if (typeof lat === "number" && typeof lng === "number") {
          renderFixedAoi(lat, lng, true);
        }
      };
      window.addEventListener("recenterAoi", handleRecenterAoi);

      // Fly to location custom event
      const handleFlyTo = (e: Event) => {
        const customEvent = e as CustomEvent<{ lat: number; lon?: number; lng?: number }>;
        if (!customEvent.detail) return;
        const { lat, lon, lng } = customEvent.detail;
        const targetLon = lon ?? lng;

        if (typeof lat === "number" && typeof targetLon === "number" && !isNaN(lat) && !isNaN(targetLon)) {
          map.flyTo([lat, targetLon], 15, { duration: 1.5 });
          renderFixedAoi(lat, targetLon, true);
        }
      };
      window.addEventListener("flyToLocation", handleFlyTo);

      // Initial placement: default 1.28km patch at Bengaluru urban reference
      renderFixedAoi(DEFAULT_CENTER[0], DEFAULT_CENTER[1], true);

      leafletRef.current = { L, map };

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("recenterAoi", handleRecenterAoi);
        window.removeEventListener("flyToLocation", handleFlyTo);
        resizeObserver.disconnect();
        timers.forEach(clearTimeout);
      };
    })();

    return () => {
      cancelled = true;
      if (leafletRef.current.map) {
        leafletRef.current.map.remove();
        leafletRef.current.map = null;
      }
    };
  }, [dispatch]);

  /* Handler to center AOI to current map viewport center */
  const handleCenterOnMap = useCallback(() => {
    const map = leafletRef.current.map;
    if (!map) return;
    const center = map.getCenter();
    window.dispatchEvent(
      new CustomEvent("recenterAoi", {
        detail: { lat: center.lat, lng: center.lng },
      })
    );
  }, []);

  /* Derive metrics directly from local state without requiring global aoiGeometry */
  const activeMetrics = aoiMetrics && aoiMetrics.areaSqKm > 0 ? aoiMetrics : null;

  /* Extract bounding box from global state or local bounds for dynamic WMS tile previews */
  const bboxString = state.aoiGeometry
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.aoiGeometry as any).bounds
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${(state.aoiGeometry as any).bounds.minLng},${(state.aoiGeometry as any).bounds.minLat},${(state.aoiGeometry as any).bounds.maxLng},${(state.aoiGeometry as any).bounds.maxLat}`
      : getAoiBboxString(state.aoiGeometry)
    : "-180,-90,180,90";

  /* Close preview modal on Escape key */
  useEffect(() => {
    if (!previewModalTile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewModalTile(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalTile]);

  /* Tile search handler */
  const handleTileSearch = useCallback(async () => {
    if (!state.aoiGeometry) return;
    dispatch({ type: "SET_JOB_STATUS", status: "searching" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const tiles = await searchTiles(
        state.aoiGeometry,
        state.searchDateFrom || "2026-08-01",
        state.searchDateTo || "2026-08-15"
      );
      dispatch({ type: "SET_TILES", tiles });
      if (tiles.length > 0) {
        // Automatically select the tile with the least cloud coverage
        const sorted = [...tiles].sort((a, b) => a.cloudCover - b.cloudCover);
        dispatch({ type: "SELECT_TILE", tile: sorted[0] });
      }
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", error: (err as Error).message || "Tile search failed" });
      dispatch({ type: "SET_JOB_STATUS", status: "error" });
    }
  }, [state.aoiGeometry, state.searchDateFrom, state.searchDateTo, dispatch]);

  /* Enhance handler */
  const handleEnhance = useCallback(async () => {
    if (!state.selectedTile || !state.aoiGeometry) return;
    dispatch({ type: "SET_JOB_STATUS", status: "submitting" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const jobResp = await submitJob(state.selectedTile.tileId, state.aoiGeometry, true);

      // Temporarily bypass immediate cached return per user request to observe live generation
      // if (jobResp.cached && jobResp.result) { ... }

      dispatch({ type: "SET_JOB_STATUS", status: "processing" });

      /* Cancel any previous stream */
      if (cancelStreamRef.current) cancelStreamRef.current();

      cancelStreamRef.current = streamJobProgress(jobResp.jobId, {
        onProgress: (progress, label) => {
          dispatch({ type: "SET_JOB_PROGRESS", progress, label });
        },
        onComplete: (result) => {
          dispatch({ type: "SET_SR_RESULT", result });
        },
        onError: (error) => {
          dispatch({ type: "SET_ERROR", error });
          dispatch({ type: "SET_JOB_STATUS", status: "error" });
        },
      });
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", error: (err as Error).message || "Job submission failed" });
      dispatch({ type: "SET_JOB_STATUS", status: "error" });
    }
  }, [state.selectedTile, state.aoiGeometry, forceRefresh, dispatch]);

  return (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.15)] rounded-2xl transition-all overflow-visible text-slate-800 relative z-20">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-white/60 rounded-t-2xl">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Fixed-Dimension AOI Selector
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCenterOnMap}
            type="button"
            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Center 1.28 km patch to current map view"
            id="center-aoi-btn"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
            <span>Center on Screen</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSubscribeModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            id="subscribe-aoi-header-btn"
            title="Subscribe to automated email surveillance reports for this AOI"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Email Alerts</span>
          </button>

          {state.aoiArea !== null && (
            <span className="text-xs font-[family-name:var(--font-jetbrains-mono)] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
              {state.aoiArea.toFixed(2)} km²
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 relative z-30 overflow-visible bg-white/40 backdrop-blur-md">
        <LocationSearch />
      </div>

      {/* AOI Metrics & Model Constraints Container (Anti-Layout-Shift with min-h-[60px]) */}
      <div className="px-5 py-3 border-b border-slate-200/80 min-h-[60px] flex flex-col justify-center bg-white/30 backdrop-blur-xs transition-all relative z-20 overflow-visible">
        {activeMetrics ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Metric Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                Area: <span className="font-semibold text-slate-900">{activeMetrics.areaSqKm < 1 ? activeMetrics.areaSqKm.toFixed(3) : activeMetrics.areaSqKm.toFixed(2)} sq km</span>
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                Ground: <span className="font-semibold text-slate-900">{Math.round(activeMetrics.widthMeters).toLocaleString()}m x {Math.round(activeMetrics.heightMeters).toLocaleString()}m</span>
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs font-mono">
                Model Input: <span className="font-semibold text-slate-900">{activeMetrics.pixelWidth} x {activeMetrics.pixelHeight} px</span>
              </span>
            </div>

            {/* Post-Selection Model Constraint Status */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>Native SEN2VENµS 128×128 Patch</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            <span>Click or drag the 1.28 km × 1.28 km patch over your area of interest.</span>
          </div>
        )}
      </div>

      {/* Map container with widescreen 16:9 aspect ratio and soft edges */}
      <div className="p-3.5 sm:p-5">
        <div className="w-full aspect-video relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-md bg-slate-100 z-10">
          <div ref={mapContainerRef} className="w-full h-full" id="leaflet-map" />
        </div>
      </div>

      {/* Tile search controls */}
      <div className="px-5 py-5 border-t border-slate-200/80 space-y-4 bg-white/50 rounded-b-2xl flex flex-col">
        <div className="w-full flex flex-wrap items-center justify-center gap-3 mt-1">
          <button
            onClick={handleTileSearch}
            disabled={!state.aoiGeometry || state.jobStatus === "searching"}
            className="px-8 py-3 rounded-xl text-base sm:text-lg font-semibold tracking-wide bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-emerald-600/35 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5 cursor-pointer"
            id="search-tiles-btn"
          >
            {state.jobStatus === "searching" ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span>Search Available Imagery</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSubscribeModal(true)}
            className="px-6 py-3 rounded-xl text-base sm:text-lg font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm hover:shadow-md active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer"
            id="subscribe-aoi-btn-main"
            title="Subscribe this AOI to receive automated super-resolution reports via email"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Email / Subscribe AOI</span>
          </button>
        </div>

        {/* Tile results - maximum 3 images with least cloud coverage */}
        {state.tiles.length > 0 && (() => {
          const displayedTiles = [...state.tiles]
            .sort((a, b) => a.cloudCover - b.cloudCover)
            .slice(0, 3);

          return (
            <div className="w-full space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Available Tiles ({displayedTiles.length})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 normal-case tracking-normal">
                    Least Cloud Coverage
                  </span>
                </h3>
                {state.tiles.length > 3 && (
                  <span className="text-[11px] text-slate-400">
                    Top 3 of {state.tiles.length} scenes
                  </span>
                )}
              </div>
              <div className="w-full flex gap-3 overflow-x-auto pb-2 pt-0.5">
                {displayedTiles.map((tile) => {
                  const imageUrl = getTileWmsUrl(tile, bboxString, 512, 512);
                  console.log("WMS Request URL:", imageUrl);

                return (
                  <button
                    key={tile.tileId}
                    onClick={() => {
                      dispatch({ type: "SELECT_TILE", tile });
                      setPreviewModalTile(tile);
                    }}
                    className={`group relative shrink-0 rounded-2xl border text-left transition-all duration-200 w-44 overflow-hidden flex flex-col cursor-pointer ${
                      state.selectedTile?.tileId === tile.tileId
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30 text-emerald-900 font-medium"
                        : "border-slate-200/80 bg-white/90 hover:bg-white hover:border-slate-300 text-slate-700 shadow-xs"
                    }`}
                    id={`tile-${tile.tileId}`}
                    title="Click to select and view enlarged preview"
                  >
                    {/* Sentinel-2 WMS Thumbnail with fallback */}
                    <div className="w-full h-40 relative bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`Sentinel-2 tile ${tile.date}`}
                        className="w-full h-40 object-cover rounded-t-xl bg-slate-100 transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Display local fallback placeholder if WMS service times out
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/sample-lr-clean.jpeg";
                        }}
                        loading="lazy"
                      />
                      {/* Hover enlarge indicator overlay */}
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-lg bg-white/95 text-slate-900 text-[11px] font-semibold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                            <path d="M11 8v6" />
                            <path d="M8 11h6" />
                          </svg>
                          Enlarge
                        </span>
                      </div>
                    </div>
                    <div className="p-3 w-full">
                      <div className="text-xs font-semibold text-slate-900 truncate">{tile.date}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={tile.cloudCover < 15 ? "text-emerald-600" : tile.cloudCover < 30 ? "text-amber-600" : "text-rose-600"}
                        >
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                        </svg>
                        <span
                          className={`text-[11px] font-[family-name:var(--font-jetbrains-mono)] font-medium ${
                            tile.cloudCover < 15 ? "text-emerald-600" : tile.cloudCover < 30 ? "text-amber-600" : "text-rose-600"
                          }`}
                        >
                          {tile.cloudCover}% cloud
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {state.selectedTile && (
              <div className="w-full flex flex-col items-center gap-3 mt-4">
                <button
                  onClick={handleEnhance}
                  disabled={state.jobStatus === "submitting" || state.jobStatus === "processing"}
                  className="px-8 py-3 rounded-xl text-base sm:text-lg font-semibold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:opacity-95 hover:shadow-emerald-600/35 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5"
                  id="enhance-btn"
                >
                  {state.jobStatus === "submitting" || state.jobStatus === "processing" ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>{state.jobStatus === "submitting" ? "Submitting..." : "Enhancing..."}</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                        <path d="m14 7 3 3" />
                      </svg>
                      <span>Enhance This Tile</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })()}
      </div>

      {/* Preview Modal for enlarged Sentinel-2 imagery */}
      {previewModalTile && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewModalTile(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Sentinel-2 Imagery Preview</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    Copernicus WMS
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-[family-name:var(--font-jetbrains-mono)]">
                  {previewModalTile.tileId}
                </p>
              </div>
              <button
                onClick={() => setPreviewModalTile(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Enlarged Image Preview (1024x1024 GetMap) */}
            <div className="relative w-full aspect-square sm:aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getTileWmsUrl(previewModalTile, bboxString, 1024, 1024)}
                alt={`Sentinel-2 preview ${previewModalTile.date}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/sample-lr-clean.jpeg";
                }}
              />
            </div>

            {/* Modal Details & Actions Footer */}
            <div className="p-5 sm:p-6 bg-slate-50/90 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Acquisition Date</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{previewModalTile.date}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Cloud Cover</div>
                  <div className={`font-semibold mt-0.5 ${previewModalTile.cloudCover < 15 ? "text-emerald-600" : "text-amber-600"}`}>
                    {previewModalTile.cloudCover}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">WMS Layer</div>
                  <div className="font-semibold text-slate-800 mt-0.5">True Color (L2A)</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">AOI Area</div>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {activeMetrics ? `${activeMetrics.areaSqKm.toFixed(2)} km²` : "Drawn Bounds"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={getTileWmsUrl(previewModalTile, bboxString, 1024, 1024)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Raw WMS</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button
                  onClick={() => {
                    dispatch({ type: "SELECT_TILE", tile: previewModalTile });
                    setPreviewModalTile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  Select This Tile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Surveillance Subscription Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
      />
    </div>
  );
}
