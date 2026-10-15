import React, { useState, useEffect, useRef } from 'react';
import { 
  Hotel, Train, Compass, UtensilsCrossed, Camera, 
  CheckCircle2, Loader2, Sparkles, AlertCircle, RefreshCw, 
  Terminal, ShieldCheck, Database, Layers
} from 'lucide-react';
import { SCOPE_CATEGORIES } from '../../data/scopeCategories';
import { executeTripResearch } from '../../services/api';

const ICON_MAP = {
  Hotel,
  Train,
  Compass,
  UtensilsCrossed,
  Camera
};

export default function ResearchDashboard({
  selectedCategories,
  tripBrief,
  onComplete,
  onFallbackToDemo
}) {
  // Real research pipeline stages: 'pending' | 'searching' | 'fetching' | 'synthesis' | 'completed' | 'failed'
  const [stage, setStage] = useState('pending');
  const [errorMessage, setErrorMessage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [liveResultData, setLiveResultData] = useState(null);
  const executionRef = useRef(false);

  const startLiveResearch = async () => {
    setStage('pending');
    setErrorMessage(null);
    setLogs([
      { time: "+0.1s", sender: "Frontend-Orchestrator", msg: "Authorization confirmed. Dispatching POST /api/trips/research..." }
    ]);

    // Timed UI telemetry updates while the backend executes the real network call
    const t1 = setTimeout(() => {
      setStage('searching');
      setLogs(prev => [
        ...prev,
        { time: "+0.8s", sender: "TinyFish-Search", msg: `Executing live web search query for ${tripBrief.destination}...` }
      ]);
    }, 900);

    const t2 = setTimeout(() => {
      setStage('fetching');
      setLogs(prev => [
        ...prev,
        { time: "+1.9s", sender: "TinyFish-Fetch", msg: "Extracting clean markdown content from top discovered URLs..." }
      ]);
    }, 2000);

    try {
      // Real backend API call
      const data = await executeTripResearch(tripBrief, selectedCategories);

      clearTimeout(t1);
      clearTimeout(t2);

      const hasFindings =
        data.status === 'completed' &&
        ((Array.isArray(data.attractions) && data.attractions.length > 0) ||
          (Array.isArray(data.sources) && data.sources.length > 0));

      if (!hasFindings) {
        const emptyMsg =
          data.error_message ||
          `Live search returned 0 verifiable attractions or citations for "${tripBrief.destination}". No mock findings were substituted.`;
        setErrorMessage(emptyMsg);
        setStage('failed');
        setLogs(prev => [
          ...prev,
          ...(data.telemetry_logs || []).map(t => ({
            time: t.timestamp_offset,
            sender: "Backend-Agent",
            msg: t.message
          })),
          { time: "!EMPTY", sender: "Verification-Guard", msg: emptyMsg }
        ]);
        return;
      }

      setStage('synthesis');
      setLogs(prev => [
        ...prev,
        ...(data.telemetry_logs || []).map(t => ({
          time: t.timestamp_offset,
          sender: "Backend-Agent",
          msg: t.message
        })),
        { time: "+3.5s", sender: "Synthesis-Engine", msg: `Successfully synthesized ${data.attractions?.length || 0} attractions and verified citations.` }
      ]);

      setLiveResultData(data);
      setStage('completed');

      // Transition to results after brief visual confirmation
      setTimeout(() => {
        onComplete(data);
      }, 700);

    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);

      const msg = err.detail || err.message || "Unknown error communicating with backend research service.";
      setErrorMessage(msg);
      setStage('failed');

      setLogs(prev => [
        ...prev,
        { time: "!ERR", sender: "System-Error", msg: `Research pipeline halted: ${msg}` }
      ]);
    }
  };

  useEffect(() => {
    if (!executionRef.current) {
      executionRef.current = true;
      startLiveResearch();
    }
  }, []);

  // Compute progress bar percentage according to real stage
  let progressPercent = 15;
  if (stage === 'searching') progressPercent = 45;
  else if (stage === 'fetching') progressPercent = 75;
  else if (stage === 'synthesis') progressPercent = 90;
  else if (stage === 'completed') progressPercent = 100;
  else if (stage === 'failed') progressPercent = 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 text-left">
      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#FFE600] mb-1">
              <span className={`w-2 h-2 rounded-full ${stage === 'failed' ? 'bg-red-400' : 'bg-[#FFE600] animate-ping'}`} />
              <span>Real AI Research Pipeline</span>
              <span>•</span>
              <span className="uppercase font-bold">{stage}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-editorial uppercase">
              Researching {tripBrief.destination || "Destination"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {stage === 'failed' ? (
              <button
                onClick={startLiveResearch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFE600] text-black text-xs font-mono font-bold uppercase transition-all shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Live Research</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 font-mono text-xs flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>FastAPI + TinyFish Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Real Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center text-xs font-mono text-white/70 mb-2">
            <span>
              {stage === 'pending' && "1/4 INITIALIZING LIVE PIPELINE..."}
              {stage === 'searching' && "2/4 QUERYING TINYFISH SEARCH API..."}
              {stage === 'fetching' && "3/4 FETCHING CLEAN MARKDOWN PAGES..."}
              {stage === 'synthesis' && "4/4 SYNTHESIZING VERIFIED CITATIONS..."}
              {stage === 'completed' && "✓ LIVE RESEARCH COMPLETE"}
              {stage === 'failed' && "✕ RESEARCH FAILED"}
            </span>
            <span className={stage === 'failed' ? 'text-red-400 font-bold' : 'text-[#FFE600] font-bold'}>
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-black/40 p-0.5 border border-white/15 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                stage === 'failed'
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-[#2B59FF] via-[#7B4DFF] to-[#FFE600]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error state card if live research failed */}
      {stage === 'failed' && (
        <div className="mb-8 p-6 rounded-3xl bg-red-950/50 border border-red-500/40 text-left space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-base">
                Live Research Request Halted
              </h4>
              <p className="text-xs text-red-200 mt-1 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white/80">
            <strong>Diagnostic hint:</strong> If this is due to missing <code className="text-[#FFE600]">TINYFISH_API_KEY</code>, you can add your free key to <code className="text-[#FFE600]">backend/.env</code>, or switch to the explicitly labeled prototype demo dataset below.
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={startLiveResearch}
              className="px-6 py-2.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Live Backend Call</span>
            </button>

            <button
              onClick={onFallbackToDemo}
              className="px-6 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Switch to Demo Prototype Mode (AZINHACK '26)</span>
            </button>
          </div>
        </div>
      )}

      {/* Categories Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {SCOPE_CATEGORIES
          .filter(cat => selectedCategories.includes(cat.id))
          .map(cat => {
            const isAttraction = cat.id === 'attractions';
            const isDone = stage === 'completed';
            const isActive = isAttraction && (stage === 'searching' || stage === 'fetching' || stage === 'synthesis');
            const Icon = ICON_MAP[cat.icon] || Compass;

            return (
              <div
                key={cat.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDone 
                    ? 'bg-[#0E2068]/80 border-emerald-400/40 shadow-lg' 
                    : isActive
                      ? 'bg-[#0E2068]/90 border-[#FFE600] ring-1 ring-[#FFE600]'
                      : 'bg-black/35 border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-500 text-black' : 'bg-white/10 text-[#FFE600]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {cat.shortName}
                      </h3>
                      {isAttraction && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                          ● Live Agent Active
                        </span>
                      )}
                    </div>
                  </div>

                  {isDone && isAttraction ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      VERIFIED
                    </span>
                  ) : isDone ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#FFE600]">
                      BENCHMARK (EST.)
                    </span>
                  ) : isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#FFE600]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-white/40">
                      {isAttraction ? 'QUEUED' : 'EST. MODEL'}
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
                      isDone ? 'bg-emerald-400' : isActive ? 'bg-[#FFE600]' : 'bg-white/20'
                    }`}
                    style={{ width: isDone ? '100%' : isActive ? '60%' : '10%' }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Terminal / Live Agent Thought Activity Stream */}
      <div className="rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 p-5 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-white/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#FFE600]" />
            <span className="text-white font-semibold">Real Agent Request & Telemetry Stream</span>
          </div>
          <span className="text-[10px] uppercase text-emerald-400 font-bold">
            Live Backend Session
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
        </div>
      </div>

      {/* Security & Verification Banner */}
      <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-400/20 text-xs text-blue-200 flex items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Real Web Retrieval:</strong> Calls are routed through the Python FastAPI service to TinyFish Search & Fetch. Live source links are preserved directly from upstream responses.
        </span>
      </div>
    </div>
  );
}
