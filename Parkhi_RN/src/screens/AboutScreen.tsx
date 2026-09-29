/**
 * About Screen for Parkhi Mobile
 * Mirrored directly from Parki_Frontend/app/about/page.tsx
 * Project background, problem statement ID 26142, team roster, challenges, technical approach,
 * 4-step pipeline, and core platform benefits in dark luxury styling.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TeamMember {
  name: string;
  initials: string;
  gradient: [string, string];
  githubUrl?: string;
  isLead?: boolean;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Vedant Asthana",
    initials: "VA",
    gradient: ["#F59E0B", "#EA580C"],
    isLead: true,
    githubUrl: "https://github.com/V3DxNT",
  },
  {
    name: "Akshita Sanvi",
    initials: "AS",
    gradient: ["#3B82F6", "#4F46E5"],
  },
  {
    name: "Akshita Sohaney",
    initials: "AS",
    gradient: ["#2DD4BF", "#059669"],
  },
  {
    name: "Vivek Kashyap",
    initials: "VK",
    gradient: ["#10B981", "#0D9488"],
  },
  {
    name: "Sumit Kumar Sharma",
    initials: "SS",
    gradient: ["#38BDF8", "#2563EB"],
  },
  {
    name: "Arpita Singh",
    initials: "AS",
    gradient: ["#EC4899", "#E11D48"],
  },
];

const PROBLEM_CARDS = [
  {
    title: "Invisible Small Buildings & Narrow Infrastructure",
    desc: "In a 10m pixel (100 m² ground area), small rural homesteads and feeder roads merge into background soil, making infrastructure surveying guesswork.",
  },
  {
    title: "Blurry Crop Boundaries & Mixed-Pixel Distortion",
    desc: "Smallholder farming plots under 15m suffer spectral mixing across parcel edges, blurring distinct crop signatures and NDVI stress detection.",
  },
  {
    title: "Paralyzed Emergency Disaster Assessment",
    desc: "First responders need immediate answers during floods: Has this bridge collapsed? At 10m resolution, structural destruction is lost in blur.",
  },
  {
    title: "Prohibitive Cost of Commercial Tasking",
    desc: "Sub-meter satellites (WorldView, Planet) cost $15–$30/km² with multi-week tasking delays and restrictive single-user licenses.",
  },
];

const CHALLENGE_CARDS = [
  {
    title: "Preservation of Radiometric Consistency",
    desc: "Must preserve authentic Bottom-of-Atmosphere (BOA) reflectances across Blue, Green, Red, and NIR bands so biological indices like NDVI remain scientifically valid.",
  },
  {
    title: "Zero Tolerance for Hallucinated Structures",
    desc: "Unconstrained GANs invent plausible textures that do not exist on the ground. Erasing actual floodwaters or inventing roads can have disastrous consequences.",
  },
  {
    title: "Explicit Epistemic Uncertainty Quantification",
    desc: "Because sub-pixel details are inferred by deep learning, every reconstructed pixel must carry an explicit statistical confidence bound.",
  },
  {
    title: "Direct Downstream Analytical Interpretability",
    desc: "Enhanced product must be an analysis-ready 16-bit GeoTIFF that directly accelerates automated crop monitoring and urban footprint extraction.",
  },
];

const TECHNICAL_CARDS = [
  {
    title: "Hybrid Attention Transformer (MCDropoutHAT)",
    desc: "Combines Channel Self-Attention for spectral coherence with Overlapping Window Self-Attention for structural edge synthesis (2.5m GSD output).",
  },
  {
    title: "Paired Training on High-Resolution Earth Data",
    desc: "Trained on paired datasets (SEN2VENµS and aerial references), teaching the exact physical transfer function from 10m reflectances to ground truth.",
  },
  {
    title: "Bayesian Monte Carlo Epistemic Uncertainty",
    desc: "Executes multiple stochastic forward passes using MC Dropout to calculate pixel-by-pixel variance (σ²), verifying >92% model confidence.",
  },
  {
    title: "Integrated Multi-Sector Downstream AI Suite",
    desc: "The calibrated GeoTIFF feeds directly into Crop NDVI segmentation, Urban LULC footprint extraction, and Multi-temporal change detection.",
  },
];

const PIPELINE_STEPS = [
  {
    step: "01",
    badge: "Ingestion",
    title: "CDSE Raw Ingestion",
    desc: "Automated retrieval of raw Sentinel-2 Level-2A surface reflectance bands directly from Copernicus API.",
  },
  {
    step: "02",
    badge: "Inference",
    title: "MCDropoutHAT Engine",
    desc: "Batch inference scales spatial dimensions by 4× while simultaneously calculating epistemic uncertainty variance.",
  },
  {
    step: "03",
    badge: "Raster Export",
    title: "Scientific GeoTIFF",
    desc: "Outputs pure 16-bit multi-band GeoTIFFs preserving physical reflectances alongside high-contrast preview PNGs.",
  },
  {
    step: "04",
    badge: "Domain AI",
    title: "Downstream Models",
    desc: "Feeds high-resolution tensors into Crop NDVI segmentation, Urban LULC Res-UNet, and Disaster Assessment.",
  },
];

const PLATFORM_BENEFITS = [
  {
    tag: "Physics Preserved",
    title: "Scientific Radiometric Fidelity",
    desc: "Preserves physical surface reflectance values across spectral bands rather than producing purely cosmetic textures.",
    color: "#10B981",
  },
  {
    tag: "Zero Blind Trust",
    title: "Uncertainty Awareness",
    desc: "Integrated pixel-wise epistemic uncertainty metrics give geospatial analysts explicit confidence bounds.",
    color: "#0EA5E9",
  },
  {
    tag: "Native GeoTIFF",
    title: "Downstream AI Ready",
    desc: "Produces calibrated 16-bit GeoTIFF rasters ready for automated consumption by agricultural and urban neural networks.",
    color: "#2DD4BF",
  },
  {
    tag: "95%+ Savings",
    title: "Cost Efficiency",
    desc: "Unlocks commercial-grade spatial intelligence (<4m GSD) from free open Sentinel-2 data.",
    color: "#F59E0B",
  },
];

export function AboutScreen() {
  const handleOpenLinkedIn = () => {
    Linking.openURL("https://lnkd.in/p/g3FsiE9S");
  };

  const handleOpenGithub = (url?: string) => {
    if (url) Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Badges Header */}
        <View style={styles.badgeRow}>
          <View style={styles.parkhiBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.parkhiBadgeText}>Team Parkhi</Text>
          </View>
          <View style={styles.sihBadge}>
            <Text style={styles.sihBadgeText}>Problem Statement ID: 26142</Text>
          </View>
        </View>

        {/* Title & Headline */}
        <Text style={styles.mainTitle}>
          Scientific Super-Resolution for{" "}
          <Text style={{ color: "#2DD4BF" }}>Satellite Earth Observation</Text>
        </Text>

        <Text style={styles.mainSubtitle}>
          Transforming publicly available 10m and 20m Sentinel-2 multi-spectral data into sub-4m actionable intelligence. Engineered with pixel-wise epistemic uncertainty bounds and zero hallucinations.
        </Text>

        {/* LinkedIn Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenLinkedIn}
          style={styles.linkedInBtn}
        >
          <Ionicons name="logo-linkedin" size={16} color="#0EA5E9" />
          <Text style={styles.linkedInText}>LinkedIn Project Showcase</Text>
          <Ionicons name="open-outline" size={13} color="#94A3B8" />
        </TouchableOpacity>

        {/* Core Contributors Team Roster */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>CORE CONTRIBUTORS</Text>
          </View>
          <Text style={styles.sectionTitle}>The Engineering Team</Text>
          <Text style={styles.sectionSub}>The multidisciplinary team behind the satellite super-resolution platform.</Text>
        </View>

        <View style={styles.teamGrid}>
          {TEAM_MEMBERS.map((member) => (
            <View
              key={member.name}
              style={[
                styles.teamCard,
                member.isLead && styles.leadTeamCard,
              ]}
            >
              {member.isLead && <View style={styles.leadAccent} />}

              {/* Avatar Initials Circle */}
              <LinearGradient
                colors={member.gradient}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{member.initials}</Text>
              </LinearGradient>

              <Text style={styles.memberName}>{member.name}</Text>

              {member.isLead && (
                <View style={styles.leadBadgeWrap}>
                  <View style={styles.leadBadge}>
                    <View style={styles.leadDot} />
                    <Text style={styles.leadBadgeText}>Team Lead</Text>
                  </View>

                  {member.githubUrl && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenGithub(member.githubUrl)}
                      style={styles.githubBtn}
                    >
                      <Ionicons name="logo-github" size={12} color="#FFFFFF" />
                      <Text style={styles.githubText}>GitHub</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 1. Our Understanding of the Problem */}
        <View style={styles.infoSection}>
          <View style={styles.infoHead}>
            <View style={[styles.iconSquare, { backgroundColor: "rgba(244, 63, 94, 0.15)" }]}>
              <Ionicons name="alert-circle" size={18} color="#F43F5E" />
            </View>
            <Text style={styles.infoTitle}>Our Understanding of the Problem</Text>
          </View>
          <Text style={styles.infoLead}>
            Public earth observation constellations like Sentinel-2 provide an invaluable 5-day global revisit. However, their 10m Ground Sample Distance (GSD) creates severe operational blind spots:
          </Text>

          <View style={styles.cardsStack}>
            {PROBLEM_CARDS.map((item) => (
              <View key={item.title} style={styles.subCard}>
                <View style={styles.bulletRow}>
                  <View style={[styles.subDot, { backgroundColor: "#F43F5E" }]} />
                  <Text style={styles.subTitle}>{item.title}</Text>
                </View>
                <Text style={styles.subDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 2. Our Challenges */}
        <View style={styles.infoSection}>
          <View style={styles.infoHead}>
            <View style={[styles.iconSquare, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={styles.infoTitle}>Our Challenges</Text>
          </View>
          <Text style={styles.infoLead}>
            Satellite super-resolution is a rigorous geophysical challenge, not a cosmetic photo filter:
          </Text>

          <View style={styles.cardsStack}>
            {CHALLENGE_CARDS.map((item) => (
              <View key={item.title} style={styles.subCard}>
                <View style={styles.bulletRow}>
                  <View style={[styles.subDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.subTitle}>{item.title}</Text>
                </View>
                <Text style={styles.subDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Our Technical Approach */}
        <View style={styles.infoSection}>
          <View style={styles.infoHead}>
            <View style={[styles.iconSquare, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <Ionicons name="hardware-chip" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.infoTitle}>Our Technical Approach</Text>
          </View>

          <View style={styles.cardsStack}>
            {TECHNICAL_CARDS.map((item) => (
              <View key={item.title} style={styles.subCard}>
                <View style={styles.bulletRow}>
                  <View style={[styles.subDot, { backgroundColor: "#0EA5E9" }]} />
                  <Text style={styles.subTitle}>{item.title}</Text>
                </View>
                <Text style={styles.subDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Comprehensive Solution Pipeline */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>END-TO-END EXECUTION</Text>
          </View>
          <Text style={styles.sectionTitle}>Comprehensive Solution Pipeline</Text>
        </View>

        <View style={styles.cardsStack}>
          {PIPELINE_STEPS.map((s) => (
            <View key={s.step} style={styles.pipelineCard}>
              <View style={styles.pipelineHead}>
                <Text style={styles.pipelineStepNum}>{s.step}</Text>
                <View style={styles.pipelineBadge}>
                  <Text style={styles.pipelineBadgeText}>{s.badge}</Text>
                </View>
              </View>
              <Text style={styles.pipelineTitle}>{s.title}</Text>
              <Text style={styles.pipelineDesc}>{s.desc}</Text>
            </View>
          ))}
        </View>

        {/* 5. Core Platform Benefits */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Core Platform Benefits</Text>
        </View>

        <View style={styles.benefitsGrid}>
          {PLATFORM_BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitCard}>
              <View style={[styles.benefitBar, { backgroundColor: b.color }]} />
              <Text style={[styles.benefitTag, { color: b.color }]}>{b.tag}</Text>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Parkhi Geospatial Platform • Problem Statement ID: 26142 • Sentinel-2 Scientific Super-Resolution
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070D",
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  parkhiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DD4BF",
  },
  parkhiBadgeText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#2DD4BF",
    textTransform: "uppercase",
  },
  sihBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  sihBadgeText: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 30,
    marginBottom: 10,
  },
  mainSubtitle: {
    fontSize: 12,
    color: "#CBD5E1",
    lineHeight: 18,
    marginBottom: 16,
  },
  linkedInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  linkedInText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionPill: {
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  sectionPillText: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#38BDF8",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 24,
  },
  teamCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: "rgba(11, 17, 32, 0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    alignItems: "center",
  },
  leadTeamCard: {
    borderColor: "rgba(20, 184, 166, 0.4)",
    backgroundColor: "rgba(11, 17, 32, 0.9)",
  },
  leadAccent: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "#2DD4BF",
    borderRadius: 2,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  memberName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  leadBadgeWrap: {
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  leadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  leadDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2DD4BF",
  },
  leadBadgeText: {
    fontSize: 8.5,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#2DD4BF",
    textTransform: "uppercase",
  },
  githubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  githubText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 14,
    marginBottom: 16,
  },
  infoHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    flex: 1,
  },
  infoLead: {
    fontSize: 11.5,
    color: "#CBD5E1",
    lineHeight: 17,
    marginBottom: 12,
  },
  cardsStack: {
    gap: 10,
  },
  subCard: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  subDesc: {
    fontSize: 10.5,
    color: "#94A3B8",
    lineHeight: 15,
  },
  pipelineCard: {
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
  },
  pipelineHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pipelineStepNum: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "monospace",
    color: "rgba(45, 212, 191, 0.4)",
  },
  pipelineBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pipelineBadgeText: {
    fontSize: 9,
    fontFamily: "monospace",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  pipelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  pipelineDesc: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 16,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  benefitCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: "rgba(11, 17, 32, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
  },
  benefitBar: {
    width: 24,
    height: 2,
    borderRadius: 1,
    marginBottom: 6,
  },
  benefitTag: {
    fontSize: 8,
    fontFamily: "monospace",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 9.5,
    color: "#94A3B8",
    lineHeight: 14,
  },
  footerNote: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  footerNoteText: {
    fontSize: 9,
    fontFamily: "monospace",
    color: "#64748B",
    textAlign: "center",
  },
});
