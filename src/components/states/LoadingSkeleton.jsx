import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function LoadingSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10 space-y-8 animate-pulse text-left">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl bg-black/40 border border-white/10 p-8 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-36 bg-white/20 rounded-full" />
          <div className="h-6 w-48 bg-white/10 rounded-full" />
        </div>
        <div className="h-10 w-2/3 bg-white/25 rounded-2xl" />
        <div className="h-4 w-1/2 bg-white/15 rounded-full" />
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="h-12 bg-white/10 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-44 bg-white/20 rounded-full" />
        <div className="h-10 w-36 bg-white/10 rounded-full" />
        <div className="h-10 w-36 bg-white/10 rounded-full" />
        <div className="h-10 w-36 bg-white/10 rounded-full" />
      </div>

      {/* Cards Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="rounded-3xl bg-black/40 border border-white/10 p-6 space-y-4">
            <div className="h-40 bg-white/15 rounded-2xl" />
            <div className="h-6 w-3/4 bg-white/20 rounded-lg" />
            <div className="h-4 w-full bg-white/10 rounded-full" />
            <div className="h-4 w-5/6 bg-white/10 rounded-full" />
            <div className="h-10 w-full bg-white/15 rounded-xl pt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
