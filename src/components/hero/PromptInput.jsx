import React from 'react';
import { Sparkles, ArrowRight, Dices, Send } from 'lucide-react';
import { PROMPT_SUGGESTIONS } from '../../data/promptSuggestions';

export default function PromptInput({
  prompt,
  setPrompt,
  planMode,
  setPlanMode,
  onSubmit,
  onOpenQuestionnaire
}) {
  const handleRandomPreset = () => {
    const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
    setPrompt(random.prompt);
  };

  return (
    <div className="w-full max-w-2xl text-left">
      {/* Mode Selector Tabs: Quick Plan vs Personalised Plan */}
      <div className="flex items-center gap-2 mb-4 p-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15 w-fit">
        <button
          type="button"
          onClick={() => setPlanMode('quick')}
          className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            planMode === 'quick'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/80 hover:text-white'
          }`}
        >
          ⚡ Quick Plan
        </button>
        <button
          type="button"
          onClick={() => {
            setPlanMode('personalised');
            onOpenQuestionnaire();
          }}
          className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            planMode === 'personalised'
              ? 'bg-[#FFE600] text-black shadow-md'
              : 'text-white/80 hover:text-white'
          }`}
        >
          ✨ Personalised Plan
        </button>
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-3xl bg-[#091547]/80 backdrop-blur-xl border border-white/20 p-2 sm:p-3 shadow-2xl transition-all focus-within:border-[#FFE600] focus-within:ring-2 focus-within:ring-[#FFE600]/30">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your ideal trip (e.g. 5 days in Kyoto focusing on quiet Zen temples, morning bamboo paths, artisanal matcha, and boutique ryokans on a balanced budget)..."
          rows={3}
          className="w-full bg-transparent text-white placeholder-white/40 text-sm sm:text-base p-3 resize-none focus:outline-none leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 px-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRandomPreset}
              className="flex items-center gap-1.5 text-xs font-mono text-white/70 hover:text-[#FFE600] transition-colors px-2 py-1 rounded-md hover:bg-white/10"
              title="Pick a random realistic prompt preset"
            >
              <Dices className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Surprise Prompt</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {planMode === 'personalised' && (
              <button
                type="button"
                onClick={onOpenQuestionnaire}
                className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold tracking-wide uppercase transition-all"
              >
                Customize Inputs
              </button>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={!prompt.trim()}
              className="px-6 py-2.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>{planMode === 'quick' ? 'Review Scope' : 'Configure Scope'}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-white/60 uppercase tracking-wider mr-1">
          Quick Starts:
        </span>
        {PROMPT_SUGGESTIONS.map((sug) => (
          <button
            key={sug.label}
            type="button"
            onClick={() => setPrompt(sug.prompt)}
            className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-[#FFE600] hover:text-black text-white/90 border border-white/15 transition-all"
          >
            {sug.label}
          </button>
        ))}
      </div>
    </div>
  );
}
