/**
 * Dedicated Code Execution Terminal UI Component
 * Renders E2B Cloud Sandbox execution outputs in a developer terminal view.
 */

import React, { useState } from 'react';
import { Terminal, Copy, Check, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export interface CodeExecutionTerminalProps {
  environment?: string;
  exitCode?: number;
  executionTimeMs?: number;
  stdout?: string;
  stderr?: string;
  rawBlock?: string;
}

export const CodeExecutionTerminal: React.FC<CodeExecutionTerminalProps> = ({
  environment = 'E2B Cloud Secure Sandbox',
  exitCode = 0,
  executionTimeMs,
  stdout = '',
  stderr = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr'>(
    stderr && stderr.trim().length > 0 ? 'stderr' : 'stdout'
  );

  const isSuccess = exitCode === 0;

  const handleCopy = async () => {
    const textToCopy = activeTab === 'stdout' ? stdout : stderr;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-[#2f2f2f] bg-[#0c0c0c] shadow-lg shadow-black/40 font-sans">
      {/* Terminal Window Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181818] border-b border-[#2a2a2a]">
        {/* Left: macOS dots & title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#b4b4b4]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[12px] font-medium text-white">Terminal E2B</span>
          </div>
        </div>

        {/* Right: Badges & Copy button */}
        <div className="flex items-center space-x-2">
          {/* Environment Badge */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#252525] border border-[#383838] text-[11px] font-medium text-[#b4b4b4]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[150px]">{environment}</span>
          </div>

          {/* Execution Time Badge */}
          {executionTimeMs !== undefined && (
            <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#252525] border border-[#383838] text-[11px] font-mono text-[#8e8e8e]">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{executionTimeMs}ms</span>
            </div>
          )}

          {/* Status Badge */}
          <div
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${
              isSuccess
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-red-950/60 text-red-400 border border-red-800/60'
            }`}
          >
            {isSuccess ? (
              <span>Code 0 (OK)</span>
            ) : (
              <span className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Code {exitCode}</span>
              </span>
            )}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copier les logs du terminal"
            className="p-1 rounded-md hover:bg-[#2f2f2f] text-[#b4b4b4] hover:text-white transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Tabs if stderr exists */}
      {stderr && stderr.trim().length > 0 && (
        <div className="flex items-center space-x-1 px-4 pt-2 bg-[#121212] border-b border-[#222]">
          <button
            onClick={() => setActiveTab('stdout')}
            className={`px-3 py-1 rounded-t-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'stdout'
                ? 'bg-[#0c0c0c] text-white border-t border-x border-[#2f2f2f]'
                : 'text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            STDOUT
          </button>
          <button
            onClick={() => setActiveTab('stderr')}
            className={`px-3 py-1 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center space-x-1 ${
              activeTab === 'stderr'
                ? 'bg-[#0c0c0c] text-red-400 border-t border-x border-red-900/60'
                : 'text-red-400/70 hover:text-red-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            <span>STDERR</span>
          </button>
        </div>
      )}

      {/* Terminal Output Body */}
      <div className="p-4 overflow-x-auto max-h-72 text-[13px] font-mono leading-relaxed bg-[#080808] text-[#e0e0e0] select-text">
        <pre className="m-0 p-0 whitespace-pre-wrap break-words">
          {activeTab === 'stdout' ? (
            stdout && stdout.trim().length > 0 ? (
              <span className="text-emerald-300/90">{stdout}</span>
            ) : (
              <span className="text-[#666] italic">(Aucune sortie standard)</span>
            )
          ) : (
            <span className="text-red-400">{stderr}</span>
          )}
        </pre>
      </div>
    </div>
  );
};
