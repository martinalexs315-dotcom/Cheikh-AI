import React from 'react';
import { Network } from 'lucide-react';

export default function ThinkingIndicator({ message = 'Réflexion...' }: { message?: string }) {
  return (
    <div 
      className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 text-sm animate-in fade-in duration-300"
      aria-live="polite"
      aria-atomic="true"
    >
      <Network className="w-4 h-4 shrink-0" />
      <span className="flex items-center">
        {message.replace('...', '')}
        <span className="inline-flex w-3 text-left">
          <span className="animate-[pulse_1.5s_infinite_0s] motion-reduce:animate-none">.</span>
          <span className="animate-[pulse_1.5s_infinite_0.2s] motion-reduce:animate-none">.</span>
          <span className="animate-[pulse_1.5s_infinite_0.4s] motion-reduce:animate-none">.</span>
        </span>
      </span>
      <span className="opacity-50 ml-1">&gt;</span>
    </div>
  );
}
