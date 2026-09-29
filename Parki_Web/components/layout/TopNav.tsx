"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/resolution", label: "Resolution" },
  { href: "/about", label: "About Us" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 inset-x-0 z-40 mx-auto w-[calc(100%-2rem)] max-w-5xl transition-all duration-300">
      <nav className="flex items-center justify-between rounded-full bg-[#05070D]/80 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 px-5 sm:px-6 py-2 sm:py-2.5 transition-all">
        {/* Rebranded Logo (Parkhi) - Satellite icon & SatSR text completely removed */}
        {/* --- START DEMO HACK --- */}
        <Link href="/" className="flex items-center group py-0.5">
          <Image
            src="/logoimages/new_logo.png"
            alt="Parkhi"
            width={160}
            height={32}
            priority
            className="h-7 sm:h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        {/* --- END DEMO HACK --- */}

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm shadow-sky-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-full transition-colors text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 rounded-2xl bg-[#05070D]/90 backdrop-blur-xl border border-white/15 shadow-2xl p-3">
          <ul className="flex flex-col gap-1.5">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}

