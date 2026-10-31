/**
 * Message Item Component: ChatGPT-identical layout
 * Right-aligned user pill bubble & clean direct assistant typography with action bar
 */

import React, { useState, useEffect } from 'react';
import type { Message } from '@packages/types/src/index.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { ThoughtAccordion } from './ThoughtAccordion.tsx';
import { AgentActionsView } from './AgentActionsView.tsx';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Share2,
  FileText,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isUser = message.role === 'user';

  // Stop speech if unmounted
  useEffect(() => {
    return () => {
      if (isPlayingAudio && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingAudio]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = message.content
      .replace(/```[\s\S]*?```/g, 'Bloc de code.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_~>]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Réponse Aether AI',
          text: message.content,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Avatar styling based on role
  const getAvatarContent = () => {
    if (isUser) {
      return (
        <div className="w-7 h-7 rounded-full bg-[#0e3b99] flex items-center justify-center text-white font-bold text-sm shadow-md">
          U
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-md">
        <span className="text-white font-bold text-sm">AI</span>
      </div>
    );
  };

  // User Message: improved bubble design with better visual hierarchy
  if (isUser) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-3.5">
        <div className="flex justify-end items-start gap-3">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center space-x-2.5 p-2 pr-3 rounded-2xl bg-[#1e1e1e] border border-[#2d2d2d] text-xs text-[#e0e0e0] shadow-sm max-w-[260px]"
                >
                  {att.mimeType.startsWith('image/') && att.base64Data ? (
                    <img
                      src={att.base64Data.startsWith('data:') ? att.base64Data : `data:${att.mimeType};base64,${att.base64Data}`}
                      alt={att.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-cyan-400">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="truncate max-w-[180px]">
                    <div className="truncate font-medium text-xs text-[#f0f0f0]">{att.name}</div>
                    <div className="text-[10px] text-[#b0b0b0]">
                      {att.size > 0 ? `${Math.round(att.size / 1024)} Ko` : 'Fichier'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-end max-w-[78%] sm:max-w-[66%] space-y-1.5">
            {/* User message text bubble with improved visual hierarchy */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-[#0e3b99] to-[#1e5eff] text-white rounded-[28px] rounded-tr-md px-5 py-3.5 text-[14px] leading-relaxed break-words whitespace-pre-wrap select-text shadow-md hover:shadow-lg transition-all">
                {message.content}
              </div>
              {/* Small tail connector for chat bubble */}
              <div className="absolute right-3 bottom-0 w-3 h-3 bg-gradient-to-br from-[#0e3b99] to-[#1e5eff] transform rotate-45 translate-y-1/2 -z-10"></div>
            </div>

            {/* Improved action bar for user messages */}
            <div className="flex items-center flex-wrap gap-1 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Copy */}
              <button
                onClick={handleCopy}
                title="Copier"
                className="p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] text-[#b0b0b0] hover:text-white transition-all"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Thumbs up */}
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                title="Bonne réponse"
                className={`p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] transition-all ${feedback === 'up' ? 'text-emerald-400 bg-emerald-950/50' : ''}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              {/* Thumbs down */}
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                title="Mauvaise réponse"
                className={`p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] transition-all ${feedback === 'down' ? 'text-red-400 bg-red-950/50' : ''}`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {/* Speak */}
              <button
                onClick={handleToggleSpeak}
                title={isPlayingAudio ? 'Arrêter la lecture' : 'Lire à voix haute'}
                className={`p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] transition-all ${isPlayingAudio ? 'text-cyan-400 bg-cyan-950/50' : ''}`}
              >
                {isPlayingAudio ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                title="Partager"
                className="p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {/* Regenerate */}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Régénérer la réponse"
                  className="p-1.5 rounded-lg bg-[#2a2a2a]/80 hover:bg-[#333333] transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Timestamp */}
              <div className="text-[10px] text-[#777] ml-1.5 px-1.5 py-0.5 rounded-full bg-[#2a2a2a]/50">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {getAvatarContent()}
        </div>
      </div>
    );
  }

  // Assistant Message: improved card-based design with better visual hierarchy
  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-4">
      <div className="flex gap-3.5">
        {/* Assistant avatar */}
        <div className="shrink-0 mt-1">
          {getAvatarContent()}
        </div>

        {/* Main message content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Agent metadata bar */}
          <div className="flex items-center flex-wrap gap-2 text-[12px]">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#1c1c1c] border border-[#2d2d2d] text-[#e0e0e0]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono truncate max-w-[120px]">{message.metadata?.model || 'Aether AI'}</span>
              {message.metadata?.latencyMs && (
                <span className="text-[10px] text-[#717171]">({message.metadata.latencyMs}ms)</span>
              )}
            </div>

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-mono text-[11px]">En streaming...</span>
              </div>
            )}
          </div>

          {/* Agent Actions / Tool Calls */}
          {(message.toolCalls?.length || 0) > 0 && (
            <div className="mt-1">
              <AgentActionsView 
                toolCalls={message.toolCalls || []} 
                toolResults={message.toolResults || []}
                isStreaming={isStreaming}
              />
            </div>
          )}

          {/* Content container with subtle background */}
          <div className="relative group">
            {/* Subtle background for assistant messages */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#161616] rounded-2xl -z-10"></div>
            
            {/* Content wrapper */}
            <div className="relative rounded-2xl bg-[#1c1c1c]/80 backdrop-blur-sm border border-[#2d2d2d] shadow-sm hover:shadow-md transition-all">
              {/* Rendered content */}
              <div className="px-5 py-4 text-[14px] leading-relaxed text-[#e0e0e0] select-text">
                <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
              </div>

              {/* Improved action bar under response */}
              {!isStreaming && (
                <div className="flex items-center justify-between px-4 py-3 bg-[#181818] border-t border-[#2d2d2d] rounded-b-2xl">
                  {/* Left side actions */}
                  <div className="flex items-center flex-wrap gap-1">
                    {/* Copy */}
                    <button
                      onClick={handleCopy}
                      title="Copier"
                      className="p-1.5 rounded-lg hover:bg-[#2a2a2a] hover:text-white transition-all text-[#b0b0b0]"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Thumbs up */}
                    <button
                      onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                      title="Bonne réponse"
                      className={`p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all ${feedback === 'up' ? 'text-emerald-400 bg-emerald-950/50' : 'text-[#b0b0b0]'}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>

                    {/* Thumbs down */}
                    <button
                      onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                      title="Mauvaise réponse"
                      className={`p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all ${feedback === 'down' ? 'text-red-400 bg-red-950/50' : 'text-[#b0b0b0]'}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>

                    {/* Speak */}
                    <button
                      onClick={handleToggleSpeak}
                      title={isPlayingAudio ? 'Arrêter la lecture' : 'Lire à voix haute'}
                      className={`p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all ${isPlayingAudio ? 'text-cyan-400 bg-cyan-950/50' : 'text-[#b0b0b0]'}`}
                    >
                      {isPlayingAudio ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Share */}
                    <button
                      onClick={handleShare}
                      title="Partager"
                      className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all text-[#b0b0b0]"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Regenerate */}
                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        title="Régénérer la réponse"
                        className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-all text-[#b0b0b0]"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Right side metadata */}
                  <div className="flex items-center space-x-2">
                    {/* Timestamp */}
                    <div className="text-[11px] text-[#777] px-2 py-0.5 rounded-full bg-[#2a2a2a]/50">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Model indicator */}
                    {message.metadata?.model && (
                      <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#222] text-[#999] text-[10px] font-mono border border-[#333]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="truncate max-w-[100px]">{message.metadata.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

