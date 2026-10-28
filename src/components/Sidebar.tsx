/**
 * Sidebar Component: ChatGPT-identical dark sidebar (#171717)
 * Conversations list, search, pin/delete, and profile bar
 */

import React, { useState } from 'react';
import type { Conversation, ModelDefinition } from '@packages/types/src/index.ts';
import {
  SquarePen,
  Search,
  Pin,
  Trash2,
  Settings,
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  models: ModelDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  models,
  isOpen,
  onClose,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onTogglePin,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedList = filtered.filter((c) => c.pinned);
  const regularList = filtered.filter((c) => !c.pinned);

  const geminiConfigured = models.some((m) => m.providerId === 'gemini' && m.isConfigured);

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 lg:w-68 bg-[#171717] border-r border-[#262626] flex flex-col transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header: Brand & New Chat */}
        <div className="p-3.5 flex items-center justify-between border-b border-[#262626]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow-sm">
              ⚡
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#ececec]">
              Aether AI
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                onNewConversation();
                if (window.innerWidth < 768) onClose();
              }}
              title="Nouvelle discussion (⌘N)"
              className="p-1.5 rounded-lg text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#212121] transition-colors"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-[#b4b4b4] hover:text-[#ececec] rounded-lg hover:bg-[#212121]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#787878]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#212121] border border-[#2f2f2f] text-[#ececec] placeholder-[#787878] focus:outline-none focus:border-[#424242] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787878] hover:text-[#ececec] text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-thin">
          {/* Pinned Section */}
          {pinnedList.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-[#8e8e8e]">
                Épinglées
              </div>
              {pinnedList.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  onDelete={() => onDeleteConversation(conv.id)}
                  onTogglePin={() => onTogglePin(conv.id, true)}
                />
              ))}
            </div>
          )}

          {/* Regular List */}
          <div className="space-y-0.5">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-[#8e8e8e]">
              Récents
            </div>
            {regularList.length === 0 && pinnedList.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-[#787878]">
                {searchQuery ? 'Aucun résultat' : 'Aucune discussion'}
              </div>
            ) : (
              regularList.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  onDelete={() => onDeleteConversation(conv.id)}
                  onTogglePin={() => onTogglePin(conv.id, false)}
                />
              ))
            )}
          </div>
        </div>

        {/* Provider Status Pill */}
        <div className="p-2.5 border-t border-[#262626]">
          <div className="p-2.5 rounded-xl bg-[#212121] border border-[#2f2f2f] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#ececec]">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Moteur d'IA
              </span>
              {geminiConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Actif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                  <AlertCircle className="w-3 h-3" />
                  Test
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8e8e8e] leading-snug">
              {geminiConfigured
                ? 'Google Gemini & OpenRouter prêts'
                : 'Mode test hors-ligne actif'}
            </p>
          </div>
        </div>

        {/* User profile & settings footer */}
        <div className="p-3 border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#3c3c3c] text-white flex items-center justify-center font-medium text-xs">
              U
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-[#ececec] truncate">Utilisateur</div>
              <div className="text-[10px] text-[#787878] truncate">Plan Gratuit</div>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="Paramètres"
            className="p-1.5 text-[#b4b4b4] hover:text-[#ececec] rounded-lg hover:bg-[#212121] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

interface ConversationRowProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onTogglePin,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#212121] text-white font-medium'
          : 'text-[#ececec] hover:bg-[#212121]/60'
      }`}
    >
      <div className="flex items-center space-x-2 truncate flex-1 pr-1">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#787878]" />
        <span className="truncate text-sm">{conversation.title}</span>
      </div>

      {/* Action buttons (Pin, Delete) */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={conversation.pinned ? 'Détacher' : 'Épingler'}
          className="p-1 text-[#787878] hover:text-amber-400 rounded hover:bg-[#2f2f2f] transition-colors"
        >
          <Pin className={`w-3 h-3 ${conversation.pinned ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer"
          className="p-1 text-[#787878] hover:text-red-400 rounded hover:bg-[#2f2f2f] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
