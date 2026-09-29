/**
 * Key Metrics Statistics Row Component for Parkhi Mobile
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../lib/theme";

const STATS = [
  { value: "<4m", label: "Output Resolution" },
  { value: "4×", label: "Enhancement" },
  { value: "Real-time", label: "SSE Streaming" },
  { value: "3", label: "Analysis Modes" },
];

export function StatsRow() {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {STATS.map((stat, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
});
