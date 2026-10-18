import React from 'react';
import { ShieldCheck, Compass, Sparkles, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#081238] mt-20 pt-14 pb-12 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Brand Info & Mission */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center gap-1 font-editorial text-2xl font-black tracking-tight text-white uppercase">
              <span>TRIP</span>
              <span className="w-2 h-2 rounded-full bg-[#FFE600] inline-block mb-0.5" />
              <span>PILOT</span>
              <span className="text-[10px] font-mono text-black font-extrabold ml-2 px-1.5 py-0.5 rounded bg-[#FFE600]">AI</span>
            </div>
            <p className="text-xs sm:text-sm text-white/70 max-w-md leading-relaxed">
              Autonomous travel research engine that synthesizes natural-language trip intentions into source-grounded itineraries, verified attractions, and transparent budget baselines.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Source-Grounded Citations • Strict Evidence Integrity</span>
            </div>
          </div>

          {/* Hackathon Attribution */}
          <div className="md:col-span-5 space-y-3">
            <h5 className="text-xs font-mono uppercase tracking-wider text-[#FFE600] font-bold">
              AZINHACK '26
            </h5>
            <div className="text-xs text-white/70 space-y-2">
              <p className="leading-relaxed">
                TripPilot AI was built for <span className="text-white font-semibold">AZINHACK '26</span>.
              </p>
              <p className="text-white/50 text-[11px] leading-relaxed">
                All research findings retain canonical live source links. Accommodation and budget benchmarks represent illustrative planning baselines.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-white/45">
          <div>
            © 2026 TripPilot AI • Built for AZINHACK '26. All prototype data and research sources transparently cited.
          </div>
          <div className="flex items-center gap-4 text-white/40">
            <span>Source-Grounded Travel Intelligence</span>
            <span>•</span>
            <span>Accessible Design</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
