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

  // Calculate overall status for the panel header
  const getOverallStatus = () => {
    if (tasks.length === 0) return 'idle';
    if (completedCount === tasks.length) return 'completed';
    if (completedCount > 0) return 'in_progress';
    return 'todo';
  };

  const overallStatus = getOverallStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50';
      case 'in_progress': return 'text-cyan-400 bg-cyan-950/50 border-cyan-800/50';
      case 'failed': return 'text-red-400 bg-red-950/50 border-red-800/50';
      default: return 'text-[#888] bg-[#222] border-[#333]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-[#888]" />;
    }
  };

  return (
    <div
      className={`transition-all duration-300 z-30 font-sans ${
        isOpen ? 'w-80' : 'w-10'
      } flex flex-col bg-[#111111] border-l border-[#262626] h-full shadow-lg`}
    >
      {/* Header bar with toggle and status indicator */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-[#181818] border-b border-[#262626] select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2.5 text-xs font-medium text-[#cccccc] hover:text-white transition-colors"
        >
          {isOpen ? <ChevronRight className="w-4 h-4 text-cyan-400" /> : <ChevronLeft className="w-4 h-4 text-cyan-400" />}
          {isOpen && (
            <span className="flex items-center space-x-2">
              <span className="text-white font-bold tracking-wide">Tâches OpenCode</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getStatusColor(overallStatus)}`}>{
                overallStatus === 'idle' ? 'IDLE' :
                overallStatus === 'completed' ? 'TERMINE' :
                overallStatus === 'in_progress' ? 'EN COURS' : 'FAIL'
              }}</span>
            </span>
          )}
        </button>

        {isOpen && tasks.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-[#222] text-cyan-400 border border-[#333] shadow-sm">
              {completedCount}/{tasks.length} ({progressPercent}%)
            </span>
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="text-[10px] text-[#777] font-mono">PANEL ACTIVE</span>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs custom-scrollbar">
          {/* Active Tool Badge */}
          {activeTool && (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center space-x-3 shadow-sm hover:shadow-md transition-all animate-pulse-slow">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-cyan-400/80 font-mono block uppercase mb-0.5">Outil Actif E2B :</span>
                <span className="font-mono text-xs font-bold text-white truncate block">{activeTool}</span>
              </div>
            </div>
          )}

          {/* Progress Bar with better visual */}
          {tasks.length > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-[#161618] border border-[#26262b] shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[#aaa] font-mono">
                <span className="flex items-center space-x-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Progression Globale</span>
                </span>
                <span className="text-cyan-400 font-bold">ÉTAPE {completedCount}/{tasks.length}</span>
              </div>
              <div className="relative w-full h-2 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {progressPercent >= 20 && (
                    <span className="text-[9px] text-white font-bold drop-shadow-sm">
                      {progressPercent < 50 ? '⏳' : progressPercent < 80 ? '🔥' : '✅'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tasks List with improved visual hierarchy */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#888] uppercase tracking-wider px-1.5 pb-1 border-b border-[#262626]">
              <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
              <span>Étapes d'Exécution ({tasks.length})</span>
            </div>

            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`group relative p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md ${
                  task.status === 'in_progress'
                    ? 'bg-[#18181c] border-cyan-500/70 shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                    : task.status === 'completed'
                    ? 'bg-[#141416] border-[#25252a] opacity-95 hover:bg-[#1a1a1d]'
                    : task.status === 'failed'
                    ? 'bg-red-950/15 border-red-900/50 hover:bg-red-950/25'
                    : 'bg-[#121214] border-[#222] text-[#888] hover:border-[#333]'
                }`}
              >
                <div className="flex items-start justify-between space-x-2.5">
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-[#222] border border-[#333] group-hover:bg-[#2a2a2e] transition-colors">
                      {task.status === 'in_progress' ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      ) : task.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : task.status === 'failed' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-[#666]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-[10px] font-mono text-[#777] bg-[#222] px-1.5 py-0.5 rounded border border-[#333]">
                          #{idx + 1}
                        </span>
                        {task.toolName && (
                          <span className="text-[10px] font-mono text-[#999] bg-[#2a2a2e] px-1.5 py-0.5 rounded border border-[#333] truncate max-w-[80px]">
                            {task.toolName}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[12px] font-medium leading-snug break-words block transition-colors ${
                          task.status === 'completed'
                            ? 'text-[#ccc] line-through decoration-[#555]'
                            : task.status === 'in_progress'
                            ? 'text-white font-semibold'
                            : task.status === 'failed'
                            ? 'text-red-300'
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
                      className="shrink-0 p-1.5 rounded-lg bg-[#222] border border-[#333] group-hover:bg-cyan-950/50 group-hover:border-cyan-800/50 transition-all"
                    >
                      {getToolIcon(task.toolName)}
                    </span>
                  )}
                </div>

                {task.output && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#0a0a0c] border border-[#222] font-mono text-[11px] text-emerald-300/90 overflow-x-auto custom-scrollbar hover:bg-[#0f0f12] transition-colors">
                    <pre className="whitespace-pre-wrap break-all">{task.output}</pre>
                  </div>
                )}

                {/* Status indicator dot */}
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' :
                    task.status === 'in_progress' ? 'bg-cyan-400 animate-pulse' :
                    task.status === 'failed' ? 'bg-red-400' :
                    'bg-[#666]'
                  }`} />}
                </div>
              </div>
            ))}
          </div>

          {/* Footer with helpful hint */}
          {tasks.length > 0 && (
            <div className="pt-2.5 px-2.5 pb-1.5 border-t border-[#262626] bg-[#111] rounded-b-xl">
              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-[#555] font-mono">
                <ListTodo className="w-3 h-3" />
                <span>Panneau de surveillance des tâches OpenCode v2.0</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
