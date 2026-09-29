/**
 * Interactive Touch Swipe Comparison Slider Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/ResultPanel.tsx
 * Allows smooth horizontal dragging to compare 10m Raw vs <4m Super-Resolved imagery.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../../lib/store";
import { LOCAL_IMAGES, resolveMediaUrl } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 32;
const SLIDER_HEIGHT = 280;

interface SwipeSliderProps {
  originalSource?: any;
  enhancedSource?: any;
}

export function SwipeSlider({ originalSource, enhancedSource }: SwipeSliderProps) {
  const state = useAppState();
  const [dividerPos, setDividerPos] = useState(SLIDER_WIDTH * 0.5);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // Derive sources from state.srResult if not directly passed
  const srRes = state.srResult;
  const originalUri = srRes?.originalUrl
    ? { uri: resolveMediaUrl(srRes.originalUrl) }
    : originalSource || LOCAL_IMAGES.lrClean;

  const enhancedUri = srRes?.enhancedUrl || srRes?.preview_image_url
    ? { uri: resolveMediaUrl(srRes.enhancedUrl || srRes.preview_image_url) }
    : enhancedSource || LOCAL_IMAGES.srClean;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPos = Math.max(20, Math.min(SLIDER_WIDTH - 20, gestureState.moveX - 16));
      setDividerPos(newPos);
    },
  });

  return (
    <View style={styles.container}>
      {/* Slider Viewport */}
      <View style={styles.sliderBox} {...panResponder.panHandlers}>
        {/* Layer 1: Enhanced <4m (Background) */}
        <Image
          source={enhancedUri}
          defaultSource={LOCAL_IMAGES.srClean}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Layer 2: Raw 10m (Clipped to left side of divider) */}
        <View style={[styles.clippedContainer, { width: dividerPos }]}>
          <Image
            source={originalUri}
            defaultSource={LOCAL_IMAGES.lrClean}
            style={[styles.image, { width: SLIDER_WIDTH }]}
            resizeMode="cover"
          />
        </View>

        {/* Divider Line & Handle */}
        <View style={[styles.divider, { left: dividerPos }]}>
          <View style={styles.dividerLine} />
          <View style={styles.handle}>
            <Ionicons name="swap-horizontal" size={13} color="#05070D" />
          </View>
        </View>

        {/* Floating Badges */}
        <View style={styles.labelLeft}>
          <Text style={styles.labelText}>10m Copernicus (Raw)</Text>
        </View>

        <View style={styles.labelRight}>
          <Text style={[styles.labelText, { color: "#2DD4BF" }]}>&lt;4m Reconstructed</Text>
        </View>

        {/* Fullscreen Expand Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setFullscreenVisible(true)}
          style={styles.expandBtn}
        >
          <Ionicons name="expand" size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Swipe Instruction Cue */}
      <View style={styles.cueRow}>
        <Ionicons name="hand-left-outline" size={12} color="#94A3B8" />
        <Text style={styles.cueText}>Drag divider horizontally to compare spatial resolution</Text>
      </View>

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sub-4m Reconstructed Imagery</Text>
                <Text style={styles.modalSub}>SwinIR dual-engine deep learning enhancement</Text>
              </View>
              <TouchableOpacity onPress={() => setFullscreenVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalImageContainer}>
              <Image
                source={enhancedUri}
                defaultSource={LOCAL_IMAGES.srClean}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              onPress={() => setFullscreenVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  sliderBox: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  image: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
  },
  clippedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  divider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#FFFFFF",
  },
  handle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  labelLeft: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  labelRight: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.3)",
  },
  labelText: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#E2E8F0",
  },
  expandBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  cueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
  },
  cueText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalImageContainer: {
    width: "100%",
    height: 330,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalCloseBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
