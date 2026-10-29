/**
 * Header Component: ChatGPT-identical top navigation
 * Circular menu button, centered model selector, and right actions pill
 */

import React, { useState } from 'react';
import type { Conversation, ModelDefinition } from '@packages/types/src/index.ts';
import {
  Menu,
  ChevronDown,
  SquarePen,
  MoreVertical,
  Download,
  Trash2,
  Sliders,
  Eye,
  Zap,
  Brain,
  ShieldCheck,
  Check,
  Code,
} from 'lucide-react';

interface HeaderProps {
  conversation: Conversation | null;
  models: ModelDefinition[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onOpenMobileMenu: () => void;
  onNewConversation?: () => void;
  onClearConversation: () => void;
  onExportConversation: () => void;
  onOpenSettings: () => void;
  onOpenCodeExplorer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  conversation,
  models,
  selectedModelId,
  onSelectModel,
  onOpenMobileMenu,
  onNewConversation,
  onClearConversation,
  onExportConversation,
  onOpenSettings,
  onOpenCodeExplorer,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0] || {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    providerName: 'Google',
    capabilities: { streaming: true, tools: true, vision: true, audio: true, reasoning: true },
  };

  return (
    <header className="h-14 bg-[#212121] px-3 md:px-5 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Menu button (ChatGPT 2-bar hamburger) */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenMobileMenu}
          className="w-9 h-9 rounded-full bg-[#2f2f2f] hover:bg-[#3c3c3c] flex items-center justify-center text-[#ececec] transition-colors"
          aria-label="Ouvrir le menu"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
        </button>

        {/* Desktop title / model picker */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl hover:bg-[#2f2f2f] text-left text-sm md:text-base font-semibold text-[#ececec] transition-colors"
          >
            <span>{currentModel.name}</span>
            <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
          </button>

          {/* Model selection dropdown */}
          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-80 md:w-96 rounded-2xl bg-[#2f2f2f] border border-[#383838] shadow-2xl z-50 p-2 space-y-1 overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider border-b border-[#3c3c3c] flex items-center justify-between">
                  <span>Modèle d'IA</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Multi-fournisseurs</span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-1 p-1">
                  {models.map((model) => {
                    const isSelected = model.id === currentModel.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col space-y-1 ${
                          isSelected
                            ? 'bg-[#3c3c3c] text-white'
                            : 'hover:bg-[#383838] text-[#ececec]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs md:text-sm text-slate-100">
                              {model.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#212121] text-[#8e8e8e] font-mono">
                              {model.providerName}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>

                        <p className="text-[11px] text-[#b4b4b4] leading-tight">
                          {model.description}
                        </p>

                        <div className="flex items-center gap-1.5 pt-1">
                          {model.isFree && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                              Gratuit
                            </span>
                          )}
                          {model.capabilities.vision && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#212121] text-cyan-300">
                              <Eye className="w-2.5 h-2.5" /> Vision
                            </span>
                          )}
                          {model.capabilities.streaming && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#212121] text-purple-300">
                              <Zap className="w-2.5 h-2.5" /> Stream
                            </span>
                          )}
                          {model.capabilities.reasoning && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#212121] text-amber-300">
                              <Brain className="w-2.5 h-2.5" /> Raisonnement
                            </span>
                          )}
                          {model.isConfigured ? (
                            <span className="text-[9px] text-emerald-400 font-mono ml-auto">
                              Prêt
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-400/80 font-mono ml-auto">
                              Clé requise
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions & ChatGPT Capsule Pill */}
      <div className="flex items-center space-x-2">
        {/* Dedicated "Code" Explorer Button (VS Code style) */}
        {onOpenCodeExplorer && (
          <button
            onClick={onOpenCodeExplorer}
            title="Explorateur de fichiers & Code (VS Code)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-[#383838] text-cyan-400 hover:text-cyan-300 border border-[#383838] transition-all text-xs font-medium shadow-sm hover:border-cyan-500/50"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
        )}

        <div className="flex items-center bg-[#2f2f2f] rounded-full p-0.5 border border-[#383838]">
          {/* New Chat icon */}
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              title="Nouvelle discussion"
              className="w-8 h-8 rounded-full hover:bg-[#3c3c3c] flex items-center justify-center text-[#ececec] transition-colors"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}

          {/* More options menu button */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              title="Plus d'options"
              className="w-8 h-8 rounded-full hover:bg-[#3c3c3c] flex items-center justify-center text-[#ececec] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* More dropdown */}
            {moreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#2f2f2f] border border-[#383838] shadow-2xl z-50 p-1.5 space-y-1">
                  {onOpenCodeExplorer && (
                    <button
                      onClick={() => {
                        onOpenCodeExplorer();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-cyan-300 hover:bg-[#3c3c3c] transition-colors"
                    >
                      <Code className="w-4 h-4 text-cyan-400" />
                      <span>Explorateur Code</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenSettings();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-[#ececec] hover:bg-[#3c3c3c] transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-[#b4b4b4]" />
                    <span>Paramètres</span>
                  </button>

                  <button
                    onClick={() => {
                      onExportConversation();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-[#ececec] hover:bg-[#3c3c3c] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#b4b4b4]" />
                    <span>Exporter la discussion</span>
                  </button>

                  <div className="h-px bg-[#3c3c3c] my-1" />

                  <button
                    onClick={() => {
                      onClearConversation();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Effacer le chat</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
