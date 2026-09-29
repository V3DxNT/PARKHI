export function AnalysisTeaser() {
  const analyses = [
    {
      label: "Crop Analysis",
      tag: "Spectral Indices",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5 0.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      ),
      description: "NDVI-based crop type classification and biomass density mapping",
      iconColor: "text-secondary",
    },
    {
      label: "Urban Analysis",
      tag: "Spatial Morphology",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01" />
          <path d="M16 6h.01" />
          <path d="M12 6h.01" />
          <path d="M12 10h.01" />
          <path d="M12 14h.01" />
          <path d="M16 10h.01" />
          <path d="M16 14h.01" />
          <path d="M8 10h.01" />
          <path d="M8 14h.01" />
        </svg>
      ),
      description: "Built-up area segmentation, road network extraction & land use monitoring",
      iconColor: "text-primary",
    },
    {
      label: "Disaster Analysis",
      tag: "Change Detection",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
          <path d="m7.5 10.5 2 2" />
          <path d="m10.5 7.5 2 2" />
          <path d="m13.5 4.5 2 2" />
          <path d="m4.5 13.5 2 2" />
        </svg>
      ),
      description: "Flood boundary delineation, structural damage assessment & recovery metrics",
      iconColor: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {analyses.map((a) => (
        <div
          key={a.label}
          className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 shadow-2xl shadow-black/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(46,125,225,0.18)] group cursor-default"
        >
          {/* Top glowing accent border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-40 group-hover:opacity-100 group-hover:via-secondary transition-all duration-300" />

          {/* Header row with Icon + Tag */}
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${a.iconColor} group-hover:scale-110 transition-transform duration-200`}>
              {a.icon}
            </div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {a.tag}
            </span>
          </div>

          <h4 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-white mb-2 group-hover:text-sky-300 transition-colors">
            {a.label}
          </h4>

          <p className="text-sm text-slate-300 leading-relaxed">
            {a.description}
          </p>
        </div>
      ))}
    </div>
  );
}
