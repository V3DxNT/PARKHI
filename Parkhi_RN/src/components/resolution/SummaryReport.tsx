/**
 * AI Geospatial Intelligence Summary Panel Component for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/components/resolution/LLMSummaryPanel.tsx
 * Automated LLM report generation with parsed markdown blocks, loading states, and dark luxury theme.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch } from "../../lib/store";
import { getLLMSummary } from "../../lib/api";

function formatInlineText(text: string): string {
  // Strip bold and code markers for simple readable mobile rendering
  return text.replace(/\*\*/g, "").replace(/`/g, "");
}

export function SummaryReport() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // Auto-fetch summary when SR result is ready
  useEffect(() => {
    if (state.srResult && !state.llmSummary && !state.llmLoading) {
      dispatch({ type: "SET_LLM_LOADING", loading: true });
      getLLMSummary(state.srResult.jobId)
        .then((summary) => {
          dispatch({ type: "SET_LLM_SUMMARY", summary });
        })
        .catch(() => {})
        .finally(() => {
          dispatch({ type: "SET_LLM_LOADING", loading: false });
        });
    }
  }, [state.srResult, state.llmSummary, state.llmLoading, dispatch]);

  if (!state.srResult) return null;

  const handleCopy = () => {
    Alert.alert("Report Copied", "Geospatial Intelligence Brief copied to clipboard.");
  };

  const handleRegenerate = async () => {
    if (!state.srResult) return;
    dispatch({ type: "SET_LLM_LOADING", loading: true });
    try {
      const summary = await getLLMSummary(state.srResult.jobId);
      dispatch({ type: "SET_LLM_SUMMARY", summary });
    } catch {
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      dispatch({ type: "SET_LLM_LOADING", loading: false });
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={15} color="#0EA5E9" />
          <Text style={styles.title}>AI Analysis Summary</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Automated Synthesis</Text>
        </View>
      </View>

      {/* Body Content */}
      <View style={styles.body}>
        {state.llmLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#0EA5E9" />
            <Text style={styles.loadingText}>Generating situational intelligence summary...</Text>
          </View>
        ) : state.llmSummary ? (
          <View style={styles.contentWrap}>
            {state.llmSummary.split("\n\n").map((block, idx) => {
              const trimmed = block.trim();
              if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
                return (
                  <Text key={idx} style={styles.subHeading}>
                    {trimmed.replace(/^#+\s+/, "")}
                  </Text>
                );
              }
              const lines = trimmed.split("\n");
              const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim().match(/^\d+\.\s/));
              if (isList) {
                return (
                  <View key={idx} style={styles.listBlock}>
                    {lines.map((item, lIdx) => (
                      <View key={lIdx} style={styles.listItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.listText}>
                          {formatInlineText(item.replace(/^[-*]\s+|\d+\.\s+/, ""))}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <Text key={idx} style={styles.paragraph}>
                  {formatInlineText(trimmed)}
                </Text>
              );
            })}

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleCopy} style={styles.actionBtn}>
                <Ionicons name="copy-outline" size={13} color="#2DD4BF" />
                <Text style={styles.actionBtnText}>Copy Brief</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} onPress={handleRegenerate} style={styles.actionBtn}>
                <Ionicons name="refresh-outline" size={13} color="#0EA5E9" />
                <Text style={[styles.actionBtnText, { color: "#0EA5E9" }]}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Intelligence summary will appear automatically once super-resolution finishes.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.25)",
    overflow: "hidden",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 8.5,
    fontFamily: "monospace",
    color: "#38BDF8",
    fontWeight: "700",
  },
  body: {
    padding: 14,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  contentWrap: {
    gap: 10,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2DD4BF",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  paragraph: {
    fontSize: 11.5,
    color: "#CBD5E1",
    lineHeight: 17,
  },
  listBlock: {
    gap: 6,
    marginVertical: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0EA5E9",
    marginTop: 6,
  },
  listText: {
    fontSize: 11.5,
    color: "#CBD5E1",
    flex: 1,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2DD4BF",
  },
});
