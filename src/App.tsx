/**
 * Aether AI - Main Application Component
 * Complete conversational AI assistant with multi-provider streaming, context, and persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import type {
  Conversation,
  Message,
  ModelDefinition,
  UserPreferences,
} from '@packages/types/src/index.ts';
import { api, ApiError } from './api/client.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { MessageItem } from './components/MessageItem.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { DiagramAssistantModal } from './components/DiagramAssistantModal.tsx';
import { VoiceModeModal } from './components/VoiceModeModal.tsx';
import { TaskToolsPanel, TaskItem } from './components/TaskToolsPanel.tsx';
import { CodeExplorerModal } from './components/CodeExplorerModal.tsx';
import { AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-3.8-flash');
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    defaultModel: 'gemini-3.8-flash',
    systemPrompt: 'Tu es un assistant IA bienveillant, concis, précis et expert en développement, analyse et rédaction.',
    temperature: 0.7,
    maxTokens: 4096,
    streamResponses: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [codeExplorerOpen, setCodeExplorerOpen] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<{ message: string; hint?: string } | null>(null);

  // OpenCode Agent Task State
  const [agentTasks, setAgentTasks] = useState<TaskItem[]>([]);
  const [activeE2BTool, setActiveE2BTool] = useState<string | undefined>(undefined);

  const activeStreamAbortRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming tokens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Initial Data Fetching
  useEffect(() => {
    const initApp = async () => {
      try {
        const [modelsRes, profileRes, convsRes] = await Promise.all([
          api.getModels(),
          api.getUserProfile(),
          api.listConversations(),
        ]);

        setModels(modelsRes.models);
        if (profileRes.preferences) {
          setPreferences(profileRes.preferences);
          setSelectedModelId(profileRes.preferences.defaultModel || modelsRes.defaultModelId);
        }

        setConversations(convsRes.conversations);
        if (convsRes.conversations.length > 0) {
          const firstConv = convsRes.conversations[0];
          setActiveConversationId(firstConv.id);
          const msgsRes = await api.listMessages(firstConv.id);
          setMessages(msgsRes.messages);
        }
      } catch (err: unknown) {
        console.error('Failed to initialize app data:', err);
      }
    };

    initApp();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + N for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedModelId, preferences]);

  // Select a conversation
  const handleSelectConversation = async (id: string) => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current();
      activeStreamAbortRef.current = null;
    }
    setIsGenerating(false);
    setStreamingMessage(null);
    setActiveConversationId(id);

    try {
      const conv = conversations.find((c) => c.id === id);
      if (conv?.modelId) {
        setSelectedModelId(conv.modelId);
      }
      const msgsRes = await api.listMessages(id);
      setMessages(msgsRes.messages);
    } catch (err: unknown) {
      console.error('Error fetching messages:', err);
    }
  };

  // Create a new conversation
  const handleNewConversation = async () => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current();
      activeStreamAbortRef.current = null;
    }
    setIsGenerating(false);
    setStreamingMessage(null);

    try {
      const newConv = await api.createConversation({
        title: 'Nouvelle conversation',
        modelId: selectedModelId,
        systemPrompt: preferences.systemPrompt,
        temperature: preferences.temperature,
      });

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err: unknown) {
      console.error('Error creating conversation:', err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      if (activeConversationId === id) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err: unknown) {
      console.error('Error deleting conversation:', err);
    }
  };

  // Toggle pinned conversation
  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      const updated = await api.updateConversation(id, { pinned: !currentPin });
      setConversations((prev) =>
        prev
          .map((c) => (c.id === id ? updated : c))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
      );
    } catch (err: unknown) {
      console.error('Error toggling pin:', err);
    }
  };

  // Clear current conversation messages
  const handleClearConversation = async () => {
    if (!activeConversationId) return;
    setMessages([]);
  };

  // Export current conversation
  const handleExportConversation = () => {
    if (messages.length === 0) return;
    const currentConv = conversations.find((c) => c.id === activeConversationId);

    const exportData = {
      title: currentConv?.title || 'Conversation Aether AI',
      exportedAt: new Date().toISOString(),
      model: selectedModelId,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-ai-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current();
      activeStreamAbortRef.current = null;
    }
    if (streamingMessage) {
      setMessages((prev) => [...prev, streamingMessage]);
      setStreamingMessage(null);
    }
    setIsGenerating(false);
  };

  // Send Message
  const handleSendMessage = async (
    content: string,
    attachments: Array<{ name: string; mimeType: string; size: number; base64Data: string }>,
    webSearch: boolean
  ) => {
    if (isGenerating) return;
    setErrorToast(null);

    let convId = activeConversationId;

    // Create conversation if none exists
    if (!convId) {
      try {
        const newConv = await api.createConversation({
          title: content.slice(0, 32) || 'Nouvelle conversation',
          modelId: selectedModelId,
          systemPrompt: preferences.systemPrompt,
          temperature: preferences.temperature,
        });
        convId = newConv.id;
        setActiveConversationId(newConv.id);
        setConversations((prev) => [newConv, ...prev]);
      } catch (err: unknown) {
        setErrorToast({ message: 'Impossible d\'initialiser la conversation' });
        return;
      }
    }

    // Add user message to UI state immediately
    const userMsg: Message = {
      id: `msg_usr_${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content,
      attachments: attachments.map((a, i) => ({
        id: `att_${Date.now()}_${i}`,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        base64Data: a.base64Data,
        createdAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      metadata: {
        model: selectedModelId,
      },
      createdAt: new Date().toISOString(),
    };
    setStreamingMessage(initialAssistantMsg);

    // Call SSE streaming
    let accumulatedContent = '';

    const abortFn = api.streamMessage(
      convId,
      {
        content,
        modelId: selectedModelId,
        systemPrompt: preferences.systemPrompt,
        temperature: preferences.temperature,
        attachments,
        webSearch,
      },
      {
        onEvent: (event) => {
          if (event.event === 'text_delta') {
            const delta = (event.data as any).delta || '';
            accumulatedContent += delta;
            setStreamingMessage((prev) =>
              prev ? { ...prev, content: accumulatedContent } : null
            );
          } else if (event.event === 'tool_call') {
            const toolCall = (event.data as any).toolCall;
            if (toolCall?.name) {
              setActiveE2BTool(toolCall.name);
              setAgentTasks((prev) => [
                ...prev,
                {
                  id: `task_${Date.now()}_${prev.length}`,
                  title: `Exécution E2B : ${toolCall.name}`,
                  status: 'in_progress',
                  toolName: toolCall.name,
                },
              ]);
            }
          } else if (event.event === 'message_complete') {
            setActiveE2BTool(undefined);
            setAgentTasks((prev) =>
              prev.map((t) => (t.status === 'in_progress' ? { ...t, status: 'completed' } : t))
            );
            const data = event.data as any;
            const finalizedMsg: Message = {
              id: assistantMsgId,
              conversationId: convId!,
              role: 'assistant',
              content: data.fullText || accumulatedContent,
              metadata: {
                model: selectedModelId,
                tokens: data.totalTokens,
                latencyMs: data.latencyMs,
                finishReason: data.finishReason,
              },
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, finalizedMsg]);
            setStreamingMessage(null);
            setIsGenerating(false);

            // Refresh conversation title in sidebar if updated
            api.getConversation(convId!).then((updatedConv) => {
              setConversations((prev) =>
                prev.map((c) => (c.id === convId ? updatedConv : c))
              );
            }).catch(() => {});
          } else if (event.event === 'error') {
            const err = event.data as any;
            setErrorToast({
              message: err.message || 'Erreur lors de la génération',
              hint: err.hint,
            });
            setIsGenerating(false);
            setStreamingMessage(null);
          }
        },
        onError: (err: ApiError) => {
          setErrorToast({
            message: err.message,
            hint: err.hint,
          });
          setIsGenerating(false);
          setStreamingMessage(null);
        },
        onComplete: () => {
          setIsGenerating(false);
          activeStreamAbortRef.current = null;
        },
      }
    );

    activeStreamAbortRef.current = abortFn;
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (messages.length === 0 || isGenerating) return;
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove last assistant message if present
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last.role === 'assistant') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    handleSendMessage(
      lastUserMsg.content,
      (lastUserMsg.attachments as any) || [],
      false
    );
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId) || null;
  const currentModelDef = models.find((m) => m.id === selectedModelId);

  return (
    <div className="flex h-screen bg-[#212121] text-[#ececec] overflow-hidden font-sans antialiased select-text">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        models={models}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Chat View */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#212121] relative">
        {/* Top Header */}
        <Header
          conversation={activeConv}
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={(modelId) => {
            setSelectedModelId(modelId);
            if (activeConversationId) {
              api.updateConversation(activeConversationId, { ...activeConv, modelId });
            }
          }}
          onOpenMobileMenu={() => setSidebarOpen(true)}
          onNewConversation={handleNewConversation}
          onClearConversation={handleClearConversation}
          onExportConversation={handleExportConversation}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCodeExplorer={() => setCodeExplorerOpen(true)}
        />

        {/* Error Toast Banner */}
        {errorToast && (
          <div className="mx-3 md:mx-6 mt-3 p-3 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs md:text-sm flex items-start justify-between shadow-xl shadow-red-950/40 z-20">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">{errorToast.message}</p>
                {errorToast.hint && (
                  <p className="text-red-300/90 text-xs mt-1 leading-relaxed">
                    💡 {errorToast.hint}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setErrorToast(null)}
              className="p-1 text-red-400 hover:text-white rounded-lg hover:bg-red-900/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Chat Messages or Welcome Screen */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 && !streamingMessage ? (
            <WelcomeScreen
              activeModelName={currentModelDef?.name || 'Gemini 3.8 Flash'}
              onSelectPrompt={(prompt) => handleSendMessage(prompt, [], false)}
              onOpenDiagramStudio={() => setDiagramModalOpen(true)}
            />
          ) : (
            <div className="py-2">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                />
              ))}

              {/* Streaming Assistant Message */}
              {streamingMessage && (
                <MessageItem
                  message={streamingMessage}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
          onOpenVoiceMode={() => setVoiceModeOpen(true)}
        />
      </main>

      {/* OpenCode Task Tools Panel */}
      <TaskToolsPanel
        tasks={agentTasks}
        activeTool={activeE2BTool}
        onClearTasks={() => setAgentTasks([])}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        models={models}
        onSavePreferences={async (updates) => {
          setPreferences((prev) => ({ ...prev, ...updates }));
          await api.updatePreferences(updates);
        }}
      />

      {/* Diagram & README Assistant Studio Modal */}
      <DiagramAssistantModal
        isOpen={diagramModalOpen}
        onClose={() => setDiagramModalOpen(false)}
        onSelectPrompt={(prompt) => handleSendMessage(prompt, [], false)}
      />

      {/* VS Code Style File Explorer & Code Viewer Modal */}
      <CodeExplorerModal
        isOpen={codeExplorerOpen}
        onClose={() => setCodeExplorerOpen(false)}
        onSendToChat={(snippet) => handleSendMessage(snippet, [], false)}
      />

      {/* ChatGPT-styled Voice Mode Modal */}
      <VoiceModeModal
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onSendMessageVoice={(text) => handleSendMessage(text, [], false)}
      />
    </div>
  );
}
