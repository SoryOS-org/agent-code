/**
 * TerminalModal Component
 * Full interactive terminal window supporting shell commands executed in E2B secure sandbox
 * Features:
 * - Command prompt input with history (Up/Down arrows)
 * - Quick shortcuts (npm run build, npm run lint, git status, python3, etc.)
 * - ANSI / text output streaming
 * - Fullscreen & minimize controls
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Play,
  Check,
  RefreshCw,
  CornerDownLeft,
} from 'lucide-react';
import { api } from '../api/client.ts';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      type: 'system',
      text: 'Terminal Cloud E2B initialisé. Tapez une commande (ex: npm run build, python3, git status)...',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun !== undefined ? cmdToRun : inputCommand).trim();
    if (!cmd || isRunning) return;

    if (cmd === 'clear' || cmd === 'cls') {
      setLogs([]);
      setInputCommand('');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const newLog: LogEntry = {
      id: Math.random().toString(),
      type: 'input',
      text: `$ ${cmd}`,
      timestamp,
    };

    setLogs((prev) => [...prev, newLog]);
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    if (!cmdToRun) setInputCommand('');
    setIsRunning(true);

    try {
      const res = await api.runTerminalCommand(cmd);
      const outLogs: LogEntry[] = [];

      if (res.stdout) {
        outLogs.push({
          id: Math.random().toString(),
          type: 'output',
          text: res.stdout,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      if (res.stderr) {
        outLogs.push({
          id: Math.random().toString(),
          type: 'error',
          text: res.stderr,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      if (!res.stdout && !res.stderr) {
        outLogs.push({
          id: Math.random().toString(),
          type: 'system',
          text: `Processus terminé (code de sortie: ${res.exitCode}, durée: ${res.executionTimeMs}ms)`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setLogs((prev) => [...prev, ...outLogs]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'error',
          text: `Erreur d'exécution : ${msg}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIndex);
      setInputCommand(history[history.length - 1 - nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputCommand(history[history.length - 1 - nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#181818] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono transition-all duration-200 ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-5xl h-[88vh] sm:h-[82vh]'
        }`}
      >
        {/* Top Window Bar */}
        <div className="h-10 bg-[#212121] px-3 md:px-4 border-b border-[#333] flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 cursor-pointer" onClick={onClose} title="Fermer" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:opacity-80 cursor-pointer" onClick={() => setLogs([])} title="Effacer le terminal" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:opacity-80 cursor-pointer" onClick={() => setIsFullscreen(!isFullscreen)} title="Plein écran" />
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded-full">
              <Terminal className="w-3.5 h-3.5" />
              <span>Terminal E2B</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setLogs([])}
              title="Vider le terminal"
              className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
              className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-[#333] transition-colors hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Commands Ribbon */}
        <div className="h-8 bg-[#1f1f1f] px-4 border-b border-[#2d2d2d] flex items-center space-x-2 text-[11px] overflow-x-auto no-scrollbar select-none">
          <span className="text-[#666] uppercase text-[10px]">Raccourcis :</span>
          <button
            onClick={() => handleRunCommand('npm run build')}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] text-cyan-300 hover:text-white transition-colors"
          >
            npm run build
          </button>
          <button
            onClick={() => handleRunCommand('npm run lint')}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] text-purple-300 hover:text-white transition-colors"
          >
            npm run lint
          </button>
          <button
            onClick={() => handleRunCommand('git status')}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] text-emerald-300 hover:text-white transition-colors"
          >
            git status
          </button>
          <button
            onClick={() => handleRunCommand('python3 --version')}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] text-amber-300 hover:text-white transition-colors"
          >
            python3 --version
          </button>
          <button
            onClick={() => handleRunCommand('ls -la')}
            className="px-2 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#383838] text-blue-300 hover:text-white transition-colors"
          >
            ls -la
          </button>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 bg-[#121212] p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-2 select-text">
          {logs.map((log) => (
            <div key={log.id} className="leading-relaxed">
              {log.type === 'input' && (
                <div className="text-emerald-400 font-bold flex items-center space-x-2">
                  <span>{log.text}</span>
                  <span className="text-[10px] text-[#666] font-normal ml-auto">{log.timestamp}</span>
                </div>
              )}
              {log.type === 'output' && (
                <pre className="text-[#d4d4d4] whitespace-pre-wrap m-0 font-mono">
                  {log.text}
                </pre>
              )}
              {log.type === 'error' && (
                <pre className="text-red-400 whitespace-pre-wrap m-0 font-mono">
                  {log.text}
                </pre>
              )}
              {log.type === 'system' && (
                <div className="text-cyan-400/90 italic text-[11px]">
                  ℹ️ {log.text}
                </div>
              )}
            </div>
          ))}

          {isRunning && (
            <div className="flex items-center space-x-2 text-amber-400 animate-pulse text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Exécution de la commande en cours dans la Sandbox E2B...</span>
            </div>
          )}

          <div ref={logsEndRef} />
        </div>

        {/* Command Prompt Input Bar */}
        <div className="h-14 bg-[#1a1a1a] px-4 border-t border-[#333] flex items-center space-x-2">
          <span className="text-emerald-400 font-bold text-sm select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez une commande shell (ex: npm run build, ls, node)..."
            disabled={isRunning}
            className="flex-1 bg-transparent text-white font-mono placeholder-[#666] outline-none text-xs md:text-sm"
          />
          <button
            onClick={() => handleRunCommand()}
            disabled={isRunning || !inputCommand.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#333] disabled:text-[#666] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <span>Exécuter</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
