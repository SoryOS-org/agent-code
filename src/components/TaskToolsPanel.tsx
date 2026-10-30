/**
 * TaskToolsPanel Component
 * OpenCode-exact task checklist and execution step cards with status badges and progress indicators.
 */

import React, { useState } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Terminal,
  FileCode,
  Zap,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'failed';
  toolName?: string;
  output?: string;
}

export interface TaskToolsPanelProps {
  tasks: TaskItem[];
  activeTool?: string;
  onClearTasks?: () => void;
}

export const TaskToolsPanel: React.FC<TaskToolsPanelProps> = ({
  tasks,
  activeTool,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (tasks.length === 0 && !activeTool) {
    return null;
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getToolIcon = (toolName?: string) => {
    if (!toolName) return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    if (toolName.includes('write') || toolName.includes('file')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    if (toolName.includes('run') || toolName.includes('command') || toolName.includes('shell')) return <Terminal className="w-3.5 h-3.5 text-purple-400" />;
    return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div
      className={`transition-all duration-300 z-30 font-sans ${
        isOpen ? 'w-80' : 'w-10'
      } flex flex-col bg-[#111111] border-l border-[#262626] h-full shadow-lg`}
    >
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-[#181818] border-b border-[#262626] select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-xs font-mono font-medium text-[#cccccc] hover:text-white transition-colors"
        >
          {isOpen ? <ChevronRight className="w-4 h-4 text-cyan-400" /> : <ChevronLeft className="w-4 h-4 text-cyan-400" />}
          {isOpen && <span className="text-white font-bold tracking-wide">Tâches OpenCode</span>}
        </button>

        {isOpen && tasks.length > 0 && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#222] text-cyan-400 border border-[#333]">
            {completedCount}/{tasks.length} ({progressPercent}%)
          </span>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs custom-scrollbar">
          {/* Active Tool Badge */}
          {activeTool && (
            <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center space-x-3 shadow-inner animate-pulse">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-cyan-400/80 font-mono block uppercase">Outil Actif E2B :</span>
                <span className="font-mono text-xs font-bold text-white truncate block">{activeTool}</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {tasks.length > 0 && (
            <div className="space-y-1.5 p-2.5 rounded-xl bg-[#161618] border border-[#26262b]">
              <div className="flex items-center justify-between text-[11px] text-[#aaa] font-mono">
                <span>Progression Globale</span>
                <span className="text-cyan-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#888] uppercase tracking-wider px-1">
              <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
              <span>Étapes d'Exécution</span>
            </div>

            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`p-3 rounded-xl border transition-all shadow-sm ${
                  task.status === 'in_progress'
                    ? 'bg-[#18181c] border-cyan-500/70 shadow-cyan-500/10'
                    : task.status === 'completed'
                    ? 'bg-[#141416] border-[#25252a] opacity-90'
                    : task.status === 'failed'
                    ? 'bg-red-950/20 border-red-900/50'
                    : 'bg-[#121214] border-[#222] text-[#888]'
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span className="mt-0.5 shrink-0">
                      {task.status === 'in_progress' ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      ) : task.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : task.status === 'failed' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-[#666]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-[#777] mb-0.5">
                        Étape #{idx + 1}
                      </div>
                      <span
                        className={`text-[12px] font-medium leading-snug break-words block ${
                          task.status === 'completed'
                            ? 'text-[#ccc] line-through decoration-[#555]'
                            : task.status === 'in_progress'
                            ? 'text-white font-semibold'
                            : 'text-[#aaa]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  </div>

                  {task.toolName && (
                    <span
                      title={task.toolName}
                      className="shrink-0 p-1.5 rounded-lg bg-[#222] border border-[#333]"
                    >
                      {getToolIcon(task.toolName)}
                    </span>
                  )}
                </div>

                {task.output && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[#0a0a0c] border border-[#222] font-mono text-[11px] text-emerald-300/90 truncate">
                    {task.output}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
