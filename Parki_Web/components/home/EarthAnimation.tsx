"use client";

import { useMemo } from "react";

/* Simple seeded PRNG to avoid hydration mismatch */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function EarthAnimation() {
  const stars = useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 60 }).map(() => ({
      w: rand() * 2 + 1,
      top: rand() * 100,
      left: rand() * 100,
      opacity: rand() * 0.6 + 0.2,
      duration: rand() * 3 + 2,
      delay: rand() * 3,
    }));
  }, []);

  return (
    <div className="gradient-border w-full max-w-[520px] aspect-square mx-auto">
      <div className="gradient-border-inner w-full h-full bg-frame-dark relative flex items-center justify-center overflow-hidden">
        {/* Star field */}
        <div className="absolute inset-0">
          {stars.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${star.w}px`,
                height: `${star.w}px`,
                top: `${star.top}%`,
                left: `${star.left}%`,
                opacity: star.opacity,
                animation: `twinkle ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Earth */}
        <div className="relative w-[55%] aspect-square">
          {/* Atmosphere glow */}
          <div
            className="absolute -inset-4 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(46,125,225,0.5) 0%, rgba(20,184,166,0.3) 40%, transparent 70%)",
            }}
          />

          {/* Earth body */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #1a6fb5 0%, #0f4c81 25%, #1a7a4f 35%, #145f3e 45%, #0d3b5e 60%, #0a2540 80%, #050d1a 100%)",
              boxShadow:
                "inset -20px -20px 40px rgba(0,0,0,0.5), inset 10px 10px 30px rgba(255,255,255,0.1), 0 0 60px rgba(46,125,225,0.3)",
            }}
          >
            {/* Continent shapes (CSS approximation) */}
            <div
              className="absolute rounded-full"
              style={{
                width: "40%",
                height: "25%",
                top: "20%",
                left: "20%",
                background:
                  "radial-gradient(ellipse, #2d8a56 0%, #1a6b3d 60%, transparent 100%)",
                transform: "rotate(-15deg)",
                filter: "blur(2px)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: "25%",
                height: "35%",
                top: "35%",
                left: "55%",
                background:
                  "radial-gradient(ellipse, #2d8a56 0%, #1a6b3d 60%, transparent 100%)",
                transform: "rotate(10deg)",
                filter: "blur(2px)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: "20%",
                height: "15%",
                top: "60%",
                left: "30%",
                background:
                  "radial-gradient(ellipse, #3d9a66 0%, #2a7a4d 60%, transparent 100%)",
                filter: "blur(1.5px)",
              }}
            />
            {/* Cloud wisps */}
            <div
              className="absolute w-full h-full rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.15) 0%, transparent 30%), radial-gradient(ellipse at 60% 50%, rgba(255,255,255,0.1) 0%, transparent 25%), radial-gradient(ellipse at 45% 70%, rgba(255,255,255,0.08) 0%, transparent 20%)",
                animation: "spin 120s linear infinite",
              }}
            />
          </div>
        </div>

        {/* Orbiting satellites */}
        {[
          { size: "85%", duration: "8s", delay: "0s", satSize: 6 },
          { size: "105%", duration: "12s", delay: "-4s", satSize: 5 },
          { size: "125%", duration: "16s", delay: "-8s", satSize: 4 },
        ].map((orbit, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: orbit.size,
              height: orbit.size,
              animation: `orbit ${orbit.duration} linear infinite`,
              animationDelay: orbit.delay,
            }}
          >
            {/* Satellite dot */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2"
              style={{
                width: `${orbit.satSize}px`,
                height: `${orbit.satSize}px`,
              }}
            >
              <div
                className="w-full h-full rounded-full bg-secondary"
                style={{
                  boxShadow: `0 0 ${orbit.satSize * 2}px rgba(20,184,166,0.6)`,
                }}
              />
            </div>
            {/* Orbit trail (faint ellipse) */}
            <div
              className="absolute inset-0 rounded-full border border-white/5"
              style={{ transform: `rotate(${i * 60}deg) rotateX(60deg)` }}
            />
          </div>
        ))}

        {/* Scan line effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(46,125,225,0.02) 3px, rgba(46,125,225,0.02) 4px)",
          }}
        />

        <style jsx>{`
          @keyframes orbit {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes twinkle {
            0%,
            100% {
              opacity: 0.2;
            }
            50% {
              opacity: 0.8;
            }
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
