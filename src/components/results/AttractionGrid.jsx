import React, { useState } from 'react';
import { Compass, Clock, Users, Lightbulb, Camera, Sparkles } from 'lucide-react';

export default function AttractionGrid({ attractions }) {
  const [filter, setFilter] = useState('All');

  if (!attractions || attractions.length === 0) return null;

  const categories = ['All', ...new Set(attractions.map(a => a.category))];

  const filtered = filter === 'All' 
    ? attractions 
    : attractions.filter(a => a.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-1">
            CURATED SIGHTS & TIMED ENTRIES
          </span>
          <h3 className="text-2xl font-black text-white font-editorial">
            Sanctuaries, Heritage & Vantage Points
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/10 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                filter === cat
                  ? 'bg-[#FFE600] text-black font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((att) => (
          <div
            key={att.id}
            className="rounded-3xl overflow-hidden bg-black/40 border border-white/15 hover:border-white/30 transition-all flex flex-col sm:flex-row group text-left"
          >
            {/* Image */}
            <div className="relative sm:w-2/5 h-48 sm:h-auto overflow-hidden shrink-0">
              <img
                src={att.image}
                alt={att.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#FFE600] text-[11px] font-mono font-bold border border-white/10">
                  {att.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-lg mb-2">
                  {att.name}
                </h4>

                <p className="text-xs text-white/75 leading-relaxed mb-4">
                  {att.description}
                </p>

                {/* Timing & Crowds badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70 mb-4">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/40 uppercase text-[9px] mb-0.5">OPTIMAL WINDOW</div>
                    <div className="text-[#FFE600] font-bold">{att.bestTime}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white/40 uppercase text-[9px] mb-0.5">DWELL TIME</div>
                    <div className="text-white font-bold">{att.dwellTime}</div>
                  </div>
                </div>
              </div>

              {/* Insider Tip */}
              <div className="p-3 rounded-xl bg-[#0e1d5a] border border-[#FFE600]/30 text-xs text-white/90">
                <div className="flex items-center gap-1.5 text-[#FFE600] text-[10px] font-mono font-bold uppercase mb-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>CROWD-FREE INSIDER HINT</span>
                </div>
                <p className="text-[11px] leading-relaxed text-white/80">
                  {att.tip}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
