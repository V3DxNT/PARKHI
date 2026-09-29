/**
 * Processing Stepper Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/ProcessingStepper.tsx
 * Displays animated progress bar, status label, and pipeline step indicators in dark luxury theme.
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../lib/store";

const STEPS = [
  { label: "Fetch", threshold: 15 },
  { label: "Stream", threshold: 35 },
  { label: "SwinIR SR", threshold: 55 },
  { label: "Uncertainty", threshold: 75 },
  { label: "Metrics", threshold: 90 },
  { label: "Done", threshold: 100 },
];

export function ProcessingStepper() {
  const { jobProgress, jobProgressLabel } = useAppState();

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        {/* Progress Dial */}
        <View style={styles.dial}>
          <Text style={styles.percentage}>{jobProgress}%</Text>
        </View>

        {/* Status Label */}
        <Text style={styles.statusLabel} numberOfLines={2}>
          {jobProgressLabel || "Executing Generative AI Super-Resolution Pipeline..."}
        </Text>

        {/* Progress Bar Track */}
        <View style={styles.track}>
          <LinearGradient
            colors={["#0EA5E9", "#14B8A6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.max(jobProgress, 4)}%` }]}
          />
        </View>

        {/* Step Bullets */}
        <View style={styles.stepsRow}>
          {STEPS.map((step) => {
            const isDone = jobProgress >= step.threshold;
            return (
              <View key={step.label} style={styles.stepCol}>
                <View
                  style={[
                    styles.stepDot,
                    isDone ? styles.stepDotDone : styles.stepDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(11, 17, 32, 0.85)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 18,
    marginBottom: 14,
  },
  content: {
    alignItems: "center",
  },
  dial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: "#0EA5E9",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  percentage: {
    fontSize: 15,
    fontWeight: "800",
    color: "#38BDF8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E2E8F0",
    textAlign: "center",
    marginBottom: 12,
    minHeight: 32,
  },
  track: {
    width: "100%",
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  stepCol: {
    alignItems: "center",
    width: "16%",
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 3,
  },
  stepDotDone: {
    backgroundColor: "#10B981",
  },
  stepDotPending: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  stepLabel: {
    fontSize: 8.5,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  stepLabelDone: {
    color: "#10B981",
    fontWeight: "700",
  },
});
