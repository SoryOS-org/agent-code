/**
 * Message Item Component: ChatGPT-identical layout
 * Right-aligned user pill bubble & clean direct assistant typography with action bar
 */

import React, { useState, useEffect } from 'react';
import type { Message } from '@packages/types/src/index.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
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

  // User Message: rounded pill bubble on the right
  if (isUser) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-2.5 flex justify-end">
        <div className="flex flex-col items-end max-w-[88%] sm:max-w-[78%]">
          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center space-x-2 p-1.5 pr-3 rounded-2xl bg-[#2f2f2f] border border-[#383838] text-xs text-[#ececec]"
                >
                  {att.mimeType.startsWith('image/') && att.base64Data ? (
                    <img
                      src={att.base64Data.startsWith('data:') ? att.base64Data : `data:${att.mimeType};base64,${att.base64Data}`}
                      alt={att.name}
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-[#3c3c3c] flex items-center justify-center text-cyan-400">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate max-w-[140px]">
                    <div className="truncate font-medium text-xs">{att.name}</div>
                    <div className="text-[10px] text-[#b4b4b4]">
                      {att.size > 0 ? `${Math.round(att.size / 1024)} Ko` : 'Fichier'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User message text bubble - ChatGPT mobile royal blue */}
          <div className="bg-[#0e3b99] text-white rounded-[24px] px-5 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap select-text shadow-sm">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message: Clean natural typography with ChatGPT action bar below
  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-0 py-3.5">
      <div className="space-y-2">
        {/* Rendered content */}
        <div className="text-[15px] leading-relaxed text-[#ececec] select-text">
          <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
        </div>

        {/* ChatGPT action bar under the response */}
        {!isStreaming && (
          <div className="flex items-center flex-wrap gap-1 pt-1.5 text-[#b4b4b4]">
            {/* Copy */}
            <button
              onClick={handleCopy}
              title="Copier"
              className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-[#ececec] transition-colors"
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
              className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition-colors ${
                feedback === 'up' ? 'text-emerald-400 bg-[#2f2f2f]' : 'hover:text-[#ececec]'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            {/* Thumbs down */}
            <button
              onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
              title="Mauvaise réponse"
              className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition-colors ${
                feedback === 'down' ? 'text-red-400 bg-[#2f2f2f]' : 'hover:text-[#ececec]'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>

            {/* Read Aloud */}
            <button
              onClick={handleToggleSpeak}
              title={isPlayingAudio ? 'Arrêter la lecture' : 'Lire à voix haute'}
              className={`p-1.5 rounded-lg hover:bg-[#2f2f2f] transition-colors ${
                isPlayingAudio ? 'text-cyan-400 bg-[#2f2f2f]' : 'hover:text-[#ececec]'
              }`}
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
              className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-[#ececec] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Regenerate */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Régénérer la réponse"
                className="p-1.5 rounded-lg hover:bg-[#2f2f2f] hover:text-[#ececec] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Sources indicator if metadata has latency or model */}
            {message.metadata?.model && (
              <div className="flex items-center space-x-1.5 ml-1 px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[11px] text-[#8e8e8e] border border-[#383838]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-mono truncate max-w-[120px]">{message.metadata.model}</span>
                {message.metadata.latencyMs && (
                  <span className="text-[10px] text-[#717171]">({message.metadata.latencyMs}ms)</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
