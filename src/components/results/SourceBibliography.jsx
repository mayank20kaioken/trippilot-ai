import React from 'react';
import { ExternalLink, ShieldCheck, Database, CheckCircle, Info } from 'lucide-react';

export default function SourceBibliography({ sources }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="rounded-3xl bg-[#091547]/80 border border-white/15 p-8 text-center text-white/75 font-mono text-sm">
        No verified web citations are available for this run. No fabricated or placeholder citations were substituted.
      </div>
    );
  }

  const hasLiveSources = sources.some(s => s.is_live_result);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600]">
              SOURCE VERIFICATION & AUDIT TRAIL
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-bold ${
              hasLiveSources 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-white/10 text-white/70 border-white/20'
            }`}>
              {hasLiveSources ? "Live Web Verified" : "Demo Prototype Citations"}
            </span>
          </div>
          <h3 className="text-2xl font-black text-white font-editorial">
            Research Bibliography & Source Audit
          </h3>
        </div>

        <div className="text-xs font-mono text-white/50 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          {hasLiveSources 
            ? "* Direct links to crawled web sources retrieved via TinyFish"
            : "* Prototype demo baseline citations for AZINHACK '26"
          }
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-400/20 text-xs text-blue-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
        <p>
          {hasLiveSources ? (
            <span>
              <strong>Live Web Grounding:</strong> The citations below were retrieved live from web indices using TinyFish Search and Fetch APIs. Each entry links directly to the public web domain without fabricated credentials.
            </span>
          ) : (
            <span>
              <strong>Transparency Notice:</strong> All source links below represent mock baseline citations designed for schema testing. No live search occurred for this demo baseline view.
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((src) => {
          const isLive = Boolean(src.is_live_result);

          return (
            <div
              key={src.id}
              className={`p-5 rounded-2xl bg-black/35 border transition-all flex flex-col justify-between ${
                isLive ? 'border-emerald-500/40 hover:border-emerald-400' : 'border-white/15 hover:border-white/30'
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-mono">
                    {src.category || "Research Source"}
                  </span>
                  <span className={`text-[10px] font-mono ${
                    src.confidence?.includes('Social')
                      ? 'text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20'
                      : isLive
                        ? 'text-emerald-400 font-bold'
                        : 'text-[#FFE600]'
                  }`}>
                    {src.confidence || (isLive ? "Live Web Citation" : "Demo Reference")}
                  </span>
                </div>

                <h4 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2 break-words">
                  <span>{src.title}</span>
                </h4>

                <p className="text-xs text-white/70 mb-3 leading-relaxed break-words">
                  {src.snippet || src.summary}
                </p>

                {src.extracted_text_sample && (
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono text-white/60 mb-3 break-words">
                    <span className="text-emerald-400 font-bold block text-[10px] uppercase mb-0.5">
                      EXTRACTED EVIDENCE SAMPLE:
                    </span>
                    <span className="line-clamp-3 italic">
                      "{src.extracted_text_sample}"
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono min-w-0">
                <span className="text-white/40 truncate min-w-0 flex-1 max-w-[200px]" title={src.domain}>
                  domain: {src.domain}
                </span>

                {isLive ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer shrink-0"
                  >
                    <span>Open Live Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => alert(`[Prototype Demo Source]\n\nSource: ${src.title}\nDomain: ${src.domain}\n\nThis is a prototype demo citation.`)}
                    className="flex items-center gap-1.5 text-[#FFE600] hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Inspect Source [Mock]</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
