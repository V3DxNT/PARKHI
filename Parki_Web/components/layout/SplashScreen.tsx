"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

/**
 * Transparent, no-background Parkhi logos:
 * 0: English ("Parkhi - See Beyond the Pixels.")
 * 1: Hindi   ("पारखी - पिक्सेल से संभावनाओं तक।")
 * 2: Kannada ("ಪಾರಖಿ - ಪಿಕ್ಸೆಲ್ ನಿಂದ ಸಾಧ್ಯತೆಗಳಿಗೆ.")
 */
const LOGOS = [
  {
    src: "/logoimages/logo-bg.png",
    alt: "Parkhi - See Beyond the Pixels (English)",
  },
  {
    src: "/logoimages/logo3-bg.png",
    alt: "पारखी - पिक्सेल से संभावनाओं तक (Hindi)",
  },
  {
    src: "/logoimages/logo2-bg.png",
    alt: "ಪಾರಖಿ - ಪಿಕ್ಸೆಲ್ ನಿಂದ ಸಾಧ್ಯತೆಗಳಿಗೆ (Kannada)",
  },
];

export function SplashScreen() {
  const [currentLogoIndex, setCurrentLogoIndex] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [shouldRender, setShouldRender] = useState<boolean>(true);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      if (count < LOGOS.length) {
        setCurrentLogoIndex(count);
      } else {
        clearInterval(interval);
        setIsVisible(false);
      }
    }, 1500);

    // Unmount from DOM after the 1000ms fade-out transition completes
    const unmountTimer = setTimeout(() => {
      setShouldRender(false);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0B1120] transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isVisible}
    >
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] max-w-[85vw] max-h-[85vw]">
        {LOGOS.map((logo, index) => {
          const isActive = currentLogoIndex === index;
          return (
            <div
              key={logo.src}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                priority={index === 0}
                className="object-contain"
                sizes="(max-width: 640px) 288px, (max-width: 768px) 384px, 440px"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
