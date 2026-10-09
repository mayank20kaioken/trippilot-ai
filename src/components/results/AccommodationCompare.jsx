import React, { useState } from 'react';
import { Hotel, Check, X, Star, ShieldCheck, MapPin, Sparkles } from 'lucide-react';

export default function AccommodationCompare({ accommodations }) {
  const [selectedAccId, setSelectedAccId] = useState(accommodations?.[1]?.id || accommodations?.[0]?.id);

  if (!accommodations || accommodations.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-1">
            ACCOMMODATION ARBITRAGE MATRIX
          </span>
          <h3 className="text-2xl font-black text-white font-editorial">
            Curated Stays Comparison
          </h3>
        </div>
        <div className="text-xs font-mono text-white/50 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          * Rates & Availability are realistic prototype demo estimates
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accommodations.map((acc) => {
          const isSelected = selectedAccId === acc.id;

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
              {/* Image & Badges */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={acc.image}
                  alt={acc.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#FFE600] text-xs font-mono font-bold border border-white/10 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#FFE600]" />
                    {acc.vibeScore}% Vibe Match
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs text-white/90 font-medium">
                    {acc.neighborhood}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-black text-white font-editorial block leading-none">
                      {acc.pricePerNightDemo}
                    </span>
                    <span className="text-[10px] font-mono text-white/60">
                      / night (Demo)
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between text-left">
                <div>
                  <div className="mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE600] block">
                      {acc.type}
                    </span>
                    <h4 className="font-bold text-white text-base">
                      {acc.name}
                    </h4>
                  </div>

                  <p className="text-xs text-white/70 mb-4 leading-relaxed">
                    {acc.matchReason}
                  </p>

                  {/* Pros */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">PROS:</span>
                    {acc.pros.map((pro, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cons */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-mono uppercase text-white/50 block">TRADEOFFS:</span>
                    {acc.cons.map((con, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-3.5 text-center text-white/40 font-bold shrink-0">–</span>
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <MapPin className="w-3.5 h-3.5 text-[#FFE600]" />
                    <span>{acc.transitMinutes}</span>
                  </div>

                  <div className="text-[10px] font-mono text-white/50 truncate">
                    {acc.sourceBadge}
                  </div>

                  <button
                    type="button"
                    className={`w-full mt-2 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? 'bg-[#FFE600] text-black shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isSelected ? '✓ Selected in Itinerary' : 'Select This Stay'}
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
