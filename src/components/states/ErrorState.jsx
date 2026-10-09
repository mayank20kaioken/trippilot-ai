import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function ErrorState({
  errorMessage = "Research pipeline timed out cross-referencing regional transit timetables and high-speed rail constraints.",
  onRetry,
  onBackToScope
}) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-6 text-red-400">
        <AlertTriangle className="w-10 h-10 animate-bounce" />
      </div>

      <span className="text-xs font-mono uppercase tracking-widest text-red-400 block mb-2 font-bold">
        SYNTHESIS EXCEPTION DETECTED
      </span>

      <h2 className="text-3xl sm:text-4xl font-black text-white font-editorial mb-4">
        Research Pipeline Halted
      </h2>

      <div className="p-4 rounded-2xl bg-black/50 border border-red-500/30 text-xs font-mono text-red-200 mb-8 max-w-lg mx-auto text-left leading-relaxed">
        <div className="text-red-400 font-bold mb-1">[ERROR CODE: E_AGENT_TIMEOUT]</div>
        {errorMessage}
      </div>

      <p className="text-white/70 text-sm max-w-md mx-auto mb-8 leading-relaxed">
        Our agent workers encountered a connection delay with upstream transit data schemas. You can trigger an automatic retry or adjust your search constraints.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={onRetry}
          className="px-8 py-3.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-xl inline-flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-black" />
          <span>Retry Research Pipeline</span>
        </button>

        <button
          onClick={onBackToScope}
          className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Scope</span>
        </button>
      </div>
    </div>
  );
}
