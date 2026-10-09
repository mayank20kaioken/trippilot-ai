import React, { useState } from 'react';
import { 
  Sparkles, Calendar, MapPin, Users, DollarSign, Share2, 
  Printer, ArrowLeft, Check, Layers, ExternalLink, Bookmark 
} from 'lucide-react';
import ItineraryTimeline from './ItineraryTimeline';
import AccommodationCompare from './AccommodationCompare';
import AttractionGrid from './AttractionGrid';
import BudgetSummary from './BudgetSummary';
import SourceBibliography from './SourceBibliography';

export default function ResultsDashboard({
  tripData,
  onReset,
  onModifyScope
}) {
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'stays' | 'attractions' | 'budget' | 'sources'
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!tripData) return null;

  const { meta, days, accommodations, attractions, budgetBreakdown, sourcesBibliography } = tripData;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 text-left">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onModifyScope}
          className="flex items-center gap-2 text-xs font-mono uppercase text-white/70 hover:text-white px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Research Scope</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-bold uppercase transition-all ${
              saved ? 'bg-emerald-500 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{saved ? 'Saved to Bookmarks' : 'Save Itinerary'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold uppercase transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Share Plan'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold uppercase transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Trip Summary Card */}
      <div className="rounded-3xl bg-[#091547]/90 border border-white/20 p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFE600]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Eyebrow & Demo Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FFE600] text-black font-extrabold text-xs font-mono uppercase tracking-wider">
                SYNTHESIS COMPLETE
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 font-mono text-xs border border-white/10">
                {meta.confidenceScore}
              </span>
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-900/50 text-blue-200 text-[11px] font-mono border border-blue-400/30">
              Demo Prototype Data • AZINHACK '26
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-editorial tracking-tight uppercase mb-4">
            {meta.destination}
          </h2>

          <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed mb-6 italic">
            "{meta.generatedPrompt}"
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">DURATION</span>
              <span className="text-white font-bold text-sm">{meta.durationDays} Days</span>
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">BUDGET TARGET</span>
              <span className="text-[#FFE600] font-bold text-sm">${meta.totalEstimatedBudgetUsd.toLocaleString()} {meta.currency}</span>
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">GROUP DYNAMIC</span>
              <span className="text-white font-bold text-sm">{meta.groupSize}</span>
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">TRANSIT STRATEGY</span>
              <span className="text-white font-bold text-sm truncate block">{meta.transportPreference}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'itinerary'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          📅 Day-by-Day Itinerary ({days.length} Days)
        </button>

        <button
          onClick={() => setActiveTab('stays')}
          className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'stays'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          🏨 Curated Stays ({accommodations.length})
        </button>

        <button
          onClick={() => setActiveTab('attractions')}
          className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'attractions'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          📸 Sights & Photo Spots ({attractions.length})
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'budget'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          💰 Budget Breakdown
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'sources'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10'
          }`}
        >
          📑 Research Bibliography ({sourcesBibliography.length})
        </button>
      </div>

      {/* Render Active Tab Content */}
      <div className="min-h-[450px]">
        {activeTab === 'itinerary' && (
          <ItineraryTimeline days={days} />
        )}

        {activeTab === 'stays' && (
          <AccommodationCompare accommodations={accommodations} />
        )}

        {activeTab === 'attractions' && (
          <AttractionGrid attractions={attractions} />
        )}

        {activeTab === 'budget' && (
          <BudgetSummary budget={budgetBreakdown} />
        )}

        {activeTab === 'sources' && (
          <SourceBibliography sources={sourcesBibliography} />
        )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
        >
          Start New Search
        </button>

        <div className="text-xs font-mono text-white/50">
          TripPilot Engine v0.9 • Powered by GSAP, Three.js & React
        </div>
      </div>
    </div>
  );
}
