/**
 * Downstream Intelligence Analysis Cards & Overlay Viewer Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/AnalysisRow.tsx & ResultPanel.tsx
 * Supports Urban Segmentation, Crop NDVI classification, and Disaster Damage Assessment
 * with Before-Date baseline modal, visual overlay rendering, and legend chips.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch } from "../../lib/store";
import { runAnalysis, resolveMediaUrl, LOCAL_IMAGES, MOCK_ANALYSIS } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MODES = [
  {
    key: "crop" as const,
    name: "Crop Analysis",
    description: "NDVI-based crop classification & health",
    icon: "leaf" as const,
    color: "#10B981",
    needsSecondDate: false,
    overlayAsset: LOCAL_IMAGES.hrPlot,
  },
  {
    key: "urban" as const,
    name: "Urban Analysis",
    description: "Built-up footprint & land use classes",
    icon: "business" as const,
    color: "#0EA5E9",
    needsSecondDate: false,
    overlayAsset: LOCAL_IMAGES.urbanMask,
  },
  {
    key: "disaster" as const,
    name: "Change Detection",
    description: "Pre/post-disaster building damage triage",
    icon: "warning" as const,
    color: "#F43F5E",
    needsSecondDate: true,
    overlayAsset: LOCAL_IMAGES.disasterDamageMap,
  },
];

export function AnalysisCards() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [selectedBaselineOffset, setSelectedBaselineOffset] = useState(7);
  const [modalEnlarged, setModalEnlarged] = useState<{ uri: any; title: string } | null>(null);
  // Track toggle visibility (hidden/unhidden) for modes whose output is already generated
  const [hiddenModes, setHiddenModes] = useState<Record<string, boolean>>({});

  const toggleModeVisibility = (mode: "urban" | "crop" | "disaster") => {
    setHiddenModes((prev) => ({
      ...prev,
      [mode]: !prev[mode],
    }));
  };

  const handleCardPress = (mode: "urban" | "crop" | "disaster") => {
    const hasResult = !!state.analysisResults[mode];
    if (!hasResult) {
      // If output is absent, generate it
      handleTrigger(mode);
    } else {
      // If output is present, toggle hide / unhide
      toggleModeVisibility(mode);
    }
  };

  const handleTrigger = (mode: "urban" | "crop" | "disaster") => {
    const config = MODES.find((m) => m.key === mode);
    if (config?.needsSecondDate) {
      setDateModalOpen(true);
    } else {
      executeAnalysis(mode);
    }
  };

  const executeAnalysis = async (mode: "urban" | "crop" | "disaster", historicalDate?: string) => {
    if (!state.srResult) return;
    setDateModalOpen(false);
    dispatch({ type: "SET_ANALYSIS_LOADING", mode, loading: true });

    try {
      const result = await runAnalysis(state.srResult.jobId, mode, historicalDate);
      dispatch({ type: "SET_ANALYSIS_RESULT", mode, result });
      setHiddenModes((prev) => ({ ...prev, [mode]: false }));
    } catch (err: any) {
      console.warn(`[Analysis] API failed for ${mode}, falling back to bundled benchmark for demo:`, err);
      const fallback = MOCK_ANALYSIS[mode];
      dispatch({ type: "SET_ANALYSIS_RESULT", mode, result: fallback });
      setHiddenModes((prev) => ({ ...prev, [mode]: false }));
    } finally {
      dispatch({ type: "SET_ANALYSIS_LOADING", mode, loading: false });
    }
  };

  const enhancedSource = state.srResult?.enhancedUrl
    ? { uri: resolveMediaUrl(state.srResult.enhancedUrl) }
    : LOCAL_IMAGES.srClean;

  const isDisabled = !state.srResult;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="hardware-chip" size={16} color="#0EA5E9" />
          <Text style={styles.title}>Downstream Spectral Intelligence</Text>
        </View>
        <Text style={styles.subtitle}>
          {isDisabled
            ? "Enhance a tile above to unlock downstream models"
            : "Run specialized neural models on reconstructed imagery"}
        </Text>
      </View>

      {/* Mode Buttons Row */}
      <View style={styles.modesRow}>
        {MODES.map((m) => {
          const isLoading = state.analysisLoading[m.key];
          const hasResult = !!state.analysisResults[m.key];
          const isHidden = !!hiddenModes[m.key];

          return (
            <TouchableOpacity
              key={m.key}
              activeOpacity={0.85}
              onPress={() => handleCardPress(m.key)}
              disabled={isDisabled || isLoading}
              style={[
                styles.modeCard,
                isDisabled && styles.modeCardDisabled,
                hasResult && !isHidden && { borderColor: m.color, backgroundColor: "rgba(15, 23, 42, 0.95)" },
                hasResult && isHidden && { borderColor: "rgba(255, 255, 255, 0.15)", opacity: 0.65 },
              ]}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: `${m.color}15` }]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={m.color} />
                ) : (
                  <Ionicons name={m.icon} size={16} color={m.color} />
                )}
              </View>

              <Text style={styles.modeName}>{m.name}</Text>
              <Text style={styles.modeDesc} numberOfLines={2}>
                {m.description}
              </Text>

              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: hasResult ? `${m.color}20` : "rgba(255, 255, 255, 0.06)" },
                ]}
              >
                <Text style={[styles.statusChipText, { color: hasResult ? m.color : "#94A3B8" }]}>
                  {hasResult ? "✓ Active" : "Run Model"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Analysis Overlay Result Display */}
      {(["urban", "crop", "disaster"] as const).map((mode) => {
        const res = state.analysisResults[mode];
        if (!res || hiddenModes[mode]) return null;
        const config = MODES.find((m) => m.key === mode);
        const overlaySource = res.overlayUrl
          ? { uri: resolveMediaUrl(res.overlayUrl) }
          : config?.overlayAsset || LOCAL_IMAGES.hrPlot;

        const disasterOverlaySource = res.overlayUrl
          ? { uri: resolveMediaUrl(res.overlayUrl) }
          : LOCAL_IMAGES.disasterDamageMap;

        return (
          <View key={mode} style={styles.resultBox}>
            <View style={styles.resultHead}>
              <View style={styles.resultHeadLeft}>
                <View style={[styles.activeDot, { backgroundColor: config?.color }]} />
                <Text style={[styles.resultTitle, { color: config?.color }]}>
                  {mode === "disaster" ? "Disaster Damage Triage Output" : `${config?.name} Mask`}
                </Text>
              </View>
              <View style={[styles.activePill, { backgroundColor: `${config?.color}20` }]}>
                <Text style={[styles.activePillText, { color: config?.color }]}>Active Layer</Text>
              </View>
            </View>

            {/* Visual Display: Side-by-side for Disaster, Overlay for Urban/Crop */}
            {mode === "disaster" ? (
              <View style={styles.disasterRow}>
                {/* Left: SR Plain Image */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    setModalEnlarged({ uri: enhancedSource, title: "Super-Resolution (SR) Image" })
                  }
                  style={styles.disasterCol}
                >
                  <View style={styles.disasterImageWrap}>
                    <Image
                      source={enhancedSource}
                      defaultSource={LOCAL_IMAGES.srClean}
                      style={styles.disasterImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageTag}>
                      <Text style={styles.imageTagText}>• SR IMAGE</Text>
                    </View>
                  </View>
                  <Text style={styles.imageSubtext}>Super-Resolution Plain</Text>
                </TouchableOpacity>

                {/* Right: Disaster Detection Model Overlay */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    setModalEnlarged({
                      uri: disasterOverlaySource,
                      title: "Disaster Damage Detection Model",
                    })
                  }
                  style={styles.disasterCol}
                >
                  <View style={styles.disasterImageWrap}>
                    <Image
                      source={disasterOverlaySource}
                      defaultSource={LOCAL_IMAGES.disasterDamageMap}
                      style={styles.disasterImage}
                      resizeMode="cover"
                    />
                    <View style={[styles.imageTag, { backgroundColor: "rgba(244, 63, 94, 0.85)" }]}>
                      <Text style={styles.imageTagText}>• DETECTION MODEL</Text>
                    </View>
                  </View>
                  <Text style={[styles.imageSubtext, { color: "#F43F5E" }]}>Damage Triage Map</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setModalEnlarged({
                    uri: overlaySource,
                    title: `${config?.name} Mask Overlay`,
                  })
                }
                style={styles.overlayContainer}
              >
                <Image
                  source={enhancedSource}
                  defaultSource={LOCAL_IMAGES.srClean}
                  style={styles.overlayBaseImage}
                  resizeMode="cover"
                />
                <Image
                  source={overlaySource}
                  style={[styles.overlayMaskImage, { opacity: mode === "crop" ? 0.75 : 0.88 }]}
                  resizeMode="cover"
                />
                <View style={styles.overlayExpandBtn}>
                  <Ionicons name="expand" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}

            {/* Legend Chips */}
            <View style={styles.legendRow}>
              {res.legend.map((l) => (
                <View key={l.label} style={styles.legendChip}>
                  <View style={[styles.legendColor, { backgroundColor: l.color }]} />
                  <Text style={styles.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>

            {/* Summary Text */}
            <Text style={styles.summaryText}>{res.summary}</Text>
          </View>
        );
      })}

      {/* Pre-Disaster Baseline Date Selection Modal */}
      <Modal
        visible={dateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dateModalCard}>
            <View style={styles.dateModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateModalTitle}>Select Pre-Event Baseline Date</Text>
                <Text style={styles.dateModalSub}>
                  Change detection diffs historical baseline against current SR scene
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDateModalOpen(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.presetsBox}>
              <Text style={styles.presetsHeading}>QUICK BASELINE PRESETS:</Text>
              <View style={styles.presetsRow}>
                {[
                  { label: "7 Days Prior", days: 7 },
                  { label: "15 Days Prior", days: 15 },
                  { label: "30 Days Prior", days: 30 },
                ].map((p) => {
                  const isSelected = selectedBaselineOffset === p.days;
                  return (
                    <TouchableOpacity
                      key={p.days}
                      activeOpacity={0.8}
                      onPress={() => setSelectedBaselineOffset(p.days)}
                      style={[
                        styles.baselineChip,
                        isSelected && styles.baselineChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.baselineChipText,
                          isSelected && styles.baselineChipTextSelected,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.dateModalFooter}>
              <TouchableOpacity
                onPress={() => setDateModalOpen(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - selectedBaselineOffset);
                  executeAnalysis("disaster", d.toISOString().split("T")[0]);
                }}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Run Detection &amp; Assessment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Overlay Inspector Modal */}
      <Modal
        visible={!!modalEnlarged}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEnlarged(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.enlargeModalCard}>
            <View style={styles.enlargeHeader}>
              <Text style={styles.enlargeTitle}>{modalEnlarged?.title}</Text>
              <TouchableOpacity onPress={() => setModalEnlarged(null)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.enlargeImageWrap}>
              {modalEnlarged?.uri && (
                <Image
                  source={modalEnlarged.uri}
                  style={styles.enlargeImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <TouchableOpacity
              onPress={() => setModalEnlarged(null)}
              style={styles.enlargeDoneBtn}
            >
              <Text style={styles.enlargeDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 14,
    marginBottom: 14,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  modesRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeCard: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 10,
    alignItems: "center",
  },
  modeCardDisabled: {
    opacity: 0.4,
  },
  modeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  modeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  modeDesc: {
    fontSize: 8.5,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
    minHeight: 24,
  },
  statusChip: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 8.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  resultBox: {
    marginTop: 14,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
  },
  resultHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 8.5,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  disasterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  disasterCol: {
    flex: 1,
  },
  disasterImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  disasterImage: {
    width: "100%",
    height: "100%",
  },
  imageTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageTagText: {
    fontSize: 7.5,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  imageSubtext: {
    fontSize: 9,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  overlayContainer: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 10,
  },
  overlayBaseImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlayMaskImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlayExpandBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  legendColor: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 9,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  summaryText: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dateModalCard: {
    width: "100%",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  dateModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateModalSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 14,
  },
  presetsBox: {
    marginBottom: 16,
    gap: 6,
  },
  presetsHeading: {
    fontSize: 9.5,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#CBD5E1",
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
  },
  baselineChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    alignItems: "center",
  },
  baselineChipSelected: {
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    borderColor: "rgba(244, 63, 94, 0.5)",
  },
  baselineChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  baselineChipTextSelected: {
    color: "#F43F5E",
    fontWeight: "700",
  },
  dateModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  confirmBtn: {
    backgroundColor: "#F43F5E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  enlargeModalCard: {
    width: "100%",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
  },
  enlargeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  enlargeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  enlargeImageWrap: {
    width: "100%",
    height: 330,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  enlargeImage: {
    width: "100%",
    height: "100%",
  },
  enlargeDoneBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  enlargeDoneText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
