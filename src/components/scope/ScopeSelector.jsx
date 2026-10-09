import React from 'react';
import { 
  Hotel, Train, Compass, UtensilsCrossed, Camera, 
  CheckSquare, Square, Shield, Sparkles, AlertCircle, ArrowRight 
} from 'lucide-react';
import { SCOPE_CATEGORIES } from '../../data/scopeCategories';

const ICON_MAP = {
  Hotel,
  Train,
  Compass,
  UtensilsCrossed,
  Camera
};

export default function ScopeSelector({
  selectedCategories,
  setSelectedCategories,
  tripBrief,
  onOpenConfirmation,
  onBackToPrompt
}) {
  const toggleCategory = (id) => {
    setSelectedCategories(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // At least one category required
        return prev.filter(c => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const totalQueries = SCOPE_CATEGORIES
    .filter(cat => selectedCategories.includes(cat.id))
    .reduce((sum, cat) => sum + cat.queriesEstimate, 0);

  const totalSources = SCOPE_CATEGORIES
    .filter(cat => selectedCategories.includes(cat.id))
    .reduce((sum, cat) => sum + cat.sourcesCount, 0);

  return (
    <div id="scope-preview" className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 text-left">
      {/* Top Banner & Trip Summary Pill */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#FFE600] mb-1">
              <span>Agent Research Pipeline</span>
              <span>•</span>
              <span>Scope Configuration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-editorial uppercase">
              Configure Research Scope
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToPrompt}
              className="text-xs font-mono uppercase text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-white/10 transition-colors"
            >
              &larr; Edit Prompt
            </button>
          </div>
        </div>

        {/* Current Trip Brief Bar */}
        <div className="mt-4 p-4 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-white/50 uppercase">TARGET:</span>
            <span className="font-bold text-white text-sm bg-white/10 px-3 py-1 rounded-full border border-white/15">
              {tripBrief.destination || "Kyoto, Japan"}
            </span>
            <span className="font-mono text-white/50 uppercase">DURATION:</span>
            <span className="font-bold text-[#FFE600]">{tripBrief.durationDays || 5} Days</span>
            <span className="font-mono text-white/50 uppercase">STYLE:</span>
            <span className="text-white/80">{tripBrief.budgetTier || "Balanced Explorer"}</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-white/70">
            <span className="px-2.5 py-1 rounded-md bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30 font-bold">
              EST. {totalQueries} AGENT QUERIES
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white/10 text-white/80">
              ~{totalSources} SOURCES
            </span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-4 mb-10">
        <p className="text-sm text-white/75">
          Select which travel domains the TripPilot AI agents should investigate. Each selected scope defines autonomous query branches:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCOPE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            const Icon = ICON_MAP[cat.icon] || Compass;

            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#0E2068]/90 border-[#FFE600] shadow-lg shadow-[#0E2068]/50 ring-1 ring-[#FFE600]'
                    : 'bg-black/25 border-white/10 opacity-70 hover:opacity-100 hover:bg-black/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#FFE600] text-black' : 'bg-white/10 text-white'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-white text-base">
                        {cat.name}
                      </h3>
                    </div>
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-[#FFE600]" />
                    ) : (
                      <Square className="w-5 h-5 text-white/40" />
                    )}
                  </div>

                  <p className="text-xs text-white/70 mb-4 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mb-2">
                    <span>Queries: ~{cat.queriesEstimate}</span>
                    <span>Sources: {cat.sourcesCount}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.dataPoints.map((dp, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                        {dp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Confirmation Notice & CTA */}
      <div className="p-6 rounded-3xl bg-[#091547]/90 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/30 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base mb-1">
              Scope Verification Required Before Agent Launch
            </h4>
            <p className="text-xs text-white/70 max-w-xl">
              Per AZINHACK '26 safety & compute guardrails, research execution requires explicit user authorization of the target parameters.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenConfirmation}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black text-sm tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Confirm Scope & Launch</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}
