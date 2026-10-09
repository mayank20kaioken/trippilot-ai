import React, { useState } from 'react';
import { 
  Sun, Sunset, Moon, Footprints, Train, MapPin, 
  Clock, Tag, Sparkles, ChevronRight, Check 
} from 'lucide-react';

export default function ItineraryTimeline({ days }) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  if (!days || days.length === 0) return null;
  const currentDay = days[activeDayIdx] || days[0];

  return (
    <div className="space-y-6">
      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day, idx) => (
          <button
            key={day.day}
            onClick={() => setActiveDayIdx(idx)}
            className={`px-5 py-3 rounded-2xl text-left shrink-0 transition-all border ${
              activeDayIdx === idx
                ? 'bg-[#FFE600] text-black border-[#FFE600] shadow-lg font-bold'
                : 'bg-black/30 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider opacity-80">
              DAY {day.day}
            </div>
            <div className="text-sm font-semibold truncate max-w-[140px]">
              {day.area}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Day Meta Bar */}
      <div className="p-4 rounded-2xl bg-[#091547]/80 border border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE600] block mb-0.5">
            THEME & FOCUS
          </span>
          <h4 className="text-base font-bold text-white font-editorial">
            Day {currentDay.day}: {currentDay.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-white/70 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Footprints className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>{currentDay.walkingPace}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Train className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentDay.transitTip}</span>
          </div>
        </div>
      </div>

      {/* Morning / Afternoon / Evening Timeline Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Morning */}
        {currentDay.slots?.morning && (
          <TimelineSlotCard
            period="Morning"
            icon={Sun}
            slot={currentDay.slots.morning}
            iconColor="text-amber-300"
            bgColor="bg-amber-400/10"
          />
        )}

        {/* Afternoon */}
        {currentDay.slots?.afternoon && (
          <TimelineSlotCard
            period="Afternoon"
            icon={Sunset}
            slot={currentDay.slots.afternoon}
            iconColor="text-orange-400"
            bgColor="bg-orange-500/10"
          />
        )}

        {/* Evening */}
        {currentDay.slots?.evening && (
          <TimelineSlotCard
            period="Evening"
            icon={Moon}
            slot={currentDay.slots.evening}
            iconColor="text-indigo-300"
            bgColor="bg-indigo-600/10"
          />
        )}
      </div>
    </div>
  );
}

function TimelineSlotCard({ period, icon: Icon, slot, iconColor, bgColor }) {
  return (
    <div className="rounded-2xl bg-black/40 border border-white/15 p-5 flex flex-col justify-between hover:border-white/30 transition-all hover:bg-black/55 shadow-lg text-left">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${bgColor} ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/90">
              {period}
            </span>
          </div>

          <span className="text-[11px] font-mono text-white/50 bg-white/10 px-2 py-0.5 rounded-md">
            {slot.time}
          </span>
        </div>

        {/* Title */}
        <h5 className="font-bold text-white text-base mb-1.5">
          {slot.title}
        </h5>

        {/* Location & Tag */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60 mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#FFE600]" />
            {slot.location}
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FFE600]/15 text-[#FFE600] font-medium">
            {slot.tag}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-white/75 leading-relaxed mb-4">
          {slot.description}
        </p>
      </div>

      {/* Footer & Agent Tip */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        {slot.agentTip && (
          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-400/20 text-[11px] text-blue-200">
            <span className="font-bold text-[#FFE600] block mb-0.5 font-mono text-[10px] uppercase">
              AGENT INSIDER TIP:
            </span>
            {slot.agentTip}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-mono text-white/50 pt-1">
          <span>Est: {slot.duration}</span>
          <span className="text-white/70">{slot.costNote}</span>
        </div>
      </div>
    </div>
  );
}
