/**
 * ChatInput Component: ChatGPT-identical bottom floating input bar with attachment button, web search toggle, mic, voice mode, and send/stop actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Mic,
  MicOff,
  Square,
  Globe,
  AudioLines,
  X,
  FileCode,
  Image,
  AlertTriangle,
} from 'lucide-react';
import type { Attachment } from '@packages/types/src/index.ts';

interface ChatInputProps {
  onSendMessage: (
    content: string,
    attachments: Array<{ name: string; mimeType: string; size: number; base64Data: string }>,
    webSearch: boolean
  ) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  onOpenVoiceMode: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  onOpenVoiceMode,
  disabled = false,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [webSearch, setWebSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [content]);

  const handleSubmit = () => {
    if ((!content.trim() && attachments.length === 0) || disabled || isGenerating) return;
    const formattedAttachments = attachments.map((att) => ({
      ...att,
      base64Data: att.base64Data || '',
    }));
    onSendMessage(content.trim(), formattedAttachments, webSearch);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`Le fichier "${file.name}" dépasse la limite de 10 Mo.`);
        continue;
      }

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to API
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || 'text/plain',
            size: file.size,
            base64Data,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Erreur lors du téléversement du fichier');
        }

        const data = await res.json();
        if (data.attachment) {
          setAttachments((prev) => [...prev, data.attachment]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setContent((prev) => (prev ? prev + ' ' + transcript : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const hasInput = content.trim().length > 0 || attachments.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 pt-1">
      {/* Error alert if any */}
      {errorMessage && (
        <div className="mb-2 p-2.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main ChatGPT capsule bar */}
      <div className="relative rounded-[28px] bg-[#2f2f2f] border border-[#383838] focus-within:border-[#525252] shadow-lg shadow-black/20 transition-all flex flex-col p-1.5 sm:p-2">
        {/* Attachment chips if any */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-2 border-b border-[#3c3c3c]">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 pl-2 pr-1.5 py-1 rounded-xl bg-[#3c3c3c] border border-[#484848] text-xs text-[#ececec]"
              >
                {file.mimeType.startsWith('image/') ? (
                  <Image className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="truncate max-w-[130px] font-medium">{file.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 text-[#b4b4b4] hover:text-red-400 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div className="flex items-end space-x-2">
          {/* Left (+) attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.py,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ajouter un fichier"
            className="w-9 h-9 shrink-0 rounded-full bg-[#3c3c3c] hover:bg-[#484848] text-[#ececec] flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Web search toggle icon */}
          <button
            type="button"
            onClick={() => setWebSearch(!webSearch)}
            title={webSearch ? 'Recherche Web activée' : 'Activer la recherche Web'}
            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              webSearch
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                : 'text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#3c3c3c]'
            }`}
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Parlez maintenant, dictée en cours...' : 'Répondre à Aether AI...'}
            rows={1}
            disabled={disabled}
            className="flex-1 py-2 px-2 bg-transparent text-[15px] text-[#ececec] placeholder-[#8e8e8e] focus:outline-none resize-none max-h-40 overflow-y-auto leading-relaxed"
          />

          {/* Right actions: Mic dictation, Voice Mode & Send button */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Active dictation indicator or mic */}
            {isListening ? (
              <button
                type="button"
                onClick={toggleVoiceInput}
                title="Arrêter la dictée"
                className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center animate-pulse shadow-md shadow-red-900/40"
              >
                <MicOff className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleVoiceInput}
                title="Dictée vocale"
                className="w-9 h-9 rounded-full text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#3c3c3c] flex items-center justify-center transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Send or Stop or Voice Mode */}
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Arrêter la génération"
                className="w-9 h-9 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center shadow-sm transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-black" />
              </button>
            ) : hasInput ? (
              <button
                type="button"
                onClick={handleSubmit}
                title="Envoyer"
                className="w-9 h-9 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <ArrowUp className="w-5 h-5 text-black stroke-[2.5]" />
              </button>
            ) : (
              /* Blue Voice Mode button (matching ChatGPT mobile app screenshot!) */
              <button
                type="button"
                onClick={onOpenVoiceMode}
                title="Mode vocal"
                className="w-9 h-9 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <AudioLines className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
