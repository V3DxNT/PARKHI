/**
 * Area Surveillance Alerts Subscribe Modal for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/SubscribeModal.tsx
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../../lib/store";
import { subscribeAOI, type SubscribeResponse } from "../../lib/api";
import { THEME } from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCoords?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export function SubscribeModal({ isOpen, onClose, customCoords }: SubscribeModalProps) {
  const state = useAppState();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SubscribeResponse | null>(null);

  if (!isOpen) return null;

  // Resolve bounding box coordinates
  let minLat = 12.9658;
  let maxLat = 12.9774;
  let minLon = 77.5887;
  let maxLon = 77.6005;

  if (customCoords) {
    minLat = customCoords.minLat;
    maxLat = customCoords.maxLat;
    minLon = customCoords.minLon;
    maxLon = customCoords.maxLon;
  } else if (state.aoiGeometry) {
    const gAny = state.aoiGeometry as any;
    if (gAny.bounds && typeof gAny.bounds.minLat === "number") {
      minLat = gAny.bounds.minLat;
      maxLat = gAny.bounds.maxLat;
      minLon = gAny.bounds.minLng;
      maxLon = gAny.bounds.maxLng;
    } else if (state.aoiGeometry.type === "Polygon") {
      const coords = state.aoiGeometry.coordinates?.[0];
      if (coords && coords.length > 0) {
        minLon = coords[0][0];
        maxLon = coords[0][0];
        minLat = coords[0][1];
        maxLat = coords[0][1];
        for (const [lon, lat] of coords) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await subscribeAOI({
        email: trimmedEmail,
        min_lat: minLat,
        max_lat: maxLat,
        min_lon: minLon,
        max_lon: maxLon,
        geometry: state.aoiGeometry || undefined,
        jobId: state.srResult?.jobId,
        tileId: state.selectedTile?.tileId,
      });
      setSuccessResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to register subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setError(null);
    setSuccessResult(null);
    setEmail("");
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleResetAndClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Top glowing accent */}
          <View style={styles.topAccent} />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Area Surveillance Alerts</Text>
                <Text style={styles.modalSubtitle}>
                  Automated periodic Sentinel-2 intelligence reports
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleResetAndClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {successResult ? (
              <View style={styles.successBox}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={42} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Surveillance Activated</Text>
                <Text style={styles.successDesc}>{successResult.message}</Text>

                <View style={styles.coordBox}>
                  <Text style={styles.coordHeading}>TARGET AOI BOUNDS:</Text>
                  <Text style={styles.coordValue}>
                    {minLat.toFixed(4)}°N, {minLon.toFixed(4)}°E → {maxLat.toFixed(4)}°N, {maxLon.toFixed(4)}°E
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleResetAndClose}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.formInfo}>
                  Enter your email to receive automated high-resolution Sentinel-2 change detection and multi-spectral intelligence dossiers for this AOI every 3 hours.
                </Text>

                {/* Coordinates Info */}
                <View style={styles.coordBox}>
                  <Text style={styles.coordHeading}>TARGET AOI COORDINATES:</Text>
                  <Text style={styles.coordValue}>
                    SW: [{minLat.toFixed(4)}, {minLon.toFixed(4)}] • NE: [{maxLat.toFixed(4)}, {maxLon.toFixed(4)}]
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>RECIPIENT EMAIL</Text>
                  <View style={styles.inputFieldRow}>
                    <Ionicons name="at" size={16} color="#64748B" style={{ marginLeft: 10 }} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="analyst@agency.gov or user@domain.com"
                      placeholderTextColor="#64748B"
                      style={styles.inputField}
                    />
                  </View>
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={14} color="#F43F5E" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSubmit}
                  disabled={loading}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="notifications" size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Activate Surveillance Alerts</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#0B1120",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  topAccent: {
    height: 3,
    backgroundColor: "#10B981",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 16,
  },
  formContainer: {
    gap: 14,
  },
  formInfo: {
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 18,
  },
  coordBox: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  coordHeading: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#2DD4BF",
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 11,
    color: "#E2E8F0",
    fontFamily: "monospace",
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  inputFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 13,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 11,
    color: "#FB7185",
    flex: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  successIconWrap: {
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successDesc: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
