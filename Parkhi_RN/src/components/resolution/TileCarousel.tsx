/**
 * Sentinel-2 Available Tiles Carousel Component for Parkhi Mobile
 * Renders date range info, Copernicus tile query trigger, tile cards with cloud cover badges,
 * scene inspector modal, force refresh toggle, and the 'Enhance This Tile' trigger.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch, type TileResult } from "../../lib/store";
import { searchTiles, submitJob, streamJobProgress, LOCAL_IMAGES, getTileWmsUrl } from "../../lib/api";
import { THEME } from "../../lib/theme";

export function TileCarousel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [previewTile, setPreviewTile] = useState<TileResult | null>(null);

  const handleTileSearch = async () => {
    if (!state.aoiGeometry) return;
    dispatch({ type: "SET_JOB_STATUS", status: "searching" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const tiles = await searchTiles(
        state.aoiGeometry,
        state.searchDateFrom || "2026-08-01",
        state.searchDateTo || "2026-08-30"
      );
      dispatch({ type: "SET_TILES", tiles });
      if (tiles.length > 0) {
        const sorted = [...tiles].sort((a, b) => a.cloudCover - b.cloudCover);
        dispatch({ type: "SELECT_TILE", tile: sorted[0] });
      }
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message || "Tile search failed" });
      dispatch({ type: "SET_JOB_STATUS", status: "error" });
    }
  };

  const handleEnhance = async () => {
    if (!state.selectedTile || !state.aoiGeometry) return;
    dispatch({ type: "SET_JOB_STATUS", status: "submitting" });
    dispatch({ type: "SET_ERROR", error: null });

    try {
      const jobResp = await submitJob(state.selectedTile.tileId, state.aoiGeometry, true);

      if (jobResp.cached && jobResp.result) {
        dispatch({
          type: "SET_JOB_PROGRESS",
          progress: 100,
          label: "Super-Resolution completed",
        });
        dispatch({ type: "SET_SR_RESULT", result: jobResp.result });
        return;
      }

      dispatch({ type: "SET_JOB_STATUS", status: "processing" });

      streamJobProgress(jobResp.jobId, {
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
    } catch (err: any) {
      dispatch({ type: "SET_ERROR", error: err.message || "Job submission failed" });
      dispatch({ type: "SET_JOB_STATUS", status: "error" });
    }
  };

  const bboxString = React.useMemo(() => {
    if (!state.aoiGeometry) return "77.5887,12.9658,77.6005,12.9774";
    const bounds = (state.aoiGeometry as any).bounds;
    if (bounds) {
      return `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
    }
    const coords = (state.aoiGeometry as any).coordinates?.[0];
    if (coords && coords.length >= 4) {
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      return `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;
    }
    return "77.5887,12.9658,77.6005,12.9774";
  }, [state.aoiGeometry]);

  const displayedTiles =
    state.tiles.length > 0
      ? [...state.tiles].sort((a, b) => a.cloudCover - b.cloudCover).slice(0, 5)
      : [];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="images" size={17} color="#0EA5E9" />
          <Text style={styles.cardTitle}>Sentinel-2 Imagery Scenes</Text>
        </View>

        <View style={styles.datePill}>
          <Text style={styles.dateText}>Aug 2026 Archive</Text>
        </View>
      </View>

      {/* Query Copernicus Trigger */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleTileSearch}
          disabled={state.jobStatus === "searching"}
          style={styles.queryBtn}
        >
          {state.jobStatus === "searching" ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.queryBtnText}>Querying Copernicus CDSE...</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={16} color="#FFFFFF" />
              <Text style={styles.queryBtnText}>Search Copernicus Sentinel-2</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tiles Carousel List */}
      {displayedTiles.length > 0 && (
        <View style={styles.tilesContainer}>
          <View style={styles.tilesHeader}>
            <Text style={styles.tilesHeading}>
              Available Overpasses ({displayedTiles.length})
            </Text>
            <View style={styles.leastCloudBadge}>
              <Text style={styles.leastCloudText}>Sorted by Least Cloud %</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tilesScroll}
          >
            {displayedTiles.map((tile) => {
              const isSelected = state.selectedTile?.tileId === tile.tileId;
              const isLowCloud = tile.cloudCover < 15;
              const tileWmsUrl = getTileWmsUrl(tile, bboxString, 512, 512);

              return (
                <TouchableOpacity
                  key={tile.tileId}
                  activeOpacity={0.85}
                  onPress={() => {
                    dispatch({ type: "SELECT_TILE", tile });
                    setPreviewTile(tile);
                  }}
                  style={[
                    styles.tileCard,
                    isSelected && styles.selectedTileCard,
                  ]}
                >
                  <View style={styles.thumbnailContainer}>
                    <Image
                      source={{ uri: tileWmsUrl }}
                      defaultSource={LOCAL_IMAGES.lrClean}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.enlargePill}>
                      <Ionicons name="expand" size={9} color="#FFFFFF" />
                      <Text style={styles.enlargeText}>Preview</Text>
                    </View>
                  </View>

                  <View style={styles.tileInfo}>
                    <Text style={styles.tileDate}>{tile.date}</Text>
                    <View style={styles.cloudRow}>
                      <Ionicons
                        name="cloud"
                        size={11}
                        color={isLowCloud ? "#10B981" : "#F59E0B"}
                      />
                      <Text
                        style={[
                          styles.cloudText,
                          { color: isLowCloud ? "#10B981" : "#F59E0B" },
                        ]}
                      >
                        {tile.cloudCover}% cloud
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Enhance Action Button */}
          {state.selectedTile && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleEnhance}
              disabled={state.jobStatus === "submitting" || state.jobStatus === "processing"}
              style={styles.enhanceBtn}
            >
              {state.jobStatus === "submitting" || state.jobStatus === "processing" ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.enhanceBtnText}>
                    {state.jobStatus === "submitting" ? "Submitting..." : "Enhancing..."}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                  <Text style={styles.enhanceBtnText}>Enhance This Tile</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Enlarged Sentinel-2 Scene Preview Modal */}
      <Modal
        visible={!!previewTile}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewTile(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Sentinel-2 Scene Inspector</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{previewTile?.tileId}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewTile(null)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageWrap}>
              {previewTile && (
                <Image
                  source={{ uri: getTileWmsUrl(previewTile, bboxString, 1024, 1024) }}
                  defaultSource={LOCAL_IMAGES.lrClean}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFootText}>
                Acquisition: {previewTile?.date} • Cloud: {previewTile?.cloudCover}%
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewTile(null)}
                style={styles.modalSelectBtn}
              >
                <Text style={styles.modalSelectText}>Confirm Tile Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  datePill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#94A3B8",
  },
  actionSection: {
    padding: 12,
    gap: 10,
  },
  queryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0EA5E9",
    paddingVertical: 11,
    borderRadius: 12,
  },
  queryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tilesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  tilesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tilesHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  leastCloudBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  leastCloudText: {
    fontSize: 9,
    fontFamily: "monospace",
    color: "#10B981",
    fontWeight: "700",
  },
  tilesScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  tileCard: {
    width: 125,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  selectedTileCard: {
    borderColor: "#0EA5E9",
    borderWidth: 1.5,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
  },
  thumbnailContainer: {
    width: "100%",
    height: 75,
    backgroundColor: "#000",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  enlargePill: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enlargeText: {
    fontSize: 8,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  tileInfo: {
    padding: 8,
  },
  tileDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "monospace",
  },
  cloudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cloudText: {
    fontSize: 10,
    fontWeight: "600",
  },
  enhanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  enhanceBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalImageWrap: {
    width: "100%",
    height: 320,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    gap: 10,
  },
  modalFootText: {
    fontSize: 11,
    color: "#CBD5E1",
    textAlign: "center",
  },
  modalSelectBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSelectText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
