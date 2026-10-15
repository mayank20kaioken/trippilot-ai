import React, { useState } from 'react';
import { Hotel, Check, Star, MapPin, Info } from 'lucide-react';

export default function AccommodationCompare({ accommodations, destination = "" }) {
  const [selectedAccId, setSelectedAccId] = useState(accommodations?.[0]?.id);

  if (!accommodations || accommodations.length === 0) return null;

  const hasArchetypes = accommodations.some(a => a.isArchetype || !a.image);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-1">
            {hasArchetypes ? "ILLUSTRATIVE STAY ARCHETYPES (NON-BOOKABLE BENCHMARKS)" : "ACCOMMODATION ARBITRAGE MATRIX"}
          </span>
          <h3 className="text-2xl font-black text-white font-editorial">
            {hasArchetypes ? "Regional Stay Tier Comparison" : "Curated Stays Comparison"}
          </h3>
        </div>
        <div className="text-xs font-mono text-amber-200/90 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-400/30 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Illustrative stay tiers & benchmark rates — not real bookable hotel listings</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accommodations.map((acc) => {
          const isSelected = selectedAccId === acc.id;
          const isArchetype = Boolean(acc.isArchetype || !acc.image);
          const nightlyPrice = Math.max(15, Number(acc.pricePerNightUsd) || 0);
          const cleanDemo = (acc.pricePerNightDemo || '').replace(/^[~-]+\s*/, '');
          const nightlyDisplay = cleanDemo || `$${nightlyPrice} USD`;
          const summaryText = acc.matchReason || acc.description || "";
          const transitText = acc.transitMinutes || "Verify local transfer distance after selecting a real property";
          const sourceText = acc.sourceBadge || acc.agentBadge || "Illustrative Benchmark • Not a Bookable Listing";

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccId(acc.id)}
              className={`rounded-3xl overflow-hidden border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#0E2068] border-[#FFE600] ring-2 ring-[#FFE600]/40 shadow-2xl scale-[1.01]'
                  : 'bg-black/35 border-white/15 hover:border-white/30 hover:bg-black/50'
              }`}
            >
              {/* Header: Verified Demo Image OR Clean Archetype Banner (No overlapping absolute text) */}
              {!isArchetype && acc.image ? (
                <div className="relative h-44 w-full overflow-hidden bg-black/40 border-b border-white/10 shrink-0">
                  <img
                    src={acc.image}
                    alt={acc.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[#FFE600] text-[11px] font-mono font-bold border border-white/10 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#FFE600]" />
                      {acc.vibeScore}% Fit
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-br from-[#091547] via-[#10256e] to-[#060d2e] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FFE600]/15 border border-[#FFE600]/30 flex items-center justify-center text-[#FFE600] shrink-0">
                      <Hotel className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold block truncate">
                        Illustrative Stay Archetype
                      </span>
                      <span className="text-[10px] font-mono text-white/50 block truncate">
                        Not a real or bookable property
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#FFE600] text-[11px] font-mono font-bold border border-white/10 flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-[#FFE600]" />
                    {acc.vibeScore}% Fit
                  </span>
                </div>
              )}

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between text-left">
                <div>
                  {/* Property Name & Neighborhood Header */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE600] block mb-1">
                      {acc.type}
                    </span>
                    <h4 className="font-bold text-white text-base leading-snug break-words">
                      {acc.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />
                      <span className="break-words">{acc.neighborhood}</span>
                    </div>
                  </div>

                  {/* Dedicated Non-Overlapping Price & Archetype Box */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 block mb-0.5">
                        ESTIMATED BENCHMARK RATE
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-white font-editorial">
                          {nightlyDisplay}
                        </span>
                        <span className="text-[10px] font-mono text-white/60">
                          / night (Est.)
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                      Benchmark Model
                    </span>
                  </div>

                  <p className="text-xs text-white/75 mb-4 leading-relaxed break-words">
                    {summaryText}
                  </p>

                  {/* Pros */}
                  {Array.isArray(acc.pros) && acc.pros.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-mono uppercase text-white/50 block">BENCHMARK CHARACTERISTICS:</span>
                      {acc.pros.map((pro, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="break-words">{pro}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cons */}
                  {Array.isArray(acc.cons) && acc.cons.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-mono uppercase text-white/50 block">LIMITATIONS & VERIFICATION:</span>
                      {acc.cons.map((con, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <span className="w-3.5 text-center text-amber-300 font-bold shrink-0">!</span>
                          <span className="break-words">{con}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-start gap-1.5 text-xs text-white/70">
                    <MapPin className="w-3.5 h-3.5 text-[#FFE600] shrink-0 mt-0.5" />
                    <span className="break-words">{transitText}</span>
                  </div>

                  <div className="text-[10px] font-mono text-white/50 leading-snug break-words">
                    {sourceText}
                  </div>

                  <button
                    type="button"
                    className={`w-full mt-2 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? 'bg-[#FFE600] text-black shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isSelected
                      ? '✓ Selected Benchmark Profile'
                      : 'Compare Benchmark Profile'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
