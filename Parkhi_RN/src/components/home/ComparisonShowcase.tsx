/**
 * 3-Stage Empirical Imagery Benchmark Showcase for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/home/ImageryShowcase.tsx
 * Supports all 3 benchmarks:
 * 1. Super-Resolution (10m → <4m) - Agricultural & Vegetation Zone
 * 2. Urban Building Extraction - Residual UNet
 * 3. Disaster Damage Assessment - Hurricane Michael Triage
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LOCAL_IMAGES } from "../../lib/api";
import { THEME } from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ColumnInfo {
  title: string;
  subtitle: string;
  badge: string;
  source: any;
  color: string;
}

interface BenchmarkItem {
  id: number;
  label: string;
  category: string;
  description: string;
  arrow1Text: string;
  arrow2Text: string;
  col1: ColumnInfo;
  col2: ColumnInfo;
  col3: ColumnInfo;
  fullPlotSource: any;
  fullPlotTitle: string;
  fullPlotSubtitle: string;
}

const BENCHMARKS: BenchmarkItem[] = [
  {
    id: 1,
    label: "Agricultural & Vegetation Zone",
    category: "Super-Resolution",
    description: "Actual model evaluation: raw 10m Sentinel-2 vs 5m reference vs super-resolved output",
    arrow1Text: "2× SCALE",
    arrow2Text: "DUAL-SR",
    col1: {
      title: "LR (10m)",
      subtitle: "Raw Sentinel-2",
      badge: "LR (10m)",
      source: LOCAL_IMAGES.lrPlot,
      color: "#0EA5E9",
    },
    col2: {
      title: "HR (5m)",
      subtitle: "Reference Truth",
      badge: "HR (5m)",
      source: LOCAL_IMAGES.hrPlot,
      color: "#F59E0B",
    },
    col3: {
      title: "SR (Fixed Norm)",
      subtitle: "Reconstructed <4m",
      badge: "SR (<4m)",
      source: LOCAL_IMAGES.srPlot,
      color: "#10B981",
    },
    fullPlotSource: LOCAL_IMAGES.fullPlot,
    fullPlotTitle: "Agricultural Super-Resolution Calibration Matrix",
    fullPlotSubtitle: "LR (10m) vs HR (5m) vs SR (fixed normalization) empirical matrix",
  },
  {
    id: 2,
    label: "Urban Infrastructure",
    category: "LULC Extraction",
    description: "Residual UNet commercial building footprints & density extraction",
    arrow1Text: "INFERENCE",
    arrow2Text: "SEGMENTATION",
    col1: {
      title: "Input Image",
      subtitle: "Raw Optical Tile",
      badge: "Input Image",
      source: LOCAL_IMAGES.urbanInput,
      color: "#0EA5E9",
    },
    col2: {
      title: "Building Probability",
      subtitle: "Confidence Heatmap",
      badge: "Probability",
      source: LOCAL_IMAGES.urbanProbability,
      color: "#F59E0B",
    },
    col3: {
      title: "Building Mask",
      subtitle: "Extracted Footprints",
      badge: "Binary Mask",
      source: LOCAL_IMAGES.urbanMask,
      color: "#10B981",
    },
    fullPlotSource: LOCAL_IMAGES.urbanCombined,
    fullPlotTitle: "Urban Infrastructure & Building Footprint Extraction",
    fullPlotSubtitle: "Raw Optical Tile → Building Probability Heatmap → Binary Extraction Mask",
  },
  {
    id: 3,
    label: "Disaster & Damage Assessment",
    category: "Change Detection",
    description: "Structural destruction analysis & building damage classification (Hurricane Michael)",
    arrow1Text: "IMPACT",
    arrow2Text: "DAMAGE TRIAGE",
    col1: {
      title: "Before Disaster",
      subtitle: "Pre-Event Baseline",
      badge: "Before",
      source: LOCAL_IMAGES.disasterBefore,
      color: "#0EA5E9",
    },
    col2: {
      title: "After Disaster",
      subtitle: "Post-Event Capture",
      badge: "After",
      source: LOCAL_IMAGES.disasterAfter,
      color: "#F43F5E",
    },
    col3: {
      title: "AI Damage Map",
      subtitle: "Classified Damage",
      badge: "Damage Map",
      source: LOCAL_IMAGES.disasterDamageMap,
      color: "#F59E0B",
    },
    fullPlotSource: LOCAL_IMAGES.disasterCombined,
    fullPlotTitle: "Post-Disaster Structural Damage Classification",
    fullPlotSubtitle: "Pre-Event Baseline → Post-Event Capture → AI Damage Triage Map",
  },
];

export function ComparisonShowcase() {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [modalPlot, setModalPlot] = useState<{
    source: any;
    title: string;
    subtitle: string;
  } | null>(null);

  const activeBenchmark = BENCHMARKS.find((b) => b.id === selectedId) || BENCHMARKS[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EMPIRICAL CALIBRATION MATRIX</Text>
        </View>
        <Text style={styles.title}>Multi-Stage Model Benchmarks</Text>
        <Text style={styles.subtitle}>
          Interactive proof of resolution synthesis, building extraction, and disaster change triage
        </Text>
      </View>

      {/* Benchmark Category Switcher Tabs */}
      <View style={styles.tabsRow}>
        {BENCHMARKS.map((b) => {
          const isActive = b.id === selectedId;
          return (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.8}
              onPress={() => setSelectedId(b.id)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {b.category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Benchmark Card */}
      <View style={styles.tripletCard}>
        {/* Row Meta */}
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleWrap}>
            <View style={styles.indexCircle}>
              <Text style={styles.rowNumber}>0{activeBenchmark.id}</Text>
            </View>
            <View>
              <Text style={styles.rowTitle}>{activeBenchmark.label}</Text>
              <Text style={styles.categoryLabel}>{activeBenchmark.category}</Text>
            </View>
          </View>

          {activeBenchmark.fullPlotSource && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setModalPlot({
                  source: activeBenchmark.fullPlotSource,
                  title: activeBenchmark.fullPlotTitle,
                  subtitle: activeBenchmark.fullPlotSubtitle,
                })
              }
              style={styles.fullPlotBtn}
            >
              <Ionicons name="expand-outline" size={13} color="#2DD4BF" />
              <Text style={styles.fullPlotText}>Full Matrix</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.rowDesc}>{activeBenchmark.description}</Text>

        {/* 3 Tiles Row */}
        <View style={styles.tilesRow}>
          {/* Tile 1 */}
          <View style={styles.tileCol}>
            <View style={styles.tileImageWrap}>
              <Image
                source={activeBenchmark.col1.source}
                style={styles.tileImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.tileBadge,
                  { backgroundColor: "rgba(14, 165, 233, 0.9)" },
                ]}
              >
                <Text style={styles.tileBadgeText}>{activeBenchmark.col1.badge}</Text>
              </View>
            </View>
            <Text style={styles.tileTitle} numberOfLines={1}>{activeBenchmark.col1.title}</Text>
            <Text style={styles.tileSubtext} numberOfLines={1}>{activeBenchmark.col1.subtitle}</Text>
          </View>

          {/* Arrow 1 */}
          <View style={styles.arrowWrap}>
            <Ionicons name="arrow-forward" size={14} color="#0EA5E9" />
            <Text style={styles.arrowLabel}>{activeBenchmark.arrow1Text}</Text>
          </View>

          {/* Tile 2 */}
          <View style={styles.tileCol}>
            <View style={styles.tileImageWrap}>
              <Image
                source={activeBenchmark.col2.source}
                style={styles.tileImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.tileBadge,
                  { backgroundColor: "rgba(245, 158, 11, 0.9)" },
                ]}
              >
                <Text style={styles.tileBadgeText}>{activeBenchmark.col2.badge}</Text>
              </View>
            </View>
            <Text style={styles.tileTitle} numberOfLines={1}>{activeBenchmark.col2.title}</Text>
            <Text style={styles.tileSubtext} numberOfLines={1}>{activeBenchmark.col2.subtitle}</Text>
          </View>

          {/* Arrow 2 */}
          <View style={styles.arrowWrap}>
            <Ionicons name="arrow-forward" size={14} color="#10B981" />
            <Text style={styles.arrowLabel}>{activeBenchmark.arrow2Text}</Text>
          </View>

          {/* Tile 3 */}
          <View style={styles.tileCol}>
            <View style={styles.tileImageWrap}>
              <Image
                source={activeBenchmark.col3.source}
                style={styles.tileImage}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.tileBadge,
                  { backgroundColor: "rgba(16, 185, 129, 0.9)" },
                ]}
              >
                <Text style={styles.tileBadgeText}>{activeBenchmark.col3.badge}</Text>
              </View>
            </View>
            <Text style={[styles.tileTitle, { color: "#2DD4BF" }]} numberOfLines={1}>
              {activeBenchmark.col3.title}
            </Text>
            <Text style={styles.tileSubtext} numberOfLines={1}>{activeBenchmark.col3.subtitle}</Text>
          </View>
        </View>

        {/* View Full Comparison Plot Banner */}
        {activeBenchmark.fullPlotSource && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              setModalPlot({
                source: activeBenchmark.fullPlotSource,
                title: activeBenchmark.fullPlotTitle,
                subtitle: activeBenchmark.fullPlotSubtitle,
              })
            }
            style={styles.inspectMatrixBanner}
          >
            <Ionicons name="layers-outline" size={15} color="#2DD4BF" />
            <Text style={styles.inspectMatrixText}>
              Open Complete {activeBenchmark.category} Calibration Plot
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#2DD4BF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal for Full Empirical Plot */}
      <Modal
        visible={!!modalPlot}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPlot(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {modalPlot?.title}
                </Text>
                <Text style={styles.modalSub} numberOfLines={2}>
                  {modalPlot?.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalPlot(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
              {modalPlot?.source && (
                <Image
                  source={modalPlot.source}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalPlot(null)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Close View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#05070D",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#38BDF8",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 320,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.4)",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  tripletCard: {
    backgroundColor: "rgba(11, 17, 32, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    padding: 14,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2DD4BF",
    fontFamily: "monospace",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  categoryLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  rowDesc: {
    fontSize: 11,
    color: "#CBD5E1",
    marginBottom: 14,
    lineHeight: 16,
  },
  fullPlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fullPlotText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2DD4BF",
  },
  tilesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tileCol: {
    flex: 1,
    alignItems: "center",
  },
  tileImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    position: "relative",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  tileBadge: {
    position: "absolute",
    bottom: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileBadgeText: {
    fontSize: 7.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tileTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E2E8F0",
    marginTop: 5,
    textAlign: "center",
  },
  tileSubtext: {
    fontSize: 8.5,
    color: "#64748B",
    marginTop: 1,
    textAlign: "center",
  },
  arrowWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    marginTop: 35,
  },
  arrowLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },
  inspectMatrixBanner: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.2)",
    paddingVertical: 9,
    borderRadius: 10,
  },
  inspectMatrixText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2DD4BF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "88%",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalImageContainer: {
    width: "100%",
    height: 340,
    backgroundColor: "#000000",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 14,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalCloseBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
