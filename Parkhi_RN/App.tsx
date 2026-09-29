/**
 * Parkhi (SatSR) Mobile Application Root
 * High-fidelity React Native mobile application mirroring Yukti-FrontEnd Next.js platform.
 */

import React, { useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Platform } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AppStateProvider } from "./src/lib/store";
import { SplashScreen } from "./src/components/layout/SplashScreen";
import { Header } from "./src/components/layout/Header";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ResolutionScreen } from "./src/screens/ResolutionScreen";
import { AboutScreen } from "./src/screens/AboutScreen";
import { THEME } from "./src/lib/theme";

type TabKey = "home" | "resolution" | "about";

function MainApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [splashFinished, setSplashFinished] = useState(false);

  const handleFinishSplash = useCallback(() => {
    setSplashFinished(true);
  }, []);

  const navigateToStudio = useCallback(() => {
    setActiveTab("resolution");
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Brand Header */}
      <Header
        activeTab={activeTab}
        onLogoPress={() => setActiveTab("home")}
      />

      {/* Primary Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === "home" && <HomeScreen onNavigateToStudio={navigateToStudio} />}
        {activeTab === "resolution" && <ResolutionScreen />}
        {activeTab === "about" && <AboutScreen />}
      </View>

      {/* Bottom Floating Glass Navigation Bar */}
      <View style={[styles.bottomBarWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomBar}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("home")}
            style={[styles.tabButton, activeTab === "home" && styles.tabButtonActive]}
          >
            <Ionicons
              name={activeTab === "home" ? "planet" : "planet-outline"}
              size={18}
              color={activeTab === "home" ? "#38BDF8" : "#94A3B8"}
            />
            <Text style={[styles.tabLabel, activeTab === "home" && styles.tabLabelActive]}>
              Home
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Resolution Studio */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("resolution")}
            style={[styles.tabButton, activeTab === "resolution" && styles.tabButtonActive]}
          >
            <Ionicons
              name={activeTab === "resolution" ? "sparkles" : "sparkles-outline"}
              size={18}
              color={activeTab === "resolution" ? "#2DD4BF" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "resolution" && { color: "#2DD4BF", fontWeight: "800" },
              ]}
            >
              Resolution
            </Text>
          </TouchableOpacity>

          {/* Tab 3: About Us */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("about")}
            style={[styles.tabButton, activeTab === "about" && styles.tabButtonActive]}
          >
            <Ionicons
              name={activeTab === "about" ? "information-circle" : "information-circle-outline"}
              size={18}
              color={activeTab === "about" ? "#38BDF8" : "#94A3B8"}
            />
            <Text style={[styles.tabLabel, activeTab === "about" && styles.tabLabelActive]}>
              About Us
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-Lingual Animated Splash Screen on Launch */}
      {!splashFinished && <SplashScreen onFinish={handleFinishSplash} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <MainApp />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070D",
  },
  screenContainer: {
    flex: 1,
  },
  bottomBarWrapper: {
    backgroundColor: "rgba(5, 7, 13, 0.94)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 8,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabLabelActive: {
    color: "#38BDF8",
    fontWeight: "800",
  },
});
