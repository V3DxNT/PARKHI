/**
 * Side-by-Side Image Comparison Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/ResultPanel.tsx
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../../lib/store";
import { LOCAL_IMAGES, resolveMediaUrl } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 42) / 2;

interface SideBySideViewProps {
  originalSource?: any;
  enhancedSource?: any;
}

export function SideBySideView({ originalSource, enhancedSource }: SideBySideViewProps) {
  const state = useAppState();
  const [modalImage, setModalImage] = useState<{ uri: any; title: string } | null>(null);

  const srRes = state.srResult;
  const originalUri = srRes?.originalUrl
    ? { uri: resolveMediaUrl(srRes.originalUrl) }
    : originalSource || LOCAL_IMAGES.lrClean;

  const enhancedUri = srRes?.enhancedUrl || srRes?.preview_image_url
    ? { uri: resolveMediaUrl(srRes.enhancedUrl || srRes.preview_image_url) }
    : enhancedSource || LOCAL_IMAGES.srClean;

  return (
    <View style={styles.container}>
      {/* 10m Input Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalImage({ uri: originalUri, title: "10m Raw Copernicus Input" })}
        style={styles.imageCard}
      >
        <View style={styles.imageWrap}>
          <Image
            source={originalUri}
            defaultSource={LOCAL_IMAGES.lrClean}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.badgeLeft}>
            <Text style={styles.badgeText}>10m Raw</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Copernicus Input</Text>
      </TouchableOpacity>

      {/* <4m Super-Resolved Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalImage({ uri: enhancedUri, title: "Sub-4m Reconstructed Output" })}
        style={styles.imageCard}
      >
        <View style={styles.imageWrap}>
          <Image
            source={enhancedUri}
            defaultSource={LOCAL_IMAGES.srClean}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.badgeRight}>
            <Text style={styles.badgeText}>&lt;4m SR</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: "#2DD4BF" }]}>Super-Resolved</Text>
      </TouchableOpacity>

      {/* Fullscreen Inspector Modal */}
      <Modal
        visible={!!modalImage}
        transparent
        animationType="fade"
        onRequestClose={() => setModalImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalImage?.title}</Text>
              <TouchableOpacity onPress={() => setModalImage(null)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalImageWrap}>
              {modalImage?.uri && (
                <Image
                  source={modalImage.uri}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity onPress={() => setModalImage(null)} style={styles.modalCloseBtn}>
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
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  imageCard: {
    width: CARD_WIDTH,
  },
  imageWrap: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badgeLeft: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(5, 7, 13, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  badgeRight: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(20, 184, 166, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 6,
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
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
