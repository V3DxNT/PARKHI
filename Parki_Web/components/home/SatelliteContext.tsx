import Image from "next/image";

/**
 * Sentinel-2 Context Block — hero-scale ESA satellite image with verified mission facts.
 *
 * Image: ESA–P. Carril, CC BY-SA 3.0 IGO
 * Source: https://www.esa.int/ESA_Multimedia/Images/2008/11/Sentinel-2
 *
 * Facts verified against: https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2
 */

const SENTINEL_FACTS = [
  {
    stat: "Twin Constellation",
    detail:
      "Sentinel-2A (launched 23 June 2015) and Sentinel-2B (launched 7 March 2017) orbit in the same sun-synchronous plane, 180° apart.",
  },
  {
    stat: "13 Spectral Bands",
    detail:
      "The Multispectral Instrument (MSI) captures 13 bands at 10 m, 20 m, and 60 m spatial resolution — covering visible, near-infrared, and short-wave infrared wavelengths.",
  },
  {
    stat: "5-Day Revisit",
    detail:
      "With both satellites operating together, any point on the equator is revisited every 5 days (10 days with a single satellite), enabling near-real-time change monitoring.",
  },
  {
    stat: "Open & Free Data",
    detail:
      "All Sentinel-2 data is openly and freely accessible under the EU Copernicus Programme — no licensing fees, no restrictions on commercial or scientific use.",
  },
];

export function SatelliteContext() {
  return (
    <section className="bg-transparent py-20 relative z-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-secondary tracking-widest uppercase mb-3 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            DATA SOURCE
          </span>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Powered by Sentinel-2
          </h2>
          <p className="text-slate-300 text-base mt-3 leading-relaxed">
            The European Space Agency&apos;s Copernicus Sentinel-2 mission
            provides the multispectral imagery that our super-resolution pipeline
            enhances from 10 m to sub-4 m resolution.
          </p>
        </div>

        {/* Scaled-down satellite image */}
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <div className="rounded-2xl overflow-hidden bg-frame-dark border border-white/10 shadow-2xl">
            <Image
              src="/sentinel-2-esa.jpg"
              alt="Artist's impression of the Sentinel-2 satellite in orbit over Earth — ESA–P. Carril"
              width={1920}
              height={1080}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
          {/* Attribution */}
          <p className="text-[11px] text-slate-400/60 mt-2 text-center">
            Image: ESA–P. Carril · CC BY-SA 3.0 IGO ·{" "}
            <a
              href="https://www.esa.int/ESA_Multimedia/Images/2008/11/Sentinel-2"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-300 transition-colors"
            >
              Source
            </a>
          </p>
        </div>

        {/* Verified facts block with upgraded typography */}
        <div className="mx-auto max-w-4xl mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SENTINEL_FACTS.map((fact) => (
            <div
              key={fact.stat}
              className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-xl shadow-black/40 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(46,125,225,0.15)] group"
            >
              {/* Subtle top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-40 group-hover:opacity-100 group-hover:via-secondary transition-opacity duration-300" />
              <div className="font-[family-name:var(--font-space-grotesk)] text-base sm:text-lg font-bold text-primary mb-2 tracking-wide uppercase group-hover:text-sky-300 transition-colors">
                {fact.stat}
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                {fact.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
