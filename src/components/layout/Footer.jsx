import React from 'react';
import { ShieldCheck, Heart, Terminal, Compass, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#081238] mt-20 pt-12 pb-10 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-1 font-editorial text-2xl font-black tracking-tight text-white uppercase">
              <span>TRIP</span>
              <span className="w-2 h-2 rounded-full bg-[#FFE600] inline-block mb-0.5" />
              <span>PILOT</span>
              <span className="text-xs font-mono text-white/50 ml-2">AI AGENT</span>
            </div>
            <p className="text-xs text-white/70 max-w-sm leading-relaxed">
              Autonomous travel research engine built for AZINHACK '26. Synthesizes natural-language trip intentions into source-backed itineraries across boutique stays, transit networks, and crowd-free cultural timing.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero fabricated citations • Strict mock data separation</span>
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="md:col-span-4 space-y-2">
            <h5 className="text-xs font-mono uppercase tracking-wider text-[#FFE600] font-bold">
              Engineering Architecture
            </h5>
            <ul className="text-xs text-white/70 space-y-1.5 font-mono">
              <li>• React 19 + Vite + Modern JavaScript</li>
              <li>• GSAP Staggered Editorial Choreography</li>
              <li>• Three.js Interactive 3D Tactile Sculpture</li>
              <li>• Tailwind CSS Engine + Accessible Contrast</li>
              <li>• Standalone Mock Dataset Bindings for Backend Swapping</li>
            </ul>
          </div>

          {/* Hackathon Metadata */}
          <div className="md:col-span-3 space-y-2">
            <h5 className="text-xs font-mono uppercase tracking-wider text-[#FFE600] font-bold">
              AZINHACK '26
            </h5>
            <div className="text-xs text-white/60 space-y-1">
              <div>Team: Frontend & Product Design</div>
              <div>Status: Frontend Prototype Ready</div>
              <div>Backend Integration: Schema-ready for Python FastAPI</div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-white/40">
          <div>
            © 2026 TripPilot AI • Built for AZINHACK '26. All prototype data clearly labeled.
          </div>
          <div className="flex items-center gap-4">
            <span>Accessible Design</span>
            <span>•</span>
            <span>WCAG Contrast Checked</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
