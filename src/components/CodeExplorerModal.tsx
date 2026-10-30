/**
 * CodeExplorerModal Component
 * VS Code style file explorer and code viewer modal
 * Features:
 * - Sidebar with file tree
 * - Tabbed code viewing with syntax highlighting (via Markdown preview for now)
 * - Direct Preview and Terminal access
 */

import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Folder,
  ChevronRight,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Globe,
  Terminal,
  Code,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '../api/client.ts';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  language: string;
}

interface CodeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (snippet: string, filename: string) => void;
  onOpenPreview?: () => void;
  onOpenTerminal?: () => void;
  refreshTrigger?: number;
}

export const CodeExplorerModal: React.FC<CodeExplorerModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
  onOpenPreview,
  onOpenTerminal,
  refreshTrigger,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isOpen || refreshTrigger) {
      fetchTree();
    }
  }, [isOpen, refreshTrigger]);

  const fetchTree = async () => {
    setLoadingTree(true);
    try {
      const res = await api.getWorkspaceTree();
      setTree(res.root || []);
    } catch (err) {
      console.error('Failed to fetch tree:', err);
    } finally {
      setLoadingTree(false);
    }
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const openFile = async (node: FileNode) => {
    // Check if already open
    const existing = tabs.find((t) => t.path === node.path);
    if (existing) {
      setActiveTabPath(node.path);
      return;
    }

    try {
      const res = await api.getWorkspaceFile(node.path);
      const ext = node.name.split('.').pop() || '';
      const newTab: OpenTab = {
        path: node.path,
        name: node.name,
        content: res.content,
        language: ext,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabPath(node.path);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const nextTabs = tabs.filter((t) => t.path !== path);
    setTabs(nextTabs);
    if (activeTabPath === path) {
      setActiveTabPath(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : null);
    }
  };

  const activeTab = tabs.find((t) => t.path === activeTabPath);

  const renderTreeItem = (node: FileNode, level: number, index: number) => {
    const isFolder = node.type === 'directory';
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activeTabPath === node.path;

    return (
      <div key={`${node.path}-${node.type}-${index}`}>
        <div
          className={`group flex items-center py-1 px-2 cursor-pointer rounded-lg hover:bg-[#2a2d2e] transition-colors text-[13px] ${
            isActive ? 'bg-[#37373d] text-cyan-400' : 'text-[#cccccc]'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => (isFolder ? toggleFolder(node.path) : openFile(node))}
        >
          <span className="mr-1.5 shrink-0">
            {isFolder ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-[#858585]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#858585]" />
              )
            ) : (
              <FileCode className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-[#858585]'}`} />
            )}
          </span>
          {isFolder && <Folder className="w-4 h-4 mr-1.5 text-[#dcb67a]" />}
          <span className="truncate">{node.name}</span>
        </div>

        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map((child, childIdx) => renderTreeItem(child, level + 1, childIdx))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 md:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans transition-all duration-200 ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl h-[97vh] sm:h-[96vh]'
        }`}
      >
        {/* Top Window Bar (VS Code styled) */}
        <div className="h-10 bg-[#252526] px-3 md:px-4 border-b border-[#3c3c3c] flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 cursor-pointer" onClick={onClose} title="Fermer" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:opacity-80 cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Basculer l'explorateur" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:opacity-80 cursor-pointer" onClick={() => setIsFullscreen(!isFullscreen)} title="Plein écran" />
            </div>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#2a2d2e] hover:bg-[#37373d] text-[#cccccc] transition-colors"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-400" />}
              <span className="hidden sm:inline text-[11px] font-mono">{isSidebarOpen ? 'Masquer' : 'Explorer'}</span>
            </button>

            <span className="text-xs font-semibold text-white tracking-wide">
              Code
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Direct Preview Button */}
            {onOpenPreview && (
              <button
                onClick={onOpenPreview}
                title="Lancer la Preview du projet"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#1b2f23] hover:bg-[#233d2e] text-emerald-400 hover:text-emerald-300 border border-emerald-700/50 transition-colors text-xs font-medium"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}

            {/* Direct Terminal Button */}
            {onOpenTerminal && (
              <button
                onClick={onOpenTerminal}
                title="Ouvrir le Terminal E2B"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#1e293b] hover:bg-[#283548] text-cyan-400 hover:text-cyan-300 border border-cyan-700/50 transition-colors text-xs font-medium"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terminal</span>
              </button>
            )}

            <button
              onClick={fetchTree}
              title="Rafraîchir les fichiers"
              className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-[#333] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTree ? 'animate-spin' : ''}`} />
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

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar / Explorer */}
          {isSidebarOpen && (
            <div className="w-64 border-r border-[#2b2b2b] bg-[#252526] flex flex-col shrink-0">
              <div className="p-3 text-[11px] font-bold text-[#858585] uppercase tracking-wider flex items-center justify-between">
                <span>Explorateur</span>
                <Code className="w-3 h-3" />
              </div>
              <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
                {tree.map((node, index) => renderTreeItem(node, 0, index))}
                {tree.length === 0 && !loadingTree && (
                  <div className="px-4 py-8 text-center text-[#666] text-xs">
                    Aucun fichier trouvé.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden">
            {/* Tabs Bar */}
            <div className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-[#2b2b2b]">
              {tabs.map((tab) => (
                <div
                  key={tab.path}
                  onClick={() => setActiveTabPath(tab.path)}
                  className={`group h-full flex items-center px-3 border-r border-[#2b2b2b] cursor-pointer min-w-[120px] max-w-[200px] transition-colors ${
                    activeTabPath === tab.path ? 'bg-[#1e1e1e] text-cyan-400' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 mr-2 shrink-0" />
                  <span className="text-[12px] truncate flex-1">{tab.name}</span>
                  <X
                    className="w-3.5 h-3.5 ml-2 p-0.5 rounded hover:bg-[#3c3c3c] opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => closeTab(e, tab.path)}
                  />
                </div>
              ))}
              {tabs.length === 0 && (
                <div className="h-full flex items-center px-4 text-[#666] text-[11px] italic">
                  Sélectionnez un fichier pour l'éditer...
                </div>
              )}
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab ? (
                <div className="h-full flex flex-col">
                  {/* Floating Toolbar */}
                  <div className="absolute top-4 right-6 z-10 flex items-center space-x-2">
                    {onSendToChat && (
                      <button
                        onClick={() => onSendToChat(activeTab.content, activeTab.name)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-semibold border border-cyan-800/30 flex items-center space-x-1.5 transition-all shadow-xl"
                      >
                        <PanelLeftOpen className="w-3.5 h-3.5" />
                        <span>Ajouter au Chat</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeTab.content);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#333] hover:bg-[#444] text-[#ccc] text-xs font-semibold border border-[#444] flex items-center space-x-1.5 transition-all shadow-xl"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Copier</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-4 md:p-6 font-mono text-sm leading-relaxed">
                    <pre className="text-[#d4d4d4] whitespace-pre-wrap">
                      {activeTab.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#666] space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#252526] flex items-center justify-center">
                    <Code className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Ouvrez un fichier pour visualiser le code</p>
                  <p className="text-[11px] max-w-[240px] text-center opacity-50">
                    Utilisez l'explorateur à gauche pour naviguer dans l'arborescence de votre projet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
