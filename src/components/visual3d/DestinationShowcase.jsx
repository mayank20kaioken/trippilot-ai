import React, { useState } from 'react';
import { MapPin, Sparkles, Compass, ArrowRight } from 'lucide-react';

const FEATURED_DESTINATIONS = [
  {
    name: "Kyoto, Japan",
    subtitle: "Ancient Zen & Bamboo Sanctuaries",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    badge: "Most Researched",
    vibe: "Serene & Culinary"
  },
  {
    name: "Amalfi Coast, Italy",
    subtitle: "Pastel Cliffs & Lemon Groves",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    badge: "Trending",
    vibe: "Romantic & Coastal"
  },
  {
    name: "Reykjavik & Ring Road",
    subtitle: "Cascades & Geothermal Lagoons",
    image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80",
    badge: "Expedition",
    vibe: "Wild & Cinematic"
  }
];

export default function DestinationShowcase({ onSelectDestination }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = FEATURED_DESTINATIONS[activeIdx];

  return (
    <div className="relative w-full max-w-[560px] mx-auto h-[400px] sm:h-[460px] lg:h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
      {/* Background Image */}
      <img
        src={current.image}
        alt={current.name}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1545]/90 via-[#0B1545]/30 to-black/20" />

      {/* Top badge */}
      <div className="absolute top-6 left-6 flex items-center">
        <span className="px-3.5 py-1.5 rounded-full bg-[#FFE600] text-black font-semibold text-xs tracking-wider uppercase shadow-md flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-black" />
          {current.badge}
        </span>
      </div>

      {/* Bottom Content Card */}
      <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/15 text-left">
        <div className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
          <MapPin className="w-3.5 h-3.5 text-[#FFE600]" />
          {current.vibe}
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-editorial mb-1">
          {current.name}
        </h3>
        <p className="text-white/80 text-sm mb-4">
          {current.subtitle}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {/* Thumbnails switcher */}
          <div className="flex gap-2">
            {FEATURED_DESTINATIONS.map((dest, idx) => (
              <button
                key={dest.name}
                onClick={() => setActiveIdx(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeIdx === idx ? 'bg-[#FFE600] w-6' : 'bg-white/40 hover:bg-white/70'
                }`}
                title={`Switch to ${dest.name}`}
              />
            ))}
          </div>

          <button
            onClick={() => onSelectDestination && onSelectDestination(current.name)}
            className="flex items-center gap-2 text-xs font-bold text-[#FFE600] hover:text-white transition-colors group/btn"
          >
            <span>Research this route</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
