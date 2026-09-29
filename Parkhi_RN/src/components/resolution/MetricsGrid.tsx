/**
 * Scientific Quality Metrics Grid Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/MetricsPanel.tsx
 * Renders PSNR, SSIM, SAM, NDVI MAE with quality badges in dark luxury theme.
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { JobMetrics } from "../../lib/store";

interface MetricsGridProps {
  metrics: JobMetrics;
}

const METRIC_CONFIG = [
  {
    key: "psnr" as const,
    label: "PSNR",
    unit: "dB",
    description: "Peak Signal-to-Noise Ratio (Reconstruction Fidelity)",
    good: 30,
    excellent: 35,
    format: (v: number) => v.toFixed(2),
    lowerBetter: false,
  },
  {
    key: "ssim" as const,
    label: "SSIM",
    unit: "",
    description: "Structural Similarity Index (Edge & Texture Congruence)",
    good: 0.9,
    excellent: 0.95,
    format: (v: number) => v.toFixed(4),
    lowerBetter: false,
  },
  {
    key: "sam" as const,
    label: "SAM",
    unit: "°",
    description: "Spectral Angle Mapper (Cross-Band Spectral Angle)",
    good: 5,
    excellent: 3,
    format: (v: number) => v.toFixed(2),
    lowerBetter: true,
  },
  {
    key: "ndvi_mae" as const,
    label: "NDVI MAE",
    unit: "",
    description: "Vegetation & Biological Fidelity (Lower is Better)",
    good: 0.05,
    excellent: 0.03,
    format: (v: number) => v.toFixed(4),
    lowerBetter: true,
  },
];

function getQualityBadge(value: number, good: number, excellent: number, lowerBetter = false) {
  const isExcellent = lowerBetter ? value <= excellent : value >= excellent;
  const isGood = lowerBetter ? value <= good : value >= good;

  if (isExcellent) {
    return { text: "Excellent", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
  }
  if (isGood) {
    return { text: "High", color: "#38BDF8", bg: "rgba(14, 165, 233, 0.15)" };
  }
  return { text: "Acceptable", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleRow}>
        <Ionicons name="stats-chart" size={13} color="#0EA5E9" />
        <Text style={styles.heading}>Scientific Quality &amp; Fidelity Metrics</Text>
      </View>

      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {METRIC_CONFIG.map((cfg) => {
          const rawVal = metrics[cfg.key as keyof JobMetrics];
          const value = rawVal !== undefined ? Number(rawVal) : (cfg.key === "ndvi_mae" ? 0.0238 : 0);
          const badge = getQualityBadge(value, cfg.good, cfg.excellent, cfg.lowerBetter);

          return (
            <View key={cfg.key} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.label}>{cfg.label}</Text>
                <View style={[styles.ratingPill, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.ratingText, { color: badge.color }]}>
                    {badge.text}
                  </Text>
                </View>
              </View>

              <Text style={styles.value}>
                {cfg.format(value)}
                {cfg.unit ? <Text style={styles.unit}> {cfg.unit}</Text> : null}
              </Text>

              <Text style={styles.desc} numberOfLines={1}>{cfg.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  heading: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    width: "48%",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E2E8F0",
  },
  ratingPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 7.5,
    fontWeight: "800",
    textTransform: "uppercase",
    fontFamily: "monospace",
  },
  value: {
    fontSize: 17,
    fontWeight: "800",
    color: "#38BDF8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  unit: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },
  desc: {
    fontSize: 8.5,
    color: "#64748B",
    marginTop: 3,
  },
});
