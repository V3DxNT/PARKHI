/**
 * Multispectral Bands Inspector Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/ResultPanel.tsx
 * Renders the 4 raw Sentinel-2 bands (B2, B3, B4, B8) with wavelength details in dark luxury styling.
 */

import React from "react";
import { View, Text, StyleSheet, Image, Dimensions, Platform } from "react-native";
import { useAppState } from "../../lib/store";
import { LOCAL_IMAGES, resolveMediaUrl } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TILE_WIDTH = (SCREEN_WIDTH - 64) / 4;

const RAW_BANDS = [
  {
    id: "B2",
    name: "Blue",
    wavelength: "490 nm",
    role: "Atmosphere",
    color: "#0EA5E9",
  },
  {
    id: "B3",
    name: "Green",
    wavelength: "560 nm",
    role: "Vegetation",
    color: "#10B981",
  },
  {
    id: "B4",
    name: "Red",
    wavelength: "665 nm",
    role: "Chlorophyll",
    color: "#F43F5E",
  },
  {
    id: "B8",
    name: "NIR",
    wavelength: "842 nm",
    role: "Biomass",
    color: "#8B5CF6",
  },
];

export function BandsInspector() {
  const state = useAppState();
  const bands = state.srResult?.bands;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={styles.title}>Raw Multispectral Bands (10m Input)</Text>
        </View>
        <Text style={styles.sub}>Calibrated TOA Radiance</Text>
      </View>

      {/* 4 Bands Flex Row */}
      <View style={styles.bandsRow}>
        {RAW_BANDS.map((band) => {
          const bandUrl = bands && (bands as any)[band.id];
          const imageSource = bandUrl
            ? { uri: resolveMediaUrl(bandUrl) }
            : LOCAL_IMAGES.lrClean;

          return (
            <View key={band.id} style={styles.bandCard}>
              <View style={styles.imageWrap}>
                <Image
                  source={imageSource}
                  defaultSource={LOCAL_IMAGES.lrClean}
                  style={styles.bandImage}
                  resizeMode="cover"
                />
                <View style={[styles.bandTag, { backgroundColor: band.color }]}>
                  <Text style={styles.bandTagText}>{band.id}</Text>
                </View>
              </View>
              <Text style={styles.bandName}>{band.name}</Text>
              <Text style={styles.bandWavelength}>{band.wavelength}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DD4BF",
  },
  title: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 8.5,
    color: "#94A3B8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  bandsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bandCard: {
    width: TILE_WIDTH,
    alignItems: "center",
  },
  imageWrap: {
    width: TILE_WIDTH,
    height: TILE_WIDTH,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  bandImage: {
    width: "100%",
    height: "100%",
  },
  bandTag: {
    position: "absolute",
    top: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bandTagText: {
    fontSize: 7.5,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "monospace",
  },
  bandName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  bandWavelength: {
    fontSize: 8,
    color: "#94A3B8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
