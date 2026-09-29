"use client";

import React, { useMemo } from "react";
import { SPACE_CONFIG } from "./config";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface StarFieldProps {
  progress: number;
}

export function StarField({ progress }: StarFieldProps) {
  const stars = useMemo(() => {
    const rand = seededRandom(1337);
    const { count, minSize, maxSize, minOpacity, maxOpacity } = SPACE_CONFIG.stars;
    
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 85, // concentrate in the upper 85% of the viewport (above Earth)
      size: rand() * (maxSize - minSize) + minSize,
      opacity: rand() * (maxOpacity - minOpacity) + minOpacity,
      twinkleDuration: rand() * 3 + 2.5,
      twinkleDelay: rand() * 4,
      hue: rand() > 0.8 ? (rand() > 0.5 ? "rgba(224, 242, 254, " : "rgba(254, 243, 199, ") : "rgba(255, 255, 255, ",
    }));
  }, []);

  // Fade out stars during transition (progress 0.90 -> 1.0)
  const fadeOpacity = Math.max(0, Math.min(1, 1 - (progress - 0.88) / 0.1));

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300"
      style={{ opacity: fadeOpacity }}
      aria-hidden="true"
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: `${star.hue}${star.opacity})`,
            boxShadow:
              star.size > 1.8
                ? `0 0 ${star.size * 2}px ${star.hue}${star.opacity * 0.8})`
                : "none",
            animation: `star-twinkle ${star.twinkleDuration}s ease-in-out infinite`,
            animationDelay: `${star.twinkleDelay}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes star-twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}
