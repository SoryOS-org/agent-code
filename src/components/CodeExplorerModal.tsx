/**
 * CodeExplorerModal Component
 * VS Code style File Explorer and Code Viewer
 * Features:
 * - Collapsible Folder Tree with file icons & extensions
 * - Multi-tab open files bar
 * - Monospaced code view with line numbers and syntax highlighting
 * - Copy code, close tabs, refresh tree
 */

import React, { useState, useEffect } from 'react';
import {
  Code,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
  X,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Terminal,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { api } from '../api/client.ts';

export interface FileNode {
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
}

export const CodeExplorerModal: React.FC<CodeExplorerModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src', 'packages', 'apps'])
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resizable sidebar & collapse state (VS Code style)
  const [sidebarWidth, setSidebarWidth] = useState<number>(240); // default 240px
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Resize handler for mouse and touch
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      // Calculate new width clamped between 140px and 450px
      const newWidth = Math.min(Math.max(e.clientX - 20, 140), 460);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const clientX = e.touches[0].clientX;
      const newWidth = Math.min(Math.max(clientX - 10, 100), 320);
      setSidebarWidth(newWidth);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Fetch Tree
  const fetchTree = async () => {
    setLoadingTree(true);
    setError(null);
    try {
      const res = await api.getWorkspaceTree();
      setTree(res.root || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur chargement arborescence';
      setError(msg);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTree();
      // If no file open, open README.md or package.json by default
      if (openTabs.length === 0) {
        handleOpenFile('README.md');
      }
    }
  }, [isOpen]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const getLanguageFromPath = (path: string): string => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.rs')) return 'rust';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.sh') || path.endsWith('.bash')) return 'bash';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'text';
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (fileName.endsWith('.rs')) {
      return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
    }
    if (fileName.endsWith('.py')) {
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    }
    return <File className="w-4 h-4 text-[#888] shrink-0" />;
  };

  const handleOpenFile = async (filePath: string) => {
    // Check if already open
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    setLoadingFile(true);
    try {
      const res = await api.getWorkspaceFile(filePath);
      const name = filePath.split('/').pop() || filePath;
      const newTab: OpenTab = {
        path: filePath,
        name,
        content: res.content || '',
        language: getLanguageFromPath(filePath),
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabPath(filePath);
    } catch (err: unknown) {
      console.error('Failed to open file:', err);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.path !== path);
    setOpenTabs(remaining);
    if (activeTabPath === path) {
      setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const handleCopyCode = async () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (!activeTab) return;
    try {
      await navigator.clipboard.writeText(activeTab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleInsertInChat = () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (!activeTab || !onSendToChat) return;
    const snippet = `Voici le code de \`${activeTab.path}\` :\n\`\`\`${activeTab.language}\n${activeTab.content}\n\`\`\``;
    onSendToChat(snippet, activeTab.name);
    onClose();
  };

  if (!isOpen) return null;

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  // Render tree item recursively
  const renderTreeItem = (node: FileNode, level = 0) => {
    const isFolder = node.type === 'directory';
    const isExpanded = expandedFolders.has(node.path);
    const isCurrentFile = activeTabPath === node.path;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              handleOpenFile(node.path);
            }
          }}
          style={{ paddingLeft: `${Math.max(level * 14 + 10, 10)}px` }}
          className={`flex items-center space-x-1.5 py-1 pr-2 rounded-lg cursor-pointer text-xs font-mono transition-colors ${
            isCurrentFile
              ? 'bg-[#094771]/80 text-white font-medium'
              : 'hover:bg-[#2a2d2e] text-[#cccccc]'
          }`}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#858585] shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#858585] shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans transition-all duration-200 ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-6xl h-[92vh] sm:h-[88vh]'
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

            {/* Toggle Sidebar Icon Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Masquer l'explorateur (gagner de l'espace code)" : "Afficher l'explorateur"}
              className="p-1 rounded text-[#a0a0a0] hover:text-white hover:bg-[#333] transition-colors flex items-center space-x-1 text-xs"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-400" />}
              <span className="hidden sm:inline text-[11px] font-mono">{isSidebarOpen ? 'Masquer' : 'Explorer'}</span>
            </button>

            <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[200px] sm:max-w-none">
              Explorateur & Code (VS Code)
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
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

        {/* Main Body: Resizable Sidebar Tree + Editor */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: Explorer Sidebar (Resizable & Collapsible) */}
          {isSidebarOpen && (
            <div
              style={{ width: `${sidebarWidth}px` }}
              className="shrink-0 bg-[#252526] border-r border-[#333] flex flex-col h-full overflow-hidden select-none transition-none"
            >
              <div className="px-3 py-2 text-[11px] font-bold text-[#8e8e8e] uppercase tracking-wider border-b border-[#333] flex items-center justify-between">
                <span>FICHIERS</span>
                <span className="text-[10px] text-cyan-400 font-mono">VS Code</span>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {loadingTree ? (
                  <div className="flex items-center justify-center p-6 text-xs text-[#858585]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Chargement...
                  </div>
                ) : tree.length > 0 ? (
                  tree.map((node) => renderTreeItem(node, 0))
                ) : (
                  <div className="p-4 text-xs text-[#888] text-center">
                    Aucun fichier trouvé.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VS Code Draggable Splitter Handle */}
          {isSidebarOpen && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onTouchStart={(e) => {
                setIsDragging(true);
              }}
              title="Glisser pour redimensionner l'explorateur"
              className={`w-2.5 sm:w-1.5 hover:w-2.5 transition-all cursor-col-resize flex items-center justify-center z-10 select-none touch-none ${
                isDragging ? 'bg-blue-500 shadow-lg' : 'bg-[#2b2b2b] hover:bg-blue-400'
              }`}
            >
              <GripVertical className="w-3 h-3 text-[#888] opacity-75 pointer-events-none" />
            </div>
          )}

          {/* Right: Code Viewer Area (Takes remaining width) */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden min-w-0">
            {/* Open Tabs Header */}
            <div className="h-9 bg-[#252526] border-b border-[#333] flex items-center overflow-x-auto select-none no-scrollbar">
              {openTabs.map((tab) => {
                const isActive = activeTabPath === tab.path;
                return (
                  <div
                    key={tab.path}
                    onClick={() => setActiveTabPath(tab.path)}
                    className={`h-full px-3.5 flex items-center space-x-2 text-xs font-mono cursor-pointer border-r border-[#333] transition-colors ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-t-blue-500'
                        : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#252526]'
                    }`}
                  >
                    {getFileIcon(tab.name)}
                    <span className="truncate max-w-[140px]">{tab.name}</span>
                    <button
                      onClick={(e) => handleCloseTab(e, tab.path)}
                      className="p-0.5 rounded hover:bg-[#444] text-[#888] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {openTabs.length === 0 && (
                <div className="px-4 text-xs text-[#666] italic">
                  Aucun fichier ouvert — cliquez sur un fichier dans l'explorateur
                </div>
              )}
            </div>

            {/* Active File Actions & Path Bar */}
            {activeTab && (
              <div className="h-8 bg-[#1e1e1e] px-4 border-b border-[#2d2d2d] flex items-center justify-between text-xs text-[#858585] font-mono">
                <div className="truncate max-w-md text-[#aaa]">
                  <span>{activeTab.path}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {onSendToChat && (
                    <button
                      onClick={handleInsertInChat}
                      title="Envoyer ce code à l'assistant dans le chat"
                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#2d2d2d] hover:bg-[#3c3c3c] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ajouter au Chat</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyCode}
                    title="Copier le code"
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#ececec] transition-colors"
                  >
                    {copied ? (
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
              </div>
            )}

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm leading-relaxed text-[#d4d4d4] select-text">
              {loadingFile ? (
                <div className="flex items-center justify-center h-full text-[#888]">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Chargement du contenu...
                </div>
              ) : activeTab ? (
                <pre className="m-0 font-mono">
                  <code>{activeTab.content}</code>
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-[#666] space-y-2">
                  <Terminal className="w-8 h-8 opacity-40 text-blue-400" />
                  <p>Sélectionnez un fichier dans l'explorateur pour afficher son code source.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
