/**
 * Top Header Navigation Bar for Parkhi Mobile
 * Displays the Parkhi logo brand, satellite status pill, and quick telemetry
 */

import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LOCAL_LOGOS } from "../../lib/api";

interface HeaderProps {
  activeTab?: string;
  onLogoPress?: () => void;
}

export function Header({ activeTab, onLogoPress }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.headerBar}>
        {/* Brand Logo */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onLogoPress}
          style={styles.logoTouch}
        >
          <Image
            source={LOCAL_LOGOS.newLogo || LOCAL_LOGOS.logoNameBg}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Right Actions: Constellation Badge */}
        <View style={styles.rightActions}>
          <View style={styles.badgeContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeText}>Sentinel-2 MSI</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "rgba(5, 7, 13, 0.94)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 100,
  },
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 135,
    height: 32,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DD4BF",
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#5EEAD4",
    letterSpacing: 0.5,
    fontFamily: "monospace",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});
