import React, { useState } from 'react';
import { DollarSign, PieChart, Users, ShieldAlert, Sparkles, Info } from 'lucide-react';

export default function BudgetSummary({ budget }) {
  const [isPerPerson, setIsPerPerson] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});

  if (!budget) {
    return (
      <div className="rounded-3xl bg-[#091547]/80 border border-white/15 p-8 text-center text-white/70 font-mono text-sm">
        Budget data is not yet available for this destination.
      </div>
    );
  }

  // Normalize budget data across different shapes
  const total = Math.max(0, Number(budget.totalUsd ?? budget.totalEstimatedBudgetUsd ?? 0));
  const perPerson = Math.max(0, Number(budget.perPersonUsd ?? Math.round(total / 2)));
  const multiplier = isPerPerson ? 0.5 : 1;
  const displayTotal = Math.max(0, Math.round((total || (perPerson * 2)) * multiplier));

  const hasBudgetTarget =
    typeof budget.budgetTarget === 'number' &&
    !Number.isNaN(budget.budgetTarget) &&
    budget.budgetTarget > 0;
  const budgetCurrency = budget.budgetCurrency || budget.currency || 'USD';
  const isUnderBudget = Boolean(
    budget.isUnderBudget || (hasBudgetTarget && budget.budgetTarget < total)
  );
  const budgetWarning =
    budget.budgetWarning ||
    (isUnderBudget
      ? `Your requested budget target of $${budget.budgetTarget.toLocaleString()} ${budgetCurrency} is below the illustrative benchmark of $${total.toLocaleString()} USD.`
      : null);

  const appliesToLabel = isPerPerson
    ? (budget.perPersonLabel || 'Per Traveler Estimate (Assuming 2 Travelers)')
    : (budget.appliesToLabel || `Total for Group (${budget.groupType || 'Romantic Couple'})`);

  const exclusionsNote =
    budget.exclusionsNote ||
    'Excludes international/domestic flights, long-distance intercity rail/bus tickets, visa fees, travel insurance, and peak-season surcharges.';

  const methodologyNote =
    budget.methodologyNote ||
    'Illustrative fixed-percentage model (52% stays, 24% dining, 14% activities, 10% local transit) derived from regional tier benchmarks — not live-crawled destination pricing.';

  // Normalize category entries
  const rawCategories = Array.isArray(budget.categories)
    ? budget.categories
    : Array.isArray(budget.items)
      ? budget.items
      : [];

  const defaultColors = ['#FFE600', '#3B82F6', '#10B981', '#8B5CF6', '#F97316'];

  const normalizedCategories = rawCategories.map((cat, idx) => {
    const name = cat.name || cat.category || `Category ${idx + 1}`;
    const amount = Math.max(0, Number(cat.amount ?? cat.amountUsd ?? 0));
    const percentage = Number(cat.percentage ?? (total > 0 ? Math.round((amount / total) * 100) : 0));
    const color = cat.color || defaultColors[idx % defaultColors.length];
    const notes = cat.notes || '';
    return { name, amount, percentage, color, notes };
  });

  const toggleNoteExpand = (idx) => {
    setExpandedNotes(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#FFE600] block mb-1">
            ILLUSTRATIVE BUDGET MODEL (FIXED-PERCENTAGE BENCHMARK)
          </span>
          <h3 className="text-2xl font-black text-white font-editorial">
            Projected Trip Cost & Category Allocation
          </h3>
        </div>

        {/* Toggle Per-Person vs Group */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/10 text-xs">
          <button
            onClick={() => setIsPerPerson(false)}
            className={`px-3 py-1.5 rounded-full transition-all ${
              !isPerPerson
                ? 'bg-[#FFE600] text-black font-bold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Group Total (${total.toLocaleString()})
          </button>
          <button
            onClick={() => setIsPerPerson(true)}
            className={`px-3 py-1.5 rounded-full transition-all ${
              isPerPerson
                ? 'bg-[#FFE600] text-black font-bold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Per Person (${perPerson.toLocaleString()})
          </button>
        </div>
      </div>

      {/* Explicit Budget Warning Banner when requested target is below estimated cost */}
      {isUnderBudget && budgetWarning && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-start gap-3.5 text-amber-100 shadow-lg"
        >
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <span className="font-mono font-bold uppercase tracking-wider text-amber-300 block">
              Budget Target Below Illustrative Benchmark
            </span>
            <p className="text-amber-100/90">{budgetWarning}</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-[#091547]/80 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Master Budget Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex flex-wrap items-end gap-6">
            {hasBudgetTarget && (
              <div className="pr-6 border-r border-white/10">
                <span className="text-xs font-mono uppercase text-amber-300 block mb-1">
                  YOUR REQUESTED TARGET (GROUP CAP)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#FFE600] font-editorial">
                    {budgetCurrency === 'USD' ? '$' : `${budgetCurrency} `}
                    {budget.budgetTarget.toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-white/70 font-bold">
                    {budgetCurrency}
                  </span>
                </div>
              </div>
            )}

            <div>
              <span className="text-xs font-mono uppercase text-white/60 block mb-1">
                {appliesToLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white font-editorial">
                  ${displayTotal.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-mono text-[#FFE600] font-bold">
                  USD (Illustrative Benchmark • Not Live Pricing)
                </span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-white/70 font-mono space-y-0.5">
            <div>Scope: <strong className="text-white">{isPerPerson ? 'Per Person' : 'Full Group'}</strong> ({budget.groupType || 'Romantic Couple'})</div>
            <div>Tier Model: <strong className="text-[#FFE600]">{budget.travelStyle || 'Balanced Explorer'}</strong></div>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        {normalizedCategories.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-white/55 mb-1.5">
              <span>ILLUSTRATIVE FIXED-PERCENTAGE SPLIT</span>
              <span>100% ON-GROUND BENCHMARK</span>
            </div>
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-black/50 border border-white/10">
              {normalizedCategories.map((cat, i) => (
                <div
                  key={i}
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  title={`${cat.name}: ${cat.percentage}%`}
                  className="h-full transition-all hover:opacity-90"
                />
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown Cards — Natural Wrapping (No Clipped Text) */}
        {normalizedCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {normalizedCategories.map((cat, i) => {
              const catAmount = Math.round(cat.amount * multiplier);
              const isLongNote = cat.notes && cat.notes.length > 160;
              const isExpanded = Boolean(expandedNotes[i]);
              const displayedNote =
                isLongNote && !isExpanded
                  ? `${cat.notes.slice(0, 155)}...`
                  : cat.notes;

              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-black/35 border border-white/10 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-white text-xs sm:text-sm leading-snug">
                          {cat.name}
                        </h5>
                        <span className="text-[11px] font-mono text-[#FFE600]/90 block mt-0.5">
                          {cat.percentage}% illustrative share ({isPerPerson ? 'per person' : 'group'})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-base text-white font-mono block">
                        ${catAmount.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-white/45 font-mono uppercase">
                        Illustrative Est.
                      </span>
                    </div>
                  </div>

                  {cat.notes && (
                    <div className="pt-2 border-t border-white/5 text-xs text-white/70 leading-relaxed whitespace-normal break-words">
                      <span>{displayedNote}</span>
                      {isLongNote && (
                        <button
                          type="button"
                          onClick={() => toggleNoteExpand(i)}
                          className="ml-2 text-[#FFE600] font-mono text-[10px] underline hover:text-white"
                        >
                          {isExpanded ? 'Show less' : 'Expand details'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/35 border border-white/10 text-xs font-mono text-white/60">
            No category breakdown items available.
          </div>
        )}

        {/* Alternative Tier Planning Baselines (Honest Tier Comparison) */}
        {Array.isArray(budget.tierBenchmarks) && budget.tierBenchmarks.length > 0 && (
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#FFE600] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
                ILLUSTRATIVE TIER PLANNING BASELINES (NOT LIVE BOOKABLE PRICES)
              </span>
              <span className="text-[10px] font-mono text-white/50">
                Planning benchmarks only • Check real-time inventory
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {budget.tierBenchmarks.map((tb, idx) => {
                const tbAmount = Math.round(tb.totalUsd * multiplier);
                const isCurrentTier = tb.tier === (budget.travelStyle || 'Balanced Explorer');
                const isWithinTarget = hasBudgetTarget && tb.totalUsd <= budget.budgetTarget;
                const isNearTarget = hasBudgetTarget && !isWithinTarget && tb.totalUsd <= budget.budgetTarget * 1.35;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                      isCurrentTier
                        ? 'bg-[#FFE600]/10 border-[#FFE600]/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-white">
                          {tb.label || tb.tier}
                        </span>
                        {isCurrentTier && (
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#FFE600] text-black">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-white font-mono">
                          ${tbAmount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono text-white/60">
                          (${Math.round(tb.dailyRate * multiplier)}/day)
                        </span>
                      </div>
                      <p className="text-[11px] text-white/65 mt-1 leading-snug">
                        {tb.description}
                      </p>
                    </div>

                    {hasBudgetTarget && (
                      <div className="pt-2 border-t border-white/5 text-[10px] font-mono">
                        {isWithinTarget ? (
                          <span className="text-emerald-400 font-bold">
                            ✓ Within requested budget target
                          </span>
                        ) : isNearTarget ? (
                          <span className="text-amber-300">
                            ~ Near requested budget target
                          </span>
                        ) : (
                          <span className="text-white/45">
                            Exceeds requested budget target
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Major Exclusions & Methodology Disclosure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/75 leading-relaxed">
            <span className="font-bold text-[#FFE600] flex items-center gap-1.5 mb-1 font-mono text-[11px] uppercase">
              <Info className="w-3.5 h-3.5" />
              <span>ILLUSTRATIVE METHODOLOGY NOTE:</span>
            </span>
            {methodologyNote}
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/75 leading-relaxed">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1 font-mono text-[11px] uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>WHAT IS EXCLUDED FROM THIS ESTIMATE:</span>
            </span>
            {exclusionsNote}
          </div>
        </div>
      </div>
    </div>
  );
}
