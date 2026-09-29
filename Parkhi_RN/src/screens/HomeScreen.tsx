/**
 * Home Screen for Parkhi Mobile
 * Mirrored from Parki_Frontend/app/page.tsx
 * Features the smooth on-scroll 60fps Earth/satellite parallax experience,
 * Sentinel-2 facts, 3-column resolution comparisons, downstream analysis teaser, and key stats.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SpaceParallaxHero, HERO_SCROLL_HEIGHT } from "../components/home/SpaceParallaxHero";
import { StatsRow } from "../components/home/StatsRow";
import { SatelliteFacts } from "../components/home/SatelliteFacts";
import { ComparisonShowcase } from "../components/home/ComparisonShowcase";
import { AnalysisTeaser } from "../components/home/AnalysisTeaser";

interface HomeScreenProps {
  onNavigateToStudio?: () => void;
}

const HERO_VIEWPORT_HEIGHT = 520;
const HERO_PIN_RANGE = HERO_SCROLL_HEIGHT; // 450px orbital scroll track
const HERO_CONTAINER_HEIGHT = HERO_VIEWPORT_HEIGHT + HERO_PIN_RANGE; // 970px

export function HomeScreen({ onNavigateToStudio }: HomeScreenProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroPinnedStyle = useAnimatedStyle(() => {
    // Pin viewport in place during orbital journey
    const translateY = Math.min(scrollY.value, HERO_PIN_RANGE);
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.ScrollView
      style={styles.container}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Cinematic Space Parallax Hero with Sticky Orbital Scroll */}
      <View style={{ height: HERO_CONTAINER_HEIGHT }}>
        <Animated.View style={[styles.heroWrapper, heroPinnedStyle]}>
          <SpaceParallaxHero scrollY={scrollY} />
        </Animated.View>
      </View>

      {/* 2. Platform Key Stats Row */}
      <StatsRow />

      {/* 3. Sentinel-2 Context & Mission Facts */}
      <SatelliteFacts />

      {/* 4. Empirical 3-Column Imagery Showcase (Agri, Urban, Disaster) */}
      <ComparisonShowcase />

      {/* 5. Downstream Intelligence Capabilities Teaser */}
      <AnalysisTeaser />

      {/* 6. Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} SatSR — SIH 26142
        </Text>
        <Text style={styles.footerSub}>
          Generative AI Super-Resolution Platform
        </Text>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070D",
  },
  heroWrapper: {
    height: HERO_VIEWPORT_HEIGHT,
    width: "100%",
    zIndex: 10,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#020305",
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  footerSub: {
    fontSize: 10,
    color: "#475569",
    marginTop: 3,
    textAlign: "center",
  },
});
