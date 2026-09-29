/**
 * Sentinel-2 Context & Mission Facts Component for Parkhi Mobile
 * Mirrored from Yukti-FrontEnd/components/home/SatelliteContext.tsx
 */

import React from "react";
import { View, Text, StyleSheet, Image, Linking, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LOCAL_IMAGES } from "../../lib/api";
import { THEME } from "../../lib/theme";

const SENTINEL_FACTS = [
  {
    icon: "planet-outline" as const,
    stat: "Twin Constellation",
    detail: "Sentinel-2A and 2B orbit in the same sun-synchronous plane, 180° apart for continuous planetary coverage.",
  },
  {
    icon: "layers-outline" as const,
    stat: "13 Spectral Bands",
    detail: "Captures 13 bands at 10m, 20m, and 60m spatial resolution spanning visible, near-infrared, and SWIR.",
  },
  {
    icon: "time-outline" as const,
    stat: "5-Day Revisit",
    detail: "Every equatorial point is revisited every 5 days, enabling responsive disaster and agricultural tracking.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    stat: "Open & Free Data",
    detail: "All Sentinel-2 data is accessible without licensing fees under the European Union Copernicus Programme.",
  },
];

export function SatelliteFacts() {
  const handleOpenEsa = () => {
    Linking.openURL("https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2");
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.kickerBadge}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>DATA SOURCE</Text>
        </View>
        <Text style={styles.title}>Powered by Sentinel-2</Text>
        <Text style={styles.subtitle}>
          The European Space Agency's Copernicus constellation provides raw multispectral inputs enhanced by our deep learning engine.
        </Text>
      </View>

      {/* Hero Satellite Image Card */}
      <View style={styles.imageCard}>
        <Image
          source={LOCAL_IMAGES.sentinel2Esa}
          style={styles.satelliteImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(5, 7, 13, 0.75)"]}
          style={styles.imageOverlay}
        >
          <View style={styles.captionRow}>
            <Text style={styles.captionText}>Artist's impression in orbit — ESA–P. Carril</Text>
            <TouchableOpacity onPress={handleOpenEsa} style={styles.sourceLink}>
              <Text style={styles.sourceLinkText}>Source</Text>
              <Ionicons name="open-outline" size={11} color="#38BDF8" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Facts Grid (2x2 on mobile) */}
      <View style={styles.factsGrid}>
        {SENTINEL_FACTS.map((fact) => (
          <View key={fact.stat} style={styles.factCard}>
            <View style={styles.factIconWrapper}>
              <Ionicons name={fact.icon} size={18} color={THEME.colors.secondary} />
            </View>
            <Text style={styles.factTitle}>{fact.stat}</Text>
            <Text style={styles.factDetail}>{fact.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: "#05070D",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  kickerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  kickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.secondary,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2DD4BF",
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 320,
  },
  imageCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    height: 180,
    position: "relative",
    marginBottom: 16,
  },
  satelliteImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  captionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  captionText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
  },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sourceLinkText: {
    fontSize: 10,
    color: "#38BDF8",
    fontWeight: "600",
  },
  factsGrid: {
    gap: 10,
  },
  factCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 14,
  },
  factIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  factDetail: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
  },
});
