/**
 * ThoughtAccordion Component
 * Renders collapsible AI reasoning / thinking blocks (<think>...</think> or reasoning_delta)
 * OpenCode & DeepSeek R1 style reasoning UI
 */

import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';

export interface ThoughtAccordionProps {
  thought: string;
}

export const ThoughtAccordion: React.FC<ThoughtAccordionProps> = ({ thought }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thought || thought.trim().length === 0) {
    return null;
  }

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#121212] transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 bg-[#181818] hover:bg-[#1f1f1f] text-xs font-mono text-[#a0a0a0] transition-colors select-none text-left"
      >
        <div className="flex items-center space-x-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold text-[#ececec]">Chaîne de pensée (Raisonnement IA)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-[#777]">{thought.length} caractères</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#888]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#888]" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3.5 text-xs font-mono leading-relaxed text-[#b4b4b4] bg-[#0c0c0c] border-t border-[#222] whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          {thought.trim()}
        </div>
      )}
    </div>
  );
};
