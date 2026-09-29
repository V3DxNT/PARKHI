/**
 * Central configuration for the Cinematic Space Experience
 */

export const SPACE_CONFIG = {
  // Container scroll height (expanded to 450vh for deep cinematic pacing & multi-phase text storytelling)
  sectionHeight: "450vh",

  // Animation timeline breakdown (scroll progress 0.0 to 1.0)
  timeline: {
    orbitStart: 0.05,       // 5%: satellite begins orbital flight
    orbitEnd: 0.88,         // 88%: satellite reaches opposite horizon
    occlusionStart: 0.84,   // 84%: satellite approaches Earth's right limb
    occlusionEnd: 0.94,     // 94%: satellite fully dips behind the planet
    transitionStart: 0.92,  // 92%: dark space begins brightening to light theme
    transitionEnd: 1.0,     // 100%: full light theme, handoff to solution section
  },

  // Orbit path geometry (relative normalized coordinates [0..100]%)
  orbit: {
    startX: 8,
    startY: 20,
    apexX: 50,
    apexY: 8,
    endX: 92,
    endY: 54,
  },

  // Star field settings
  stars: {
    count: 160,
    minSize: 1,
    maxSize: 2.2,
    minOpacity: 0.2,
    maxOpacity: 0.85,
  },
} as const;
