/**
 * Interactive AOI Map Selector Component for Parkhi Mobile
 * High-performance Leaflet + Copernicus WMS embedded map via WebView
 * with Nominatim place search, bounding box calculation, ground metrics, and surveillance subscription.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch } from "../../lib/store";
import { searchLocationNominatim, WMS_BASE_URL, WMS_LAYER_ID } from "../../lib/api";
import { SubscribeModal } from "./SubscribeModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PRESET_LOCATIONS = [
  { name: "Bangalore", lat: 12.9716, lon: 77.5946, label: "Agri-Tech Zone" },
  { name: "Delhi NCR", lat: 28.6139, lon: 77.2090, label: "Urban Sprawl" },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777, label: "Coastal Basin" },
  { name: "Punjab", lat: 30.9010, lon: 75.8573, label: "Wheat Fields" },
];

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

  if (minLat < -90) minLat = -90;
  if (maxLat > 90) maxLat = 90;
  if (minLng < -180) minLng = -180;
  if (maxLng > 180) maxLng = 180;

  return { minLat, maxLat, minLng, maxLng };
}

export function MapSelector() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const webViewRef = useRef<WebView>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchLocationNominatim(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (lat: number, lon: number, name: string) => {
    setSearchResults([]);
    setSearchQuery(name);

    const patch = computeFixedPatch(lat, lon);

    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [patch.minLng, patch.minLat],
          [patch.maxLng, patch.minLat],
          [patch.maxLng, patch.maxLat],
          [patch.minLng, patch.maxLat],
          [patch.minLng, patch.minLat],
        ],
      ],
      bounds: { minLng: patch.minLng, minLat: patch.minLat, maxLng: patch.maxLng, maxLat: patch.maxLat },
    };

    dispatch({
      type: "SET_AOI",
      geometry,
      area: 1.6384,
      metrics: {
        widthMeters: 1280,
        heightMeters: 1280,
        pixelWidth: 128,
        pixelHeight: 128,
        areaSqKm: 1.6384,
      },
    });

    const script = `if (window.map) { window.map.flyTo([${lat}, ${lon}], 14); } true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #05070D; }
          .leaflet-control-attribution { font-size: 8px; background: rgba(0,0,0,0.75) !important; color: #94A3B8 !important; padding: 2px 6px; }
          .leaflet-control-attribution a { color: #38BDF8 !important; text-decoration: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            center: [12.9716, 77.5946],
            zoom: 14,
            minZoom: 3,
            maxZoom: 19,
            zoomControl: false
          });

          var copernicusWmsUrl = '${WMS_BASE_URL}';
          var copernicusLayer = L.tileLayer.wms(copernicusWmsUrl, {
            attribution: '&copy; Copernicus Sentinel Data',
            format: 'image/png',
            layers: '${WMS_LAYER_ID}',
            transparent: false,
            minZoom: 3,
            maxZoom: 19
          });
          copernicusLayer.addTo(map);

          var PATCH_METERS = 1280;
          var METERS_PER_DEG_LAT = 111320;

          function computePatch(centerLat, centerLng) {
            var halfLat = (PATCH_METERS / 2) / METERS_PER_DEG_LAT;
            var cosLat = Math.cos((centerLat * Math.PI) / 180);
            var halfLng = (PATCH_METERS / 2) / (METERS_PER_DEG_LAT * (Math.abs(cosLat) > 0.0001 ? Math.abs(cosLat) : 1));
            return {
              minLat: Math.max(-90, centerLat - halfLat),
              maxLat: Math.min(90, centerLat + halfLat),
              minLng: Math.max(-180, centerLng - halfLng),
              maxLng: Math.min(180, centerLng + halfLng)
            };
          }

          var initialPatch = computePatch(12.9716, 77.5946);
          var rect = L.rectangle([
            [initialPatch.minLat, initialPatch.minLng],
            [initialPatch.maxLat, initialPatch.maxLng]
          ], {
            color: '#059669',
            weight: 2.5,
            fillColor: '#10B981',
            fillOpacity: 0.25
          }).addTo(map);

          function updateAoi() {
            var center = map.getCenter();
            var patch = computePatch(center.lat, center.lng);
            rect.setBounds([
              [patch.minLat, patch.minLng],
              [patch.maxLat, patch.maxLng]
            ]);

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'BOUNDS_CHANGED',
                center: [center.lat, center.lng],
                minLat: patch.minLat,
                maxLat: patch.maxLat,
                minLng: patch.minLng,
                maxLng: patch.maxLng
              }));
            }
          }

          map.on('move', function() {
            var center = map.getCenter();
            var patch = computePatch(center.lat, center.lng);
            rect.setBounds([
              [patch.minLat, patch.minLng],
              [patch.maxLat, patch.maxLng]
            ]);
          });

          map.on('moveend', updateAoi);

          // Initial push
          setTimeout(updateAoi, 400);
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "BOUNDS_CHANGED") {
        const geometry = {
          type: "Polygon",
          coordinates: [
            [
              [data.minLng, data.minLat],
              [data.maxLng, data.minLat],
              [data.maxLng, data.maxLat],
              [data.minLng, data.maxLat],
              [data.minLng, data.minLat],
            ],
          ],
          bounds: {
            minLng: data.minLng,
            minLat: data.minLat,
            maxLng: data.maxLng,
            maxLat: data.maxLat,
          },
        };
        dispatch({
          type: "SET_AOI",
          geometry,
          area: 1.6384,
          metrics: {
            widthMeters: 1280,
            heightMeters: 1280,
            pixelWidth: 128,
            pixelHeight: 128,
            areaSqKm: 1.6384,
          },
        });
      }
    } catch {}
  };

  const activeMetrics = state.aoiMetrics;

  return (
    <View style={styles.card}>
      {/* Header Bar */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={17} color="#0EA5E9" />
          <Text style={styles.cardTitle}>AOI Spatial Bounding Box</Text>
        </View>

        <View style={styles.headerActions}>
          {state.aoiArea !== null && (
            <View style={styles.areaBadge}>
              <Text style={styles.areaBadgeText}>{state.aoiArea.toFixed(2)} km²</Text>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowSubscribeModal(true)}
            style={styles.subscribeBtn}
          >
            <Ionicons name="notifications-outline" size={12} color="#10B981" />
            <Text style={styles.subscribeBtnText}>Surveillance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#64748B" style={{ marginLeft: 10 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search city, district, or landmark..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#0EA5E9" style={{ marginRight: 10 }} />
          ) : (
            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Find</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <View style={styles.dropdown}>
            {searchResults.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() =>
                  handleSelectLocation(
                    parseFloat(item.lat),
                    parseFloat(item.lon),
                    item.display_name.split(",")[0]
                  )
                }
                style={styles.dropdownItem}
              >
                <Ionicons name="pin" size={13} color="#0EA5E9" />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Presets Row */}
        <View style={styles.presetsRow}>
          {PRESET_LOCATIONS.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              onPress={() => handleSelectLocation(preset.lat, preset.lon, preset.name)}
              style={styles.presetChip}
            >
              <Text style={styles.presetName}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Model Constraints & Ground Metrics Bar */}
      {activeMetrics && (
        <View style={styles.metricsBar}>
          <View style={styles.metricsBadges}>
            <View style={styles.mBadge}>
              <Text style={styles.mBadgeLabel}>Extent:</Text>
              <Text style={styles.mBadgeVal}>
                {(activeMetrics.widthMeters / 1000).toFixed(2)}km × {(activeMetrics.heightMeters / 1000).toFixed(2)}km
              </Text>
            </View>
            <View style={styles.mBadge}>
              <Text style={styles.mBadgeLabel}>Tensors:</Text>
              <Text style={styles.mBadgeVal}>{activeMetrics.pixelWidth} × {activeMetrics.pixelHeight} px</Text>
            </View>
          </View>

          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.statusText}>SEN2VENµS 128px Patch</Text>
          </View>
        </View>
      )}

      {/* Embedded Leaflet Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          onMessage={handleMessage}
          style={styles.mapWebView}
          scrollEnabled={false}
        />
        <View style={styles.mapOverlayHint}>
          <Ionicons name="move" size={11} color="#E2E8F0" />
          <Text style={styles.mapOverlayText}>Pan map to reposition AOI target</Text>
        </View>
      </View>

      {/* Subscribe Modal */}
      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 14,
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  areaBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  areaBadgeText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#38BDF8",
  },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subscribeBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
  searchSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#FFFFFF",
  },
  searchBtn: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  searchBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dropdown: {
    backgroundColor: "#0B1120",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    overflow: "hidden",
    maxHeight: 140,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  dropdownText: {
    fontSize: 11,
    color: "#E2E8F0",
    flex: 1,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
  },
  presetChip: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presetName: {
    fontSize: 10,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  metricsBadges: {
    flexDirection: "row",
    gap: 8,
  },
  mBadge: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  mBadgeLabel: {
    fontSize: 9,
    color: "#64748B",
    fontFamily: "monospace",
  },
  mBadgeVal: {
    fontSize: 10,
    color: "#38BDF8",
    fontFamily: "monospace",
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    color: "#10B981",
    fontWeight: "600",
  },
  mapContainer: {
    height: 250,
    position: "relative",
    backgroundColor: "#05070D",
  },
  mapWebView: {
    flex: 1,
    backgroundColor: "#05070D",
  },
  mapOverlayHint: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  mapOverlayText: {
    fontSize: 9,
    color: "#E2E8F0",
    fontWeight: "600",
  },
});
