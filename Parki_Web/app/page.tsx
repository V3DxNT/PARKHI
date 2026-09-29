import { HeroSection } from "@/components/home/HeroSection";
import { SatelliteContext } from "@/components/home/SatelliteContext";
import { ImageryShowcase } from "@/components/home/ImageryShowcase";
import { AnalysisTeaser } from "@/components/home/AnalysisTeaser";

export default function HomePage() {
  return (
    <div className="bg-surface min-h-screen text-slate-200">
      {/* Cinematic Space Hero Experience */}
      <HeroSection />

      {/* Smooth transition gradient blending 3D space scene into geospatial grid */}
      <div className="relative z-20 -mt-24 h-24 pointer-events-none bg-gradient-to-b from-transparent via-[#05070D]/70 to-[#05070D]" />

      {/* Geospatial Coordinate Grid Wrapper for post-hero content */}
      <div className="relative z-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Sentinel-2 Context Block */}
        <SatelliteContext />

        {/* Showcase + Analysis Teaser (Phase 2 Solution Reveal) */}
        <section id="solution-flow" className="scroll-mt-20 relative z-20 pt-8">
          <div className="mx-auto max-w-7xl px-6 pb-20">
            {/* Solution Pipeline Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-primary tracking-widest uppercase mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                END-TO-END SUPER RESOLUTION PIPELINE
              </span>
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
                From Raw 10m Sentinel-2 to &lt;4m Analytics
              </h2>
              <p className="text-slate-300 text-base mt-3 leading-relaxed">
                Our dual-engine ESRGAN + SwinIR deep learning architecture reconstructs fine spatial details, textures, and spectral signatures with quantifiable anti-hallucination confidence bounds.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-10">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
                LR (10m) → HR (5m) → SR (Fixed Normalization)
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Imagery Showcase */}
            <div className="mb-14">
              <ImageryShowcase />
            </div>

            {/* Analysis Teaser */}
            <div className="flex flex-col items-center gap-6">
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-white">
                Downstream Intelligence Capabilities
              </h3>
              <AnalysisTeaser />
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "<4m", label: "Output Resolution" },
                { value: "4×", label: "Enhancement Factor" },
                { value: "Real-time", label: "SSE Streaming" },
                { value: "3", label: "Analysis Modes" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-[#05070D]/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} SatSR — SIH 26142 • Generative AI Super-Resolution Platform
          </div>
        </footer>
      </div>
    </div>
  );
}
