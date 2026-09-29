import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Parkhi",
  description:
    "Generative AI Super-Resolution platform turning medium-resolution satellite data into high-resolution decisions. Crop, urban, and disaster analysis powered by deep learning.",
  keywords: [
    "satellite imagery",
    "super resolution",
    "AI",
    "remote sensing",
    "GIS",
    "crop analysis",
    "urban analysis",
    "disaster analysis",
  ],
  icons: {
    icon: "/earth_satellite.png",
    shortcut: "/earth_satellite.png",
    apple: "/earth_satellite.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-surface">
        <TopNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
