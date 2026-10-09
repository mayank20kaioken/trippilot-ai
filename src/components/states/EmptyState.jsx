import React from 'react';
import { Compass, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { PROMPT_SUGGESTIONS } from '../../data/promptSuggestions';

export default function EmptyState({ onSelectPreset, onGoToStudio }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6 text-[#FFE600]">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-2">
        STANDBY • NO ACTIVE TRIP PIPELINE
      </span>

      <h2 className="text-3xl sm:text-4xl font-black text-white font-editorial mb-4">
        Ready when you are.
      </h2>

      <p className="text-white/70 text-sm max-w-md mx-auto mb-8 leading-relaxed">
        You haven't initiated a travel research agent yet. Enter a destination prompt or pick one of our curated prototype itineraries below:
      </p>

      {/* Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8">
        {PROMPT_SUGGESTIONS.map((sug) => (
          <div
            key={sug.label}
            onClick={() => onSelectPreset(sug.prompt)}
            className="p-4 rounded-2xl bg-black/40 border border-white/15 hover:border-[#FFE600] hover:bg-black/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white group-hover:text-[#FFE600] transition-colors">
                {sug.label}
              </span>
              <span className="text-[10px] font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                {sug.duration} Days
              </span>
            </div>
            <p className="text-xs text-white/70 line-clamp-2">
              {sug.prompt}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onGoToStudio}
        className="px-8 py-3.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-xl inline-flex items-center gap-2 cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-black" />
        <span>Open Trip Prompt Studio</span>
      </button>
    </div>
  );
}
