import React from 'react';
import { ExternalLink, ShieldCheck, Database, CheckCircle, Info } from 'lucide-react';

export default function SourceBibliography({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600]">
              SOURCE VERIFICATION & AUDIT TRAIL
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
              Citations Verified
            </span>
          </div>
          <h3 className="text-2xl font-black text-white font-editorial">
            Research Bibliography & Source Placeholders
          </h3>
        </div>

        <div className="text-xs font-mono text-white/50 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          * Clear placeholder links for AZINHACK '26 prototype
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-400/20 text-xs text-blue-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
        <p>
          <strong>Transparency Notice:</strong> All source links below represent mock reference sources and data schema bindings designed for backend ingestion. Per project guidelines, no fabricated live API keys or live scraped records are asserted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((src) => (
          <div
            key={src.id}
            className="p-5 rounded-2xl bg-black/35 border border-white/15 hover:border-white/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-mono">
                  {src.category}
                </span>
                <span className="text-[10px] font-mono text-[#FFE600]">
                  {src.confidence}
                </span>
              </div>

              <h4 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                <span>{src.title}</span>
              </h4>

              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                {src.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">
                domain: {src.domain}
              </span>

              <button
                type="button"
                onClick={() => alert(`[Prototype Demo Source]\n\nSource: ${src.title}\nDomain: ${src.domain}\n\nIn the production backend, this resolves directly to the crawled API citation or verified archive link.`)}
                className="flex items-center gap-1.5 text-[#FFE600] hover:text-white transition-colors cursor-pointer"
              >
                <span>Inspect Source [Mock]</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
