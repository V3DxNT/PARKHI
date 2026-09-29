/**
 * Resolution Studio Screen for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/app/resolution/page.tsx
 * Complete end-to-end interactive suite for AOI drawing, Copernicus tile query,
 * real-time super-resolution, swipe compare, band inspection, metrics, and downstream analytics.
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch, type ViewMode } from "../lib/store";
import { MapSelector } from "../components/resolution/MapSelector";
import { TileCarousel } from "../components/resolution/TileCarousel";
import { ProcessingStepper } from "../components/resolution/ProcessingStepper";
import { SwipeSlider } from "../components/resolution/SwipeSlider";
import { UncertaintyView } from "../components/resolution/UncertaintyView";
import { SideBySideView } from "../components/resolution/SideBySideView";
import { BandsInspector } from "../components/resolution/BandsInspector";
import { MetricsGrid } from "../components/resolution/MetricsGrid";
import { ExportAction } from "../components/resolution/ExportAction";
import { AnalysisCards } from "../components/resolution/AnalysisCards";
import { VoiceCommandModal } from "../components/resolution/VoiceCommandModal";

const VIEW_MODES: { key: ViewMode; label: string; icon: any }[] = [
  { key: "swipe", label: "Swipe", icon: "swap-horizontal" },
  { key: "uncertainty", label: "Uncertainty", icon: "barcode-outline" },
  { key: "sidebyside", label: "Split", icon: "grid-outline" },
];

export function ResolutionScreen() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Voice Command Handler matching Next.js
  const handleVoiceCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase().trim();
      if (cmd.includes("swipe") || cmd.includes("compare")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "swipe" });
      } else if (cmd.includes("uncertainty")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "uncertainty" });
      } else if (cmd.includes("side by side") || cmd.includes("split")) {
        dispatch({ type: "SET_VIEW_MODE", mode: "sidebyside" });
      } else if (cmd.includes("bangalore")) {
        dispatch({
          type: "SET_AOI",
          geometry: {
            type: "Polygon",
            coordinates: [[[77.55, 12.92], [77.65, 12.92], [77.65, 13.02], [77.55, 13.02], [77.55, 12.92]]],
          },
          area: 1.64,
        });
      }
    },
    [dispatch]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Studio Header Bar */}
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.pageTitle}>Super-Resolution Studio</Text>
            <View style={styles.resolutionBadge}>
              <Text style={styles.resolutionBadgeText}>Sub-4m</Text>
            </View>
          </View>
          <Text style={styles.pageSubtitle}>
            Interactive high-precision satellite super-resolution &amp; downstream analytics pipeline
          </Text>
        </View>

        {/* Voice Assistant Mic Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setVoiceModalOpen(true)}
          style={styles.micBtn}
        >
          <Ionicons name="mic" size={16} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* 1. AOI Selection Section */}
        <MapSelector />

        {/* 2. Available Imagery Tiles & Job Submission */}
        <TileCarousel />

        {/* 3. Processing Progress Stepper */}
        {(state.jobStatus === "processing" || state.jobStatus === "submitting") && (
          <ProcessingStepper />
        )}

        {/* 4. Super-Resolution Result Viewer Card */}
        {state.srResult && (
          <View style={styles.resultCard}>
            {/* Viewer Header */}
            <View style={styles.resultHeader}>
              <View style={styles.resTitleRow}>
                <View style={styles.pulseDot} />
                <View>
                  <Text style={styles.resultTitle}>Super-Resolution Output</Text>
                  <Text style={styles.resultSubtitle}>Raw 10m Sentinel-2 → Sub-4m Deep Learning</Text>
                </View>
              </View>

              {/* View Mode Switcher Pills */}
              <View style={styles.modeTabs}>
                {VIEW_MODES.map((vm) => {
                  const isActive = state.viewMode === vm.key;
                  return (
                    <TouchableOpacity
                      key={vm.key}
                      onPress={() => dispatch({ type: "SET_VIEW_MODE", mode: vm.key })}
                      style={[styles.modeTab, isActive && styles.modeTabActive]}
                    >
                      <Ionicons
                        name={vm.icon}
                        size={12}
                        color={isActive ? "#2DD4BF" : "#64748B"}
                      />
                      <Text style={[styles.modeTabText, isActive && styles.modeTabTextActive]}>
                        {vm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Viewer Body */}
            <View style={styles.viewerBody}>
              {state.viewMode === "swipe" && <SwipeSlider />}
              {state.viewMode === "uncertainty" && <UncertaintyView />}
              {state.viewMode === "sidebyside" && <SideBySideView />}

              {/* 4 Multispectral Raw Bands */}
              <BandsInspector />

              {/* Quality Metrics */}
              <MetricsGrid metrics={state.srResult.metrics} />

              {/* GeoTIFF Export Action */}
              <ExportAction
                downloadUrl={state.srResult.downloadGeoTiff}
                reportUrl={state.srResult.downloadReport}
              />
            </View>
          </View>
        )}

        {/* 5. Downstream Intelligence Analysis */}
        <AnalysisCards />
      </View>

      {/* Voice Assistant Modal */}
      <VoiceCommandModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onCommand={handleVoiceCommand}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070D",
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#05070D",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  resolutionBadge: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  resolutionBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#38BDF8",
  },
  pageSubtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 14,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 14,
  },
  resultCard: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 14,
  },
  resultHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  resultTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resultSubtitle: {
    fontSize: 8.5,
    color: "#94A3B8",
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: "rgba(20, 184, 166, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.4)",
  },
  modeTabText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
  },
  modeTabTextActive: {
    color: "#2DD4BF",
    fontWeight: "800",
  },
  viewerBody: {
    padding: 12,
  },
});
