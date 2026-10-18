import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ChevronDown } from 'lucide-react';
import PromptInput from './PromptInput';
import ObloSculptureCanvas from '../visual3d/ObloSculptureCanvas';

export default function HeroSection({
  prompt,
  setPrompt,
  planMode,
  setPlanMode,
  onLaunchScope,
  onOpenQuestionnaire,
  onSelectDestination
}) {
  const heroRef = useRef(null);
  const headlineRef = useRef(null);

  useEffect(() => {
    // Restrained GSAP editorial entrance animation
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(headlineRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out'
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 lg:pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left Editorial Content: 7 Columns */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left">
          {/* Eyebrow badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#FFE600] font-bold">
              AI-POWERED TRAVEL RESEARCH AGENT
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600]" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/60">
              SOURCE-GROUNDED INTELLIGENCE
            </span>
          </div>

          {/* Master Headline: Bold Editorial Typography */}
          <div ref={headlineRef} className="mb-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black uppercase tracking-tight text-white font-editorial leading-[0.92]">
              <span className="block">YOUR NEXT</span>
              <span className="block text-white">GREAT TRIP,</span>
              <span className="block text-[#FFE600]">ALREADY FIGURED OUT.</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-white/85 text-base sm:text-lg max-w-xl font-normal leading-relaxed mb-8">
            Tell us where you want to go in natural language. TripPilot cross-references boutique stays, optimal rail routes, crowd-free cultural timing, and local dining tables into a verified, source-backed itinerary.
          </p>

          {/* Natural Language Prompt & Mode Selector */}
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            planMode={planMode}
            setPlanMode={setPlanMode}
            onSubmit={onLaunchScope}
            onOpenQuestionnaire={onOpenQuestionnaire}
          />
        </div>

        {/* Right Column: 3D Visual Centerpiece (5 Columns) */}
        <div className="lg:col-span-5 flex items-center justify-center relative w-full">
          <ObloSculptureCanvas />
        </div>
      </div>

      {/* Bottom reference metadata bar */}
      <div className="mt-14 pt-4 flex items-center justify-between text-xs font-mono tracking-widest text-white/50 uppercase">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4 animate-bounce text-[#FFE600]" />
          <span>SCROLL TO EXPLORE ENGINE</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span>PIPELINE: PROMPT &rarr; SCOPE &rarr; MULTI-AGENT &rarr; SYNTHESIS</span>
        </div>
        <div>
          <span>01 / 04 WORKFLOW</span>
        </div>
      </div>
    </section>
  );
}
