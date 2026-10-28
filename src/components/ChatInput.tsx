/**
 * Chat Input Component: ChatGPT-identical bottom capsule bar
 * Floating rounded pill with +, textarea, mic dictation, and voice/send controls
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Plus,
  Globe,
  X,
  FileCode,
  Image,
  AlertTriangle,
  Mic,
  MicOff,
  AudioLines,
} from 'lucide-react';

interface AttachedFile {
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, attachments: AttachedFile[], webSearch: boolean) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  disabled,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [webSearch, setWebSearch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const toggleVoiceInput = () => {
    setErrorMessage(null);

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        "La reconnaissance vocale n'est pas prise en charge sur ce navigateur."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript.trim()) {
          setContent((prev) => {
            const trimmedPrev = prev.trim();
            const textToAdd = finalTranscript.trim();
            return trimmedPrev ? `${trimmedPrev} ${textToAdd}` : textToAdd;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Web Speech API error]:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMessage(
            "Accès au microphone refusé. Veuillez l'autoriser dans les réglages de votre navigateur."
          );
        } else if (event.error === 'audio-capture') {
          setErrorMessage("Aucun microphone détecté.");
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Erreur vocale (${event.error}).`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setErrorMessage(`Impossible d'initialiser la saisie vocale : ${msg}`);
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if ((!trimmed && attachments.length === 0) || isGenerating || disabled) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    onSendMessage(trimmed, attachments, webSearch);
    setContent('');
    setAttachments([]);
    setErrorMessage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage(`Le fichier "${file.name}" dépasse 8 Mo.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            base64Data,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
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
                onClick={toggleVoiceInput}
                title="Mode vocal"
                className="w-9 h-9 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center shadow-sm transition-all active:scale-95"
              >
                <AudioLines className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ChatGPT Footnote */}
      <div className="mt-2 text-center text-[11px] text-[#8e8e8e]">
        Aether AI peut faire des erreurs. Envisagez de vérifier les informations importantes.
      </div>
    </div>
  );
};
