/**
 * AgentActionsView Component
 * OpenCode-exact tool call cards and execution boxes with arguments, live execution timer, status badges, and output previews.
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  Search,
  Copy,
  Check,
  Code2,
  Clock,
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
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live timer for active running tools
  useEffect(() => {
    let timer: any = null;
    const hasActive = toolCalls.some((c) => !toolResults.some((r) => r.toolCallId === c.id));
    if (hasActive && isStreaming) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [toolCalls, toolResults, isStreaming]);

  if (toolCalls.length === 0) return null;

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyOutput = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const getToolIcon = (name: string) => {
    if (name.includes('command') || name.includes('shell')) return <Terminal className="w-4 h-4 text-purple-400" />;
    if (name.includes('file') || name.includes('write') || name.includes('read') || name.includes('edit'))
      return <FileCode className="w-4 h-4 text-blue-400" />;
    if (name.includes('web') || name.includes('search')) return <Search className="w-4 h-4 text-amber-400" />;
    if (name.includes('interpreter')) return <Code2 className="w-4 h-4 text-emerald-400" />;
    return <Wrench className="w-4 h-4 text-cyan-400" />;
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'e2b_run_command':
      case 'shell': return 'Commande Terminal';
      case 'e2b_write_file':
      case 'write': return 'Écriture Fichier';
      case 'read': return 'Lecture Fichier';
      case 'edit': return 'Modification Fichier';
      case 'ls': return 'Arborescence';
      case 'e2b_code_interpreter': return 'Interpréteur de Code';
      case 'websearch': return 'Recherche Web';
      default: return name;
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-[#2d2d2d] bg-[#141414] shadow-md font-sans">
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1c1c1c] hover:bg-[#222222] transition-colors text-xs font-medium text-[#ececec] select-none border-b border-[#252525]"
      >
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-white tracking-wide">
            OpenCode : Actions & Outils ({toolCalls.length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isStreaming && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-[11px] text-cyan-400 font-mono animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Exécution en cours ({elapsedSeconds}s)...</span>
            </span>
          )}
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[#888]" /> : <ChevronRight className="w-4 h-4 text-[#888]" />}
        </div>
      </button>

      {/* Tool Cards Container */}
      {isExpanded && (
        <div className="p-3 space-y-2.5 bg-[#121212]">
          {toolCalls.map((call, idx) => {
            const result = toolResults.find((r) => r.toolCallId === call.id);
            const isLoading = !result && isStreaming;
            const cardId = call.id || `call_${idx}`;
            const isCardOpen = expandedCards[cardId] ?? true;

            const argsStr = JSON.stringify(call.args, null, 2);
            const resultStr = result
              ? typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result, null, 2)
              : '';

            return (
              <div
                key={cardId}
                className={`rounded-xl border transition-all overflow-hidden ${
                  result?.error
                    ? 'bg-red-950/15 border-red-900/40'
                    : isLoading
                    ? 'bg-[#18181b] border-cyan-500/60 shadow-md shadow-cyan-500/10 animate-pulse'
                    : 'bg-[#181818] border-[#2b2b2b]'
                }`}
              >
                {/* Card Top Bar */}
                <div
                  onClick={() => toggleCard(cardId)}
                  className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[#202022] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[#252528] border border-[#333] shrink-0">
                      {getToolIcon(call.name)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-white tracking-wide">
                          {getToolLabel(call.name)}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2a2a2e] text-[#aaa]">
                          {call.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#999] font-mono truncate max-w-[240px] sm:max-w-[420px] mt-0.5">
                        {Object.entries(call.args)
                          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                          .join(' | ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isLoading ? (
                      <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700 text-cyan-300 text-[10px] font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>En cours ({elapsedSeconds}s)</span>
                      </div>
                    ) : result?.error ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-[10px] font-mono">
                        <XCircle className="w-3 h-3" />
                        <span>Échec</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Succès</span>
                      </span>
                    )}

                    {isCardOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#888]" />
                    )}
                  </div>
                </div>

                {/* Expanded Card Details (Arguments & Results Box) */}
                {isCardOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-[#26262a] bg-[#101012]">
                    {/* Arguments Box */}
                    {Object.keys(call.args).length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#777] mb-1">
                          Arguments d'entrée :
                        </div>
                        <div className="p-2 rounded-lg bg-[#0a0a0c] border border-[#222] font-mono text-[11px] text-cyan-300 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{argsStr}</pre>
                        </div>
                      </div>
                    )}

                    {/* Result or Error Box */}
                    {result && !result.error && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#777] mb-1">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>Résultat et Logs :</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOutput(resultStr, cardId);
                            }}
                            className="flex items-center space-x-1 text-xs text-[#aaa] hover:text-white transition-colors"
                          >
                            {copiedId === cardId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copié</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copier</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#08080a] border border-[#222] font-mono text-[11px] text-emerald-300/90 max-h-48 overflow-y-auto custom-scrollbar">
                          <pre className="whitespace-pre-wrap">{resultStr || '(Aucune sortie terminal)'}</pre>
                        </div>
                      </div>
                    )}

                    {isLoading && (
                      <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 flex items-center space-x-2 font-mono text-xs text-cyan-300">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Exécution en cours en arrière-plan ({elapsedSeconds}s)... Le terminal affiche les résultats dès la fin de l'opération.</span>
                      </div>
                    )}

                    {result?.error && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 mb-1">
                          Erreur d'exécution :
                        </div>
                        <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 font-mono text-[11px] text-red-300">
                          {result.error}
                        </div>
                      </div>
                    )}
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
