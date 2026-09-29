/**
 * Voice & Quick AI Command Modal for Parkhi Mobile
 * Mirrored from Parki_Frontend/components/resolution/VoiceCommand.tsx
 * Allows spoken or simulated quick AI voice actions for hands-free geospatial exploration.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../lib/theme";

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

const VOICE_PRESETS = [
  { label: '🗣️ "Enhance this tile"', command: "enhance" },
  { label: '🗣️ "Search Sentinel-2 tiles"', command: "search" },
  { label: '🗣️ "Switch to Swipe compare"', command: "swipe" },
  { label: '🗣️ "Show uncertainty map"', command: "uncertainty" },
  { label: '🗣️ "Run crop classification"', command: "crop" },
  { label: '🗣️ "Run urban building mask"', command: "urban" },
  { label: '🗣️ "Assess disaster damage"', command: "disaster" },
  { label: '🗣️ "Go to Bangalore"', command: "bangalore" },
];

export function VoiceCommandModal({ isOpen, onClose, onCommand }: VoiceCommandModalProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  const handleSimulateListen = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const randomPreset = VOICE_PRESETS[Math.floor(Math.random() * VOICE_PRESETS.length)];
      setInputText(randomPreset.command);
    }, 1500);
  };

  const handleExecute = (cmd: string) => {
    const clean = cmd.toLowerCase().trim();
    if (!clean) return;
    onCommand(clean);
    setInputText("");
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.micCircle}>
                <Ionicons name="mic" size={18} color="#0EA5E9" />
              </View>
              <View>
                <Text style={styles.title}>Voice Command Assistant</Text>
                <Text style={styles.subtitle}>Speak or execute hands-free studio instructions</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Listening State or Input Box */}
          <View style={styles.body}>
            <View style={styles.inputWrap}>
              <Ionicons name="sparkles" size={16} color="#0EA5E9" style={{ marginLeft: 10 }} />
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleExecute(inputText)}
                placeholder="Type or tap a voice prompt..."
                placeholderTextColor="#64748B"
                style={styles.textInput}
              />
              {inputText.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleExecute(inputText)}
                  style={styles.sendBtn}
                >
                  <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Mic trigger button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSimulateListen}
              style={[styles.micBtn, isListening && styles.micBtnListening]}
            >
              {isListening ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.micBtnText}>Listening to microphone...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="mic" size={18} color="#FFFFFF" />
                  <Text style={styles.micBtnText}>Tap to Speak Voice Query</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Prompt Presets */}
            <Text style={styles.presetHeading}>AVAILABLE VOICE COMMANDS:</Text>
            <View style={styles.presetsList}>
              {VOICE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  activeOpacity={0.8}
                  onPress={() => handleExecute(p.command)}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetLabel}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
    backgroundColor: "#0B1120",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  micCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.3)",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 13,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  micBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.4)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  micBtnListening: {
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  micBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  presetHeading: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 4,
  },
  presetsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetLabel: {
    fontSize: 11,
    color: "#CBD5E1",
  },
});
