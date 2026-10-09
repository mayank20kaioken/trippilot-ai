import React from 'react';
import { Sparkles, Compass, ShieldCheck } from 'lucide-react';

export default function Navbar({ onStartClick, currentView, onResetToHome }) {
  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
      <div className="flex items-center justify-between">
        {/* Brand Logo inspired by OBLO agency aesthetic */}
        <button 
          onClick={onResetToHome}
          className="flex items-center gap-2.5 group text-left focus:outline-none"
        >
          <div className="flex items-center gap-1 font-editorial text-2xl sm:text-3xl font-black tracking-tight text-white uppercase group-hover:opacity-90 transition-opacity">
            <span>TRIP</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFE600] inline-block mb-1 group-hover:scale-125 transition-transform" />
            <span>PILOT</span>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
            AZINHACK '26
          </span>
        </button>

        {/* Minimalist center navigation */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-white/80">
          <button 
            onClick={onResetToHome}
            className={`hover:text-[#FFE600] transition-colors ${currentView === 'home' ? 'text-[#FFE600]' : ''}`}
          >
            Prompt Studio
          </button>
          <a href="#how-it-works" className="hover:text-[#FFE600] transition-colors">
            Agent Pipeline
          </a>
          <a href="#scope-preview" className="hover:text-[#FFE600] transition-colors">
            Research Scope
          </a>
          <div className="flex items-center gap-1 text-white/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Source-Backed</span>
          </div>
        </nav>

        {/* Top-Right Yellow Pill Button (matching reference 'LET'S TALK') */}
        <div className="flex items-center gap-3">
          <button
            onClick={onStartClick}
            className="px-5 sm:px-6 py-2.5 rounded-full bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-black/20 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>LET'S PLAN</span>
          </button>
        </div>
      </div>
    </header>
  );
}
