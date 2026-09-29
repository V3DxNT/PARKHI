/**
 * Animated Splash Screen for Parkhi Mobile (English)
 * Features English branding with smooth cinematic fade and scale transitions
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Image } from "react-native";
import { LOCAL_LOGOS } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LOGO = {
  source: LOCAL_LOGOS.logoBg,
  alt: "Parkhi - See Beyond the Pixels",
};

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const containerFade = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    let active = true;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.02,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        if (active && onFinish) onFinish();
      });
    }, 1300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim, containerFade, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <View style={styles.glowRing} />
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={LOGO.source}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
  },
  glowRing: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: (SCREEN_WIDTH * 0.85) / 2,
    backgroundColor: "rgba(46, 125, 225, 0.08)",
  },
  logoWrapper: {
    width: Math.min(SCREEN_WIDTH * 0.82, 360),
    height: Math.min(SCREEN_WIDTH * 0.82, 360),
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
});
