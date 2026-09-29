/**
 * Uncertainty Confidence Map Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/ResultPanel.tsx
 * Displays anti-hallucination epistemic confidence bounds with threshold ratings in dark luxury theme.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../../lib/store";
import { LOCAL_IMAGES, resolveMediaUrl } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface UncertaintyViewProps {
  uncertaintySource?: any;
}

export function UncertaintyView({ uncertaintySource }: UncertaintyViewProps) {
  const state = useAppState();
  const [fullscreen, setFullscreen] = useState(false);

  const srRes = state.srResult;
  const uncertUri = srRes?.uncertaintyUrl
    ? { uri: resolveMediaUrl(srRes.uncertaintyUrl) }
    : uncertaintySource || LOCAL_IMAGES.hrPlot;

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={uncertUri}
          defaultSource={LOCAL_IMAGES.hrPlot}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Legend Overlay */}
        <View style={styles.legendOverlay}>
          <Text style={styles.legendTitle}>EPISTEMIC CONFIDENCE BOUNDS:</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>&gt;92% High Structural Confidence</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.legendText}>75–92% Vegetation / Boundary Variance</Text>
          </View>
        </View>

        {/* Expand Button */}
        <TouchableOpacity
          onPress={() => setFullscreen(true)}
          style={styles.expandBtn}
        >
          <Ionicons name="expand" size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.caption}>
        Epistemic Uncertainty Quantification: Bayesian Monte Carlo variance map verifying strict radiometric preservation without hallucinations.
      </Text>

      {/* Modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pixel-Wise Uncertainty Variance Heatmap</Text>
                <Text style={styles.modalSub}>Anti-hallucination verification matrix</Text>
              </View>
              <TouchableOpacity onPress={() => setFullscreen(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalImageWrap}>
              <Image
                source={uncertUri}
                defaultSource={LOCAL_IMAGES.hrPlot}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity onPress={() => setFullscreen(false)} style={styles.modalCloseBtn}>
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
  imageContainer: {
    width: SCREEN_WIDTH - 32,
    height: 280,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  legendOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(5, 7, 13, 0.85)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  legendTitle: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#2DD4BF",
    marginBottom: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  expandBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  caption: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
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
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalImageWrap: {
    width: "100%",
    height: 330,
    backgroundColor: "#000000",
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
