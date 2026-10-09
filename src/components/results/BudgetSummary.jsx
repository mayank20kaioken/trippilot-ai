import React, { useState } from 'react';
import { DollarSign, PieChart, Users, ShieldAlert, Sparkles } from 'lucide-react';

export default function BudgetSummary({ budget }) {
  const [isPerPerson, setIsPerPerson] = useState(false);

  if (!budget) return null;

  const multiplier = isPerPerson ? 0.5 : 1;
  const displayTotal = Math.round(budget.totalUsd * multiplier);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-1">
            FINANCIAL SYNTHESIS & RUNWAY
          </span>
          <h3 className="text-2xl font-black text-white font-editorial">
            Projected Trip Budget Allocation
          </h3>
        </div>

        {/* Toggle Per-Person vs Group */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/10 text-xs">
          <button
            onClick={() => setIsPerPerson(false)}
            className={`px-3 py-1.5 rounded-full transition-all ${
              !isPerPerson
                ? 'bg-[#FFE600] text-black font-bold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Total for Group (${budget.totalUsd.toLocaleString()})
          </button>
          <button
            onClick={() => setIsPerPerson(true)}
            className={`px-3 py-1.5 rounded-full transition-all ${
              isPerPerson
                ? 'bg-[#FFE600] text-black font-bold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Per Person (${budget.perPersonUsd.toLocaleString()})
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-[#091547]/80 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Master Budget Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="text-xs font-mono uppercase text-white/50 block mb-1">
              {isPerPerson ? 'ESTIMATED PER TRAVELER' : 'TOTAL ESTIMATED TRIP BUDGET'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white font-editorial">
                ${displayTotal.toLocaleString()}
              </span>
              <span className="text-sm font-mono text-[#FFE600] font-bold">
                USD (Demo Benchmark)
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-white/60 font-mono">
            <span>Group: 2 Adults</span>
            <span className="mx-2">•</span>
            <span>Style: Balanced Explorer</span>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        <div>
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-black/50 border border-white/10">
            {budget.categories.map((cat, i) => (
              <div
                key={i}
                style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                title={`${cat.name}: ${cat.percentage}%`}
                className="h-full transition-all hover:opacity-90"
              />
            ))}
          </div>
        </div>

        {/* Category Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {budget.categories.map((cat, i) => {
            const catAmount = Math.round(cat.amount * multiplier);

            return (
              <div
                key={i}
                className="p-4 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <h5 className="font-semibold text-white text-xs">
                      {cat.name}
                    </h5>
                    <span className="text-[10px] font-mono text-white/50">
                      {cat.percentage}% of total
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-white font-mono block">
                    ${catAmount.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-white/40 uppercase">
                    Demo Est.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent Synthesis Note */}
        {budget.agentNote && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 leading-relaxed">
            <span className="font-bold text-[#FFE600] block mb-1 font-mono text-[11px] uppercase">
              AGENT BUDGET EFFICIENCY NOTE:
            </span>
            {budget.agentNote}
          </div>
        )}
      </div>
    </div>
  );
}
