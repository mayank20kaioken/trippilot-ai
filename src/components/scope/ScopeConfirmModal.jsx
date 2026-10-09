import React from 'react';
import { ShieldCheck, X, Check, ArrowRight, AlertTriangle, Cpu } from 'lucide-react';
import { SCOPE_CATEGORIES } from '../../data/scopeCategories';

export default function ScopeConfirmModal({
  isOpen,
  onClose,
  tripBrief,
  selectedCategories,
  onConfirmLaunch
}) {
  if (!isOpen) return null;

  const categories = SCOPE_CATEGORIES.filter(c => selectedCategories.includes(c.id));
  const totalQueries = categories.reduce((sum, c) => sum + c.queriesEstimate, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#091547] border border-[#FFE600]/40 rounded-3xl shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0e1d5a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFE600] text-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFE600] block">
                MANDATORY CONFIRMATION
              </span>
              <h3 className="text-xl font-black text-white font-editorial">
                Authorize AI Agent Research Pipeline
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-white/80 leading-relaxed">
            Please review and authorize the research parameters before the multi-agent synthesis begins. Once launched, agents will execute parallel queries across your authorized categories.
          </p>

          {/* Research Summary Card */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/50 uppercase">TARGET DESTINATION:</span>
              <span className="text-white font-bold">{tripBrief.destination || "Kyoto, Japan"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/50 uppercase">DURATION & GROUP:</span>
              <span className="text-[#FFE600] font-bold">{tripBrief.durationDays || 5} Days • {tripBrief.groupSize || "Romantic Couple"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-white/50 uppercase">BUDGET & TRANSIT:</span>
              <span className="text-white">{tripBrief.budgetTier || "Balanced Explorer"} • {tripBrief.transportPreference || "Scenic Trains"}</span>
            </div>
            <div className="pt-1">
              <span className="text-white/50 uppercase block mb-2">AUTHORIZED RESEARCH SCOPE:</span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(c => (
                  <span key={c.id} className="px-2.5 py-1 rounded-full bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/30 text-[11px] font-sans font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {c.shortName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Hackathon Prototype Transparency Notice */}
          <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-400/30 flex items-start gap-3 text-xs text-blue-200">
            <Cpu className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">AZINHACK '26 Architecture Note:</strong> In this prototype session, the frontend will orchestrate ~{totalQueries} simulated research traces and display realistic, source-backed itinerary data with strict separation from mock services.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-[#060e30] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
          >
            Cancel / Edit
          </button>

          <button
            type="button"
            onClick={onConfirmLaunch}
            className="px-6 sm:px-8 py-3 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>Confirm & Launch Research</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
