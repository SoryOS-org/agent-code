/**
 * TaskToolsPanel Component
 * OpenCode-style panel displaying active agent tasks, tool executions, and step-by-step progress.
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
    if (toolName.includes('write')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    if (toolName.includes('run')) return <Terminal className="w-3.5 h-3.5 text-purple-400" />;
    return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div
      className={`transition-all duration-300 z-30 font-sans ${
        isOpen ? 'w-80' : 'w-10'
      } flex flex-col bg-[#111111] border-l border-[#262626] h-full`}
    >
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#181818] border-b border-[#262626] select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-xs font-mono font-medium text-[#cccccc] hover:text-white transition-colors"
        >
          {isOpen ? <ChevronRight className="w-4 h-4 text-cyan-400" /> : <ChevronLeft className="w-4 h-4 text-cyan-400" />}
          {isOpen && <span className="text-white font-semibold">Tâches Agent OpenCode</span>}
        </button>

        {isOpen && tasks.length > 0 && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#222] text-cyan-400 border border-[#333]">
            {completedCount}/{tasks.length} ({progressPercent}%)
          </span>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {/* Active Tool Badge */}
          {activeTool && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center space-x-2 animate-pulse">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <div>
                <span className="text-[11px] text-cyan-400/80 font-mono block">Outil E2B en cours :</span>
                <span className="font-mono text-xs font-bold text-white">{activeTool}</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {tasks.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#999] font-mono">
                <span>Progression</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#888] uppercase tracking-wider">
              <ListTodo className="w-3.5 h-3.5" />
              <span>Étapes d'exécution</span>
            </div>

            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  task.status === 'in_progress'
                    ? 'bg-[#1a1a1a] border-cyan-500/60 shadow-sm'
                    : task.status === 'completed'
                    ? 'bg-[#141414] border-[#282828] opacity-90'
                    : task.status === 'failed'
                    ? 'bg-red-950/20 border-red-900/50'
                    : 'bg-[#121212] border-[#222] text-[#888]'
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="flex items-start space-x-2 min-w-0">
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
                    <span
                      className={`text-[12px] font-medium leading-snug break-words ${
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

                  {task.toolName && (
                    <span
                      title={task.toolName}
                      className="shrink-0 p-1 rounded bg-[#222] border border-[#333]"
                    >
                      {getToolIcon(task.toolName)}
                    </span>
                  )}
                </div>

                {task.output && (
                  <div className="mt-2 p-1.5 rounded-lg bg-[#080808] border border-[#222] font-mono text-[11px] text-emerald-400/90 truncate">
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
