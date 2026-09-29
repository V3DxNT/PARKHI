/**
 * Downstream Intelligence Capabilities Teaser Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/home/AnalysisTeaser.tsx
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../lib/theme";

const ANALYSES = [
  {
    label: "Crop Analysis",
    tag: "Spectral Indices",
    icon: "leaf" as const,
    description: "NDVI-based crop type classification and biomass density mapping",
    color: "#10B981", // Emerald
  },
  {
    label: "Urban Analysis",
    tag: "Spatial Morphology",
    icon: "business" as const,
    description: "Built-up area segmentation, road network extraction & land use monitoring",
    color: "#0EA5E9", // Sky / Blue
  },
  {
    label: "Disaster Analysis",
    tag: "Change Detection",
    icon: "warning" as const,
    description: "Flood boundary delineation, structural damage assessment & recovery metrics",
    color: "#F59E0B", // Amber
  },
];

export function AnalysisTeaser() {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DOWNSTREAM CAPABILITIES</Text>
        </View>
        <Text style={styles.title}>Downstream Intelligence Suite</Text>
        <Text style={styles.subtitle}>
          Applied machine learning extracting actionable geospatial insights from reconstructed imagery
        </Text>
      </View>

      <View style={styles.cardsList}>
        {ANALYSES.map((item) => (
          <View key={item.label} style={styles.card}>
            {/* Top glowing accent border */}
            <View style={[styles.topAccent, { backgroundColor: item.color }]} />

            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.tagWrap}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            </View>

            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#05070D",
  },
  sectionHeader: {
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
    fontSize: 20,
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
  cardsList: {
    gap: 12,
  },
  card: {
    backgroundColor: "rgba(11, 17, 32, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tagWrap: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 17,
  },
});
