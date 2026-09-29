/**
 * Cinematic Space Parallax Hero Experience for Parkhi Mobile
 * Smooth scroll-driven animation powered by react-native-reanimated.
 * Features curved Earth horizon, orbiting Sentinel-2 satellite, starfield parallax,
 * and 2-phase storytelling text.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LOCAL_IMAGES } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const HERO_SCROLL_HEIGHT = 450; // Scroll range for the full orbital journey

interface SpaceParallaxHeroProps {
  scrollY: SharedValue<number>;
}

// Deterministic star field
interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

function generateStars(count = 70): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Pseudo-random deterministic placement
    const seed = (i * 9301 + 49297) % 233280;
    const rnd1 = seed / 233280;
    const rnd2 = ((seed * 9301 + 49297) % 233280) / 233280;
    const rnd3 = ((seed * 9301 + 12345) % 233280) / 233280;

    stars.push({
      id: i,
      x: rnd1 * SCREEN_WIDTH,
      y: rnd2 * 450,
      size: 1 + rnd3 * 2.2,
      opacity: 0.25 + rnd2 * 0.65,
      speed: 0.2 + rnd3 * 0.8,
    });
  }
  return stars;
}

export function SpaceParallaxHero({ scrollY }: SpaceParallaxHeroProps) {
  const stars = useMemo(() => generateStars(80), []);

  // ─── Animated Styles ────────────────────────────────────────

  // Earth horizon subtle parallax
  const earthAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT],
      [0, -45],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT],
      [1, 1.06],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Satellite orbital trajectory
  const satelliteAnimatedStyle = useAnimatedStyle(() => {
    // Natural orbit arc sweeping across the Earth horizon limb, below the storytelling text
    const translateX = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.48, HERO_SCROLL_HEIGHT],
      [SCREEN_WIDTH * 0.06, SCREEN_WIDTH * 0.46, SCREEN_WIDTH * 0.84],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.48, HERO_SCROLL_HEIGHT * 0.85, HERO_SCROLL_HEIGHT],
      [245, 190, 245, 295],
      Extrapolation.CLAMP
    );

    const rotation = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.48, HERO_SCROLL_HEIGHT],
      [-16, 6, 32],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.48, HERO_SCROLL_HEIGHT],
      [0.9, 1.08, 0.72],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.82, HERO_SCROLL_HEIGHT * 0.98],
      [1, 0.95, 0.1],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotation}deg` },
        { scale },
      ],
      opacity,
    };
  });

  // Orbit trail glow
  const trailAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.2, HERO_SCROLL_HEIGHT * 0.85],
      [0.15, 0.65, 0.2],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Phase 1 Text: "From Raw Satellite Imagery"
  const phase1AnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.15, HERO_SCROLL_HEIGHT * 0.32],
      [1, 0.9, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT * 0.32],
      [0, -28],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Phase 2 Text: "To Enhanced Spatial Image"
  const phase2AnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HERO_SCROLL_HEIGHT * 0.32, HERO_SCROLL_HEIGHT * 0.48, HERO_SCROLL_HEIGHT * 0.82, HERO_SCROLL_HEIGHT],
      [0, 1, 1, 0.15],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [HERO_SCROLL_HEIGHT * 0.32, HERO_SCROLL_HEIGHT * 0.48],
      [24, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Starfield Parallax
  const starFieldAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_SCROLL_HEIGHT],
      [0, -50],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Deep Space Gradient Base */}
      <LinearGradient
        colors={["#020305", "#05070D", "#0B1120"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Star Field */}
      <Animated.View style={[StyleSheet.absoluteFill, starFieldAnimatedStyle]}>
        {stars.map((s) => (
          <View
            key={s.id}
            style={[
              styles.star,
              {
                left: s.x,
                top: s.y,
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                opacity: s.opacity,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Ambient Earth Atmosphere Glow */}
      <View style={styles.atmosphereGlow} />

      {/* Earth Horizon */}
      <Animated.View style={[styles.earthWrapper, earthAnimatedStyle]}>
        <Image
          source={LOCAL_IMAGES.earthCleanHorizon}
          style={styles.earthImage}
          resizeMode="cover"
        />
        {/* Soft dark gradient vignette blending into bottom page flow */}
        <LinearGradient
          colors={["transparent", "rgba(5, 7, 13, 0.6)", "#05070D"]}
          style={styles.earthVignette}
        />
      </Animated.View>

      {/* Orbit Trail SVG representation */}
      <Animated.View style={[styles.orbitTrail, trailAnimatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(46, 125, 225, 0.3)", "rgba(20, 184, 166, 0.4)", "transparent"]}
          start={{ x: 0, y: 0.8 }}
          end={{ x: 1, y: 0.3 }}
          style={styles.orbitCurve}
        />
      </Animated.View>

      {/* Orbiting Satellite */}
      <Animated.View style={[styles.satelliteWrapper, satelliteAnimatedStyle]}>
        <Image
          source={LOCAL_IMAGES.sentinel2Photorealistic}
          style={styles.satelliteImage}
          resizeMode="contain"
        />
        {/* Active Telemetry Beacon LED */}
        <View style={styles.beaconPing} />
        <View style={styles.beaconCore} />

        {/* Minimal HUD callout */}
        <View style={styles.hudBadge}>
          <View style={styles.hudDot} />
          <Text style={styles.hudText}>SENTINEL-2 • 786 KM</Text>
        </View>
        {/* Solar panel glow */}
        <View style={styles.satelliteGlow} />
      </Animated.View>

      {/* ─── Storytelling Text Overlays ──────────────────────── */}

      {/* Phase 1 Overlay */}
      <Animated.View style={[styles.textOverlay, phase1AnimatedStyle]} pointerEvents="box-none">
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>SENTINEL-2 EARTH OBSERVATION</Text>
        </View>

        <Text style={styles.headline}>
          From Raw{"\n"}Satellite Imagery
        </Text>
        <Text style={styles.subtext}>
          10m Copernicus multispectral data captured from 786km low-earth orbit
        </Text>

        <View style={styles.scrollCue}>
          <Text style={styles.scrollCueText}>SCROLL TO ORBIT</Text>
          <Ionicons name="chevron-down" size={14} color="#94A3B8" />
        </View>
      </Animated.View>

      {/* Phase 2 Overlay */}
      <Animated.View style={[styles.textOverlay, phase2AnimatedStyle]} pointerEvents="box-none">
        <View style={[styles.badge, styles.badgePhase2]}>
          <View style={[styles.badgeDot, { backgroundColor: "#14B8A6" }]} />
          <Text style={[styles.badgeText, { color: "#5EEAD4" }]}>
            HYBRID ATTENTION TRANSFORMER
          </Text>
        </View>

        <Text style={styles.headline}>
          To <Text style={styles.highlightText}>Enhanced</Text>
          {"\n"}Spatial Resolution
        </Text>
        <Text style={styles.subtext}>
          Sub-4m high-resolution reconstruction with quantifiable anti-hallucination bounds
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 520,
    width: SCREEN_WIDTH,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#020305",
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  atmosphereGlow: {
    position: "absolute",
    bottom: -60,
    left: -50,
    right: -50,
    height: 320,
    borderRadius: 300,
    backgroundColor: "rgba(46, 125, 225, 0.14)",
  },
  earthWrapper: {
    position: "absolute",
    bottom: -110,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.05,
    borderRadius: SCREEN_WIDTH,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  earthImage: {
    width: "100%",
    height: "100%",
  },
  earthVignette: {
    ...StyleSheet.absoluteFill,
  },
  orbitTrail: {
    position: "absolute",
    top: 150,
    left: 10,
    right: 10,
    height: 140,
    justifyContent: "center",
  },
  orbitCurve: {
    width: "100%",
    height: 2,
    borderRadius: 2,
  },
  satelliteWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  satelliteImage: {
    width: 68,
    height: 68,
  },
  satelliteGlow: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(46, 125, 225, 0.25)",
  },
  beaconPing: {
    position: "absolute",
    top: 26,
    left: 36,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(52, 211, 153, 0.35)",
  },
  beaconCore: {
    position: "absolute",
    top: 28,
    left: 38,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#34D399",
  },
  hudBadge: {
    position: "absolute",
    bottom: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hudDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#10B981",
  },
  hudText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#67E8F9",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  textOverlay: {
    position: "absolute",
    top: 22,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 30,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(8, 47, 73, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  badgePhase2: {
    backgroundColor: "rgba(19, 78, 74, 0.8)",
    borderColor: "rgba(20, 184, 166, 0.4)",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7DD3FC",
    letterSpacing: 1,
  },
  headline: {
    fontSize: 27,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 33,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  highlightText: {
    color: "#38BDF8",
  },
  subtext: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 6,
    maxWidth: 290,
    lineHeight: 17,
    textShadowColor: "rgba(0, 0, 0, 0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  scrollCue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
  },
  scrollCueText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
  },
});
