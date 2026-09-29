"use client";

import React from "react";
import Image from "next/image";

interface EarthProps {
  scrollProgress: number;
}

export function Earth({ scrollProgress }: EarthProps) {
  const parallaxY = scrollProgress * -40;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Earth image — full viewport width, anchored to bottom */}
      <div
        className="absolute bottom-0 left-0 w-full will-change-transform"
        style={{
          /*
           * clamp min is 340px so on narrow mobile (390px wide) the image
           * is tall enough to show the Earth surface well above the fold.
           * 56vw tracks the natural 16:9 proportion at any viewport width.
           */
          height: "clamp(340px, 56vw, 820px)",
          transform: `translateY(${parallaxY}px)`,
          zIndex: 10,
        }}
      >
        <Image
          src="/assets/space/earth/earth-clean-horizon.jpg"
          alt="Earth Horizon from Space"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Top fade — dissolves into the dark space background above */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(3,7,18,1) 0%, rgba(3,7,18,0) 22%)",
          }}
        />
      </div>

      {/* Bottom vignette — satellite occlusion mask */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "18vh",
          zIndex: 30,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(3,7,18,0.6) 50%, rgba(3,7,18,1) 100%)",
        }}
      />
    </div>
  );
}
