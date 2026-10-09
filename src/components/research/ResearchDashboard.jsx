import React, { useState, useEffect } from 'react';
import { 
  Hotel, Train, Compass, UtensilsCrossed, Camera, 
  CheckCircle2, Loader2, Sparkles, FastForward, ShieldAlert, Terminal 
} from 'lucide-react';
import { SCOPE_CATEGORIES } from '../../data/scopeCategories';

const ICON_MAP = {
  Hotel,
  Train,
  Compass,
  UtensilsCrossed,
  Camera
};

const AGENT_LOG_MESSAGES = [
  { time: "+0.2s", sender: "Agent-Orchestrator", msg: "Initializing multi-agent pipeline for Kyoto, Japan (5-day scope)..." },
  { time: "+0.8s", sender: "Stays-Agent", msg: "Querying curated boutique accommodations and machiya ryokans..." },
  { time: "+1.4s", sender: "Transit-Agent", msg: "Parsing JR West rail networks, Kyoto City bus lines, and walking gradients..." },
  { time: "+2.1s", sender: "Attractions-Agent", msg: "Calculating crowd avoidance time windows for Arashiyama and Ginkaku-ji..." },
  { time: "+2.7s", sender: "Dining-Agent", msg: "Cross-referencing Bib Gourmand listings and local matcha tea house waitlists..." },
  { time: "+3.4s", sender: "Photo-Agent", msg: "Computing sunrise solar angles and golden-hour intervals for bamboo groves..." },
  { time: "+4.2s", sender: "Budget-Synthesizer", msg: "Balancing category allocations for Balanced Explorer profile ($2,840 target)..." },
  { time: "+5.0s", sender: "Agent-Orchestrator", msg: "Synthesis verified. Assembling day-by-day interactive itinerary..." }
];

export default function ResearchDashboard({
  selectedCategories,
  tripBrief,
  onComplete,
  onError
}) {
  const [overallProgress, setOverallProgress] = useState(0);
  const [categoryProgress, setCategoryProgress] = useState({});
  const [logs, setLogs] = useState([]);
  const [isFastForward, setIsFastForward] = useState(false);

  // Initialize progress for each selected category
  useEffect(() => {
    const initial = {};
    selectedCategories.forEach(catId => {
      initial[catId] = 0;
    });
    setCategoryProgress(initial);
  }, [selectedCategories]);

  // Simulation execution loop
  useEffect(() => {
    const speed = isFastForward ? 35 : 120; // ms interval
    const stepIncrement = isFastForward ? 8 : 2;

    const timer = setInterval(() => {
      setOverallProgress(prev => {
        const next = Math.min(prev + stepIncrement, 100);

        // Update category progress with natural staggered distribution
        setCategoryProgress(cp => {
          const updated = { ...cp };
          selectedCategories.forEach((catId, idx) => {
            const lag = idx * 12;
            const catTarget = Math.min(100, Math.max(0, (next - lag) * 1.25));
            updated[catId] = Math.round(catTarget);
          });
          return updated;
        });

        // Add telemetry logs based on percentage thresholds
        const logIndex = Math.floor((next / 100) * AGENT_LOG_MESSAGES.length);
        if (logIndex < AGENT_LOG_MESSAGES.length) {
          const currentLog = AGENT_LOG_MESSAGES[logIndex];
          setLogs(existing => {
            if (!existing.some(l => l.msg === currentLog.msg)) {
              return [...existing, currentLog];
            }
            return existing;
          });
        }

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 600);
        }

        return next;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [isFastForward, onComplete, selectedCategories]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 text-left">
      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#FFE600] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#FFE600] animate-ping" />
              <span>Multi-Agent Synthesis Engine</span>
              <span>•</span>
              <span>Active</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-editorial uppercase">
              Researching {tripBrief.destination || "Kyoto, Japan"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFastForward(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-[#FFE600] hover:text-black text-white text-xs font-mono font-bold uppercase transition-all"
              title="Speed up simulation for rapid judging evaluation"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Fast-Forward (Skip Wait)</span>
            </button>
            <button
              onClick={onError}
              className="text-xs px-3 py-2 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-mono"
              title="Test error boundary state"
            >
              Simulate Error
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center text-xs font-mono text-white/70 mb-2">
            <span>PIPELINE CONVERGENCE</span>
            <span className="text-[#FFE600] font-bold text-sm">{overallProgress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/40 p-0.5 border border-white/15 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#2B59FF] via-[#7B4DFF] to-[#FFE600] transition-all duration-200"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {SCOPE_CATEGORIES
          .filter(cat => selectedCategories.includes(cat.id))
          .map(cat => {
            const prog = categoryProgress[cat.id] || 0;
            const isDone = prog >= 100;
            const Icon = ICON_MAP[cat.icon] || Compass;

            return (
              <div
                key={cat.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDone 
                    ? 'bg-[#0E2068]/80 border-emerald-400/40 shadow-lg' 
                    : 'bg-black/35 border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-500 text-black' : 'bg-white/10 text-[#FFE600]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-sm">
                      {cat.shortName}
                    </h3>
                  </div>

                  {isDone ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      READY
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#FFE600]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {prog}%
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-white/60 mb-3 line-clamp-2">
                  {cat.description}
                </p>

                {/* Micro Progress Bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDone ? 'bg-emerald-400' : 'bg-[#FFE600]'
                    }`}
                    style={{ width: `${prog}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Terminal / Agent Thought Activity Stream */}
      <div className="rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 p-5 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-white/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FFE600]" />
            <span className="text-white font-semibold">Live Agent Telemetry Stream</span>
          </div>
          <span className="text-[10px] uppercase text-[#FFE600]">
            Demo Simulation Mode
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2.5 text-white/80 animate-in fade-in duration-150">
              <span className="text-white/40 text-[10px] shrink-0 mt-0.5">{log.time}</span>
              <span className="text-[#FFE600] text-[11px] shrink-0 font-bold">[{log.sender}]</span>
              <span className="text-white/90 text-xs">{log.msg}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-white/40 italic">Spinning up worker threads...</div>
          )}
        </div>
      </div>

      {/* Hackathon Prototype Transparency Banner */}
      <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-400/20 text-xs text-blue-200 flex items-center gap-3">
        <ShieldAlert className="w-4 h-4 text-[#FFE600] shrink-0" />
        <span>
          <strong>Prototype Agent Transparency:</strong> This execution demonstrates the frontend telemetry and progressive multi-category states for the AZINHACK '26 hackathon. In the future production release, real backend AI workers replace this mock agent simulator.
        </span>
      </div>
    </div>
  );
}
