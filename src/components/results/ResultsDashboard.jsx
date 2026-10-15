import React, { useState } from 'react';
import { 
  Sparkles, Calendar, MapPin, Users, DollarSign, Share2, 
  Printer, ArrowLeft, Check, Layers, ExternalLink, Bookmark, ShieldCheck, ShieldAlert, Database 
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
  const [activeTab, setActiveTab] = useState('attractions'); // prioritize attractions where live data is available
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!tripData) return null;

  const { meta, days, accommodations, attractions, budgetBreakdown, sourcesBibliography, isLiveResearch } = tripData;

  const hasBudgetTarget =
    typeof meta.budgetTarget === 'number' &&
    !Number.isNaN(meta.budgetTarget) &&
    meta.budgetTarget > 0;
  const budgetCurrency = meta.budgetCurrency || meta.currency || 'USD';

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 text-left">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onModifyScope}
          className="flex items-center gap-2 text-xs font-mono uppercase text-white/70 hover:text-white px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Research Scope</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
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
          {/* Eyebrow & Live vs Demo Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full font-extrabold text-xs font-mono uppercase tracking-wider ${
                isLiveResearch 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-[#FFE600] text-black'
              }`}>
                {isLiveResearch ? "LIVE AGENT SYNTHESIS COMPLETE" : "SYNTHESIS COMPLETE"}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 font-mono text-xs border border-white/10">
                {meta.confidenceScore}
              </span>
            </div>

            <span className={`px-3 py-1 rounded-full text-[11px] font-mono border ${
              isLiveResearch 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                : 'bg-blue-900/50 text-blue-200 border-blue-400/30'
            }`}>
              {isLiveResearch ? "Live TinyFish Grounded Result" : "Demo Prototype Data • AZINHACK '26"}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-editorial tracking-tight uppercase mb-4">
            {meta.destination}
          </h2>

          <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed mb-6 italic">
            "{meta.originalPrompt || meta.generatedPrompt}"
          </p>

          {/* Live Grounding Banner */}
          {isLiveResearch && (
            (() => {
              const verifiedCount = (attractions || []).filter(
                a => (a.geographic_status || 'in_destination') === 'in_destination' || a.geographic_status === 'nearby_excursion'
              ).length;
              if (verifiedCount > 0) {
                return (
                  <div className="p-3.5 mb-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start sm:items-center gap-3 text-xs text-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      <strong>Grounding Transparency:</strong> Only <strong>Sights & Attractions</strong> ({verifiedCount} verified findings) and <strong>Research Citations</strong> are live-verified via TinyFish. Stays, day schedules, transit strategies, and budget allocations are illustrative benchmarks (not live-crawled).
                    </span>
                  </div>
                );
              }
              return (
                <div className="p-3.5 mb-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start sm:items-center gap-3 text-xs text-amber-200">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    <strong>Live Research Grounding Advisory:</strong> Web citations were retrieved for {meta.destination}, but 0 attractions could be verified as confirmed municipal sights from this crawl. Itinerary days remain flexible exploration days pending local landmark verification.
                  </span>
                </div>
              );
            })()
          )}

          {/* Budget Warning Banner when user's explicit budgetTarget is below estimated cost */}
          {meta.isUnderBudget && meta.budgetWarning && (
            <div className="p-3.5 mb-6 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-start sm:items-center gap-3 text-xs text-amber-100">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="text-amber-300">Budget Alert:</strong> {meta.budgetWarning}
              </span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">DURATION</span>
              <span className="text-white font-bold text-sm">{meta.durationDays} Days</span>
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">
                {hasBudgetTarget ? 'REQUESTED BUDGET vs BENCHMARK' : 'GROUP BENCHMARK (ILLUSTRATIVE)'}
              </span>
              {hasBudgetTarget ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#FFE600] font-bold text-sm">
                    {budgetCurrency === 'USD' ? '$' : `${budgetCurrency} `}
                    {meta.budgetTarget.toLocaleString()} {budgetCurrency}
                  </span>
                  <span className="text-white/60 text-xs">
                    (Benchmark: ${meta.totalEstimatedBudgetUsd?.toLocaleString() || '1,050'} USD)
                  </span>
                </div>
              ) : (
                <span className="text-[#FFE600] font-bold text-sm">
                  ${meta.totalEstimatedBudgetUsd?.toLocaleString() || "1,050"} {meta.currency || "USD"} (Group Est.)
                </span>
              )}
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">GROUP DYNAMIC</span>
              <span className="text-white font-bold text-sm">{meta.groupType || meta.groupSize}</span>
            </div>
            <div>
              <span className="text-white/40 uppercase text-[10px] block mb-1">TRANSIT STRATEGY</span>
              <span className="text-white font-bold text-xs leading-snug block whitespace-normal break-words">
                {meta.transportPreference}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs — Wrap cleanly on desktop and mobile so no tab is clipped */}
      <div
        role="tablist"
        aria-label="Trip Results Sections"
        className="flex flex-wrap items-center gap-2 pb-4 mb-8 border-b border-white/10"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'attractions'}
          onClick={() => setActiveTab('attractions')}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'attractions'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>📸 Sights & Attractions ({attractions?.length || 0})</span>
          {isLiveResearch && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold" title="Live Researched via TinyFish">
              LIVE
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'sources'}
          onClick={() => setActiveTab('sources')}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'sources'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>📑 Research Citations ({sourcesBibliography?.length || 0})</span>
          {isLiveResearch && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold" title="Live Web Citations via TinyFish">
              LIVE
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'itinerary'}
          onClick={() => setActiveTab('itinerary')}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'itinerary'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>📅 Day-by-Day Outline ({days?.length || 0} Days)</span>
          <span className={`text-[9px] font-mono ${activeTab === 'itinerary' ? 'text-black/70' : 'text-white/50'}`}>(Est.)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'stays'}
          onClick={() => setActiveTab('stays')}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'stays'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🏨 Stay Archetypes ({accommodations?.length || 0})</span>
          <span className={`text-[9px] font-mono ${activeTab === 'stays' ? 'text-black/70' : 'text-white/50'}`}>(Est.)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'budget'}
          onClick={() => setActiveTab('budget')}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'budget'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>💰 Budget Breakdown</span>
          <span className={`text-[9px] font-mono ${activeTab === 'budget' ? 'text-black/70' : 'text-white/50'}`}>(Est.)</span>
        </button>
      </div>

      {/* Render Active Tab Content */}
      <div className="min-h-[450px]">
        {activeTab === 'attractions' && (
          <AttractionGrid attractions={attractions} destination={meta.destination} />
        )}

        {activeTab === 'sources' && (
          <SourceBibliography sources={sourcesBibliography} />
        )}

        {activeTab === 'itinerary' && (
          <ItineraryTimeline days={days} />
        )}

        {activeTab === 'stays' && (
          <AccommodationCompare accommodations={accommodations} destination={meta.destination} />
        )}

        {activeTab === 'budget' && (
          <BudgetSummary budget={budgetBreakdown} />
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
          TripPilot Engine v0.2.0 • Powered by FastAPI, TinyFish & React
        </div>
      </div>
    </div>
  );
}
