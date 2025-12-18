'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const THINKING_WORDS = [
  'Self-integrating',
  'Self-configuring',
  'Self-wiring',
  'Forging links',
  'Summoning APIs',
  'Making introductions',
  'Auto-discovering',
  'Establishing channels',
  'Bridging systems',
  'Opening pathways',
  'Connecting the dots',
  'Learning the landscape',
  'Mapping territories',
  'Building bridges',
  'Orchestrating flows',
  'Autonomous linking',
];

export function ThinkingIndicator() {
  const [wordIndex, setWordIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % THINKING_WORDS.length);
        setIsTransitioning(false);
      }, 200);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-800/50 border border-neutral-700/50">
      <div className="relative">
        <Sparkles className="w-4 h-4 text-neutral-400 animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Sparkles className="w-4 h-4 text-neutral-500/30" />
        </div>
      </div>
      <span
        className={`text-sm text-neutral-400 font-medium transition-all duration-200 ${
          isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        }`}
      >
        {THINKING_WORDS[wordIndex]}
      </span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}
