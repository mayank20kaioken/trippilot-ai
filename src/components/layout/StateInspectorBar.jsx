import React, { useState } from 'react';
import { Sliders, Eye, RefreshCw, AlertCircle, Sparkles, Check, ChevronUp, ChevronDown } from 'lucide-react';

export default function StateInspectorBar({
  currentView,
  setCurrentView,
  selectedCity,
  setSelectedCity,
  reducedMotion,
  setReducedMotion
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside aria-label="Demo Inspector" className="fixed bottom-3 right-3 sm:right-6 z-40 max-w-sm">
      <div className="rounded-2xl bg-[#071138]/95 backdrop-blur-xl border border-[#FFE600]/40 shadow-2xl p-2.5 text-xs text-white">
        {/* Header Toggle */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between gap-3 px-2 py-1 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFE600] animate-pulse" />
            <span className="font-mono font-bold tracking-wider text-[#FFE600] uppercase text-[11px]">
              DEMO INSPECTOR • HACKATHON
            </span>
          </div>
          <button className="text-white/60 hover:text-white p-1">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsible Panel */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-3 px-1 text-left">
            <div>
              <span className="text-[10px] font-mono uppercase text-white/50 block mb-1.5">
                JUMP TO REQUIRED STATE:
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <button
                  onClick={() => setCurrentView('hero')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'hero' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  1. Landing / Hero
                </button>
                <button
                  onClick={() => setCurrentView('scope')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'scope' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  2. Scope Preview
                </button>
                <button
                  onClick={() => setCurrentView('research')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'research' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  3. Research Progress
                </button>
                <button
                  onClick={() => setCurrentView('results')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'results' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  4. Results Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('empty')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'empty' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  5. Empty State
                </button>
                <button
                  onClick={() => setCurrentView('error')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'error' ? 'bg-red-500 text-white font-bold border-red-500' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  6. Error & Retry
                </button>
                <button
                  onClick={() => setCurrentView('loading')}
                  className={`col-span-2 px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    currentView === 'loading' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  7. Shimmer Loading Skeleton
                </button>
              </div>
            </div>

            {/* City Preset Switcher */}
            <div>
              <span className="text-[10px] font-mono uppercase text-white/50 block mb-1.5">
                SAMPLE DATASET BINDING:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCity("Kyoto, Japan")}
                  className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                    selectedCity === "Kyoto, Japan" ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/70'
                  }`}
                >
                  Kyoto, Japan
                </button>
                <button
                  onClick={() => setSelectedCity("Amalfi Coast, Italy")}
                  className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                    selectedCity === "Amalfi Coast, Italy" ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/70'
                  }`}
                >
                  Amalfi Coast
                </button>
              </div>
            </div>

            {/* Accessibility: Reduced Motion toggle */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-white/70">Reduced Motion</span>
              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                  reducedMotion ? 'bg-[#FFE600] text-black' : 'bg-white/20 text-white'
                }`}
              >
                {reducedMotion ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
