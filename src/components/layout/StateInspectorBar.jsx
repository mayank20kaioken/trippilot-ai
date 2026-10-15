import React, { useState } from 'react';
import { Sliders, ChevronUp, ChevronDown } from 'lucide-react';

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
    <aside
      aria-label="Demo Inspector"
      className={`fixed bottom-2.5 right-2.5 sm:right-4 z-30 transition-all ${
        isExpanded ? 'w-72 sm:w-80' : 'w-auto opacity-80 hover:opacity-100'
      }`}
    >
      <div
        className={`bg-[#071138]/90 backdrop-blur-xl border border-[#FFE600]/30 shadow-xl text-xs text-white transition-all ${
          isExpanded ? 'rounded-2xl p-3' : 'rounded-full px-3 py-1.5'
        }`}
      >
        {/* Compact Header Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 cursor-pointer select-none text-left"
        >
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-[#FFE600] shrink-0" />
            <span className="font-mono font-bold tracking-wider text-[#FFE600] uppercase text-[10px]">
              {isExpanded ? 'DEMO INSPECTOR • AZINHACK' : 'INSPECTOR'}
            </span>
          </div>
          <span className="text-white/60 hover:text-white">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </span>
        </button>

        {/* Collapsible Panel */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5 text-left">
            <div>
              <span className="text-[9px] font-mono uppercase text-white/50 block mb-1">
                JUMP TO VIEW STATE:
              </span>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <button
                  onClick={() => setCurrentView('hero')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'hero' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  1. Landing
                </button>
                <button
                  onClick={() => setCurrentView('scope')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'scope' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  2. Scope
                </button>
                <button
                  onClick={() => setCurrentView('research')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'research' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  3. Research
                </button>
                <button
                  onClick={() => setCurrentView('results')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'results' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  4. Results
                </button>
                <button
                  onClick={() => setCurrentView('empty')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'empty' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  5. Empty
                </button>
                <button
                  onClick={() => setCurrentView('error')}
                  className={`px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'error' ? 'bg-red-500 text-white font-bold border-red-500' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  6. Error
                </button>
                <button
                  onClick={() => setCurrentView('loading')}
                  className={`col-span-2 px-2 py-1 rounded-lg border text-left transition-colors ${
                    currentView === 'loading' ? 'bg-[#FFE600] text-black font-bold border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  7. Loading Skeleton
                </button>
              </div>
            </div>

            {/* City Preset Switcher */}
            <div>
              <span className="text-[9px] font-mono uppercase text-white/50 block mb-1">
                DEMO PRESET CITY:
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedCity("Kyoto, Japan")}
                  className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    selectedCity === "Kyoto, Japan" ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/70'
                  }`}
                >
                  Kyoto
                </button>
                <button
                  onClick={() => setSelectedCity("Amalfi Coast, Italy")}
                  className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    selectedCity === "Amalfi Coast, Italy" ? 'bg-[#FFE600]/20 text-[#FFE600] border-[#FFE600]' : 'bg-white/5 border-white/10 text-white/70'
                  }`}
                >
                  Amalfi
                </button>
              </div>
            </div>

            {/* Accessibility: Reduced Motion toggle */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white/70">Reduced Motion</span>
              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
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
