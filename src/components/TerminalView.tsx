/**
 * TerminalView Component
 * Renders standard output (stdout) and error streams (stderr) from E2B code execution
 * in a sleek, dark, monospaced console window.
 */

import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';

export interface TerminalViewProps {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTimeMs?: number;
  environment?: string;
  title?: string;
  onClose?: () => void;
  isStreaming?: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  stdout = '',
  stderr = '',
  exitCode = 0,
  executionTimeMs,
  environment = 'E2B Cloud Secure Sandbox',
  title = 'Console E2B Runtime',
  onClose,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'all'>(
    stderr && stderr.trim().length > 0 ? 'all' : 'stdout'
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const isSuccess = exitCode === 0;

  const handleCopy = async () => {
    let textToCopy = '';
    if (activeTab === 'stdout') textToCopy = stdout;
    else if (activeTab === 'stderr') textToCopy = stderr;
    else textToCopy = `--- STDOUT ---\n${stdout}\n\n--- STDERR ---\n${stderr}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isCleared) {
    return (
      <div className="my-2 p-2 rounded-xl bg-[#121212] border border-[#2a2a2a] text-xs text-[#8e8e8e] flex items-center justify-between font-mono">
        <span>Console terminal effacée.</span>
        <button
          onClick={() => setIsCleared(false)}
          className="text-blue-400 hover:underline"
        >
          Restaurer la sortie
        </button>
      </div>
    );
  }

  return (
    <div
      className={`my-3 rounded-2xl overflow-hidden border border-[#2f2f2f] bg-[#0a0a0a] shadow-2xl transition-all font-sans ${
        isExpanded ? 'fixed inset-4 z-50 my-0 max-w-none h-[calc(100vh-2rem)] flex flex-col' : ''
      }`}
    >
      {/* Terminal Top Window Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616] border-b border-[#2a2a2a] select-none">
        {/* Left: macOS dots & title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onClose}
              title="Fermer la console"
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 inline-block transition-colors"
            />
            <button
              onClick={() => setIsCleared(true)}
              title="Effacer la console"
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 inline-block transition-colors"
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Réduire' : 'Agrandir'}
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 inline-block transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#b4b4b4]">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[12px] font-medium text-white">{title}</span>
          </div>
        </div>

        {/* Right: Badges & Controls */}
        <div className="flex items-center space-x-2">
          {/* Environment Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#222] border border-[#333] text-[11px] font-medium text-[#b4b4b4]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[160px]">{environment}</span>
          </div>

          {/* Execution Time Badge */}
          {executionTimeMs !== undefined && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#222] border border-[#333] text-[11px] font-mono text-[#a0a0a0]">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{executionTimeMs}ms</span>
            </div>
          )}

          {/* Status Badge */}
          <div
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${
              isSuccess
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/70'
                : 'bg-red-950/70 text-red-400 border border-red-800/70'
            }`}
          >
            {isSuccess ? (
              <span>Code 0 (OK)</span>
            ) : (
              <span className="flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Code {exitCode}</span>
              </span>
            )}
          </div>

          {/* Expand/Contract Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Réduire' : 'Plein écran'}
            className="p-1 rounded-md hover:bg-[#2f2f2f] text-[#a0a0a0] hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Button */}
          <button
            onClick={() => setIsCleared(true)}
            title="Effacer la sortie"
            className="p-1 rounded-md hover:bg-[#2f2f2f] text-[#a0a0a0] hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copier le contenu du terminal"
            className="p-1 rounded-md hover:bg-[#2f2f2f] text-[#a0a0a0] hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[#2f2f2f] text-[#a0a0a0] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation if both stdout and stderr exist */}
      {stderr && stderr.trim().length > 0 && (
        <div className="flex items-center space-x-1 px-4 pt-2 bg-[#121212] border-b border-[#222]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-t-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#0a0a0a] text-white border-t border-x border-[#2f2f2f]'
                : 'text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            Toutes les sorties
          </button>
          <button
            onClick={() => setActiveTab('stdout')}
            className={`px-3 py-1 rounded-t-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'stdout'
                ? 'bg-[#0a0a0a] text-emerald-400 border-t border-x border-[#2f2f2f]'
                : 'text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            STDOUT
          </button>
          <button
            onClick={() => setActiveTab('stderr')}
            className={`px-3 py-1 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center space-x-1 ${
              activeTab === 'stderr'
                ? 'bg-[#0a0a0a] text-red-400 border-t border-x border-red-900/60'
                : 'text-red-400/70 hover:text-red-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            <span>STDERR</span>
          </button>
        </div>
      )}

      {/* Terminal Monospaced Console Body */}
      <div
        className={`p-4 overflow-x-auto text-[13px] font-mono leading-relaxed bg-[#050505] text-[#ececec] select-text ${
          isExpanded ? 'flex-1' : 'max-h-80'
        }`}
      >
        <div className="flex items-center space-x-2 text-xs text-[#555] mb-2 select-none font-mono">
          <span className="text-emerald-500">user@e2b-sandbox:~$</span>
          <span>e2b-run-output</span>
          {isStreaming && (
            <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-1" />
          )}
        </div>

        <pre className="m-0 p-0 whitespace-pre-wrap break-words">
          {activeTab === 'all' ? (
            <>
              {stdout && stdout.trim().length > 0 && (
                <div className="text-emerald-300/90 mb-2">{stdout}</div>
              )}
              {stderr && stderr.trim().length > 0 && (
                <div className="text-red-400 mt-2 pt-2 border-t border-red-950/50">
                  <span className="text-xs text-red-500 font-bold block mb-1">[STDERR]</span>
                  {stderr}
                </div>
              )}
              {!stdout && !stderr && (
                <span className="text-[#666] italic">(Aucune sortie générée)</span>
              )}
            </>
          ) : activeTab === 'stdout' ? (
            stdout && stdout.trim().length > 0 ? (
              <span className="text-emerald-300/90">{stdout}</span>
            ) : (
              <span className="text-[#666] italic">(Aucune sortie standard)</span>
            )
          ) : stderr && stderr.trim().length > 0 ? (
            <span className="text-red-400">{stderr}</span>
          ) : (
            <span className="text-[#666] italic">(Aucun message d'erreur)</span>
          )}
        </pre>
      </div>
    </div>
  );
};
