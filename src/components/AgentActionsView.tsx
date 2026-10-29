/**
 * AgentActionsView Component
 * Visualizes agent tool calls and their execution results in real-time
 * Similar to Replit Agent or OpenCode activity log
 */

import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  Globe,
  Search,
} from 'lucide-react';
import type { ToolCall, ToolResult } from '@packages/types/src/index.ts';

interface AgentActionsViewProps {
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  isStreaming?: boolean;
}

export const AgentActionsView: React.FC<AgentActionsViewProps> = ({
  toolCalls,
  toolResults,
  isStreaming,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (toolCalls.length === 0) return null;

  const getToolIcon = (name: string) => {
    if (name.includes('command') || name.includes('shell')) return <Terminal className="w-3.5 h-3.5" />;
    if (name.includes('file') || name.includes('write') || name.includes('read') || name.includes('edit'))
      return <FileCode className="w-3.5 h-3.5" />;
    if (name.includes('web') || name.includes('search')) return <Search className="w-3.5 h-3.5" />;
    if (name.includes('interpreter')) return <FileCode className="w-3.5 h-3.5" />;
    return <Wrench className="w-3.5 h-3.5" />;
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'e2b_run_command': return 'Exécution commande terminal';
      case 'e2b_write_file': return 'Création/Modification de fichier';
      case 'e2b_code_interpreter': return 'Interpréteur de code';
      case 'websearch': return 'Recherche Web';
      case 'read': return 'Lecture de fichier';
      case 'ls': return 'Exploration dossier';
      default: return name;
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#1a1a1a] shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#222] hover:bg-[#2a2a2a] transition-colors text-xs font-medium text-[#ececec] select-none"
      >
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Wrench className="w-3 h-3" />
          </div>
          <span>Actions de l'agent ({toolCalls.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          {isStreaming && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#888]" /> : <ChevronRight className="w-4 h-4 text-[#888]" />}
        </div>
      </button>

      {isExpanded && (
        <div className="divide-y divide-[#282828] max-h-[400px] overflow-y-auto custom-scrollbar">
          {toolCalls.map((call, idx) => {
            const result = toolResults.find((r) => r.toolCallId === call.id);
            const isLoading = !result && isStreaming;

            return (
              <div key={call.id || idx} className="p-3 bg-[#161616]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-1 rounded-md ${result?.error ? 'text-red-400' : 'text-[#888]'}`}>
                      {getToolIcon(call.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-mono font-semibold text-[#ddd]">
                        {getToolLabel(call.name)}
                      </span>
                      <span className="text-[10px] text-[#666] font-mono truncate max-w-[200px] sm:max-w-[350px]">
                        {Object.values(call.args).map(v => String(v)).join(' ')}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                    ) : result?.error ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Optional expanded result detail */}
                {result && !result.error && (
                  <div className="mt-2.5 pl-8 pr-2">
                    <div className="p-2 rounded-lg bg-[#0d0d0d] border border-[#222] text-[10px] font-mono text-[#888] overflow-hidden">
                       <pre className="whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
                       </pre>
                    </div>
                  </div>
                )}

                {result?.error && (
                  <div className="mt-2.5 pl-8 pr-2">
                    <div className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 text-[10px] font-mono text-red-400">
                      Erreur: {result.error}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
