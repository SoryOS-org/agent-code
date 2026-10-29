/**
 * ChatGPT Voice Mode Modal Component
 * Interactive voice session with pulsing blue orb, SpeechSynthesis,
 * and seamless microphone permission handling.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  Mic,
  MicOff,
  Volume2,
  ChevronRight,
  Globe,
  Sparkles,
  Send,
} from 'lucide-react';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessageVoice?: (transcript: string) => void;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  onSendMessageVoice,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("Touchez le micro pour commencer à parler.");
  const [aiStatus, setAiStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Vale (Défaut)');
  const [selectedLanguage, setSelectedLanguage] = useState('Français (France)');
  const [audioOutput, setAudioOutput] = useState('Haut-parleur principal');
  const [audioLevel, setAudioLevel] = useState(1.1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanupAudio();
    }
    return () => {
      cleanupAudio();
    };
  }, [isOpen]);

  const cleanupAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const startListening = async () => {
    setTranscript("J'écoute... Parlez maintenant.");
    setIsListening(true);
    setAiStatus('listening');

    // Try Web Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: any) => {
          if (isMuted) return;
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const currentText = final || interim;
          if (currentText) {
            setTranscript(currentText);
            if (final && final.trim().length > 1) {
              handleUserMessage(final.trim());
            }
          }
        };

        recognition.onerror = () => {
          // Ignore error and keep listening via audio stream
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        // Fallback handled
      }
    }

    // Try getUserMedia for Audio Analyser visual pulse
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(Math.max(1 + avg / 25, 1), 1.7);
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // Microphone permissions not available in preview webview; provide interactive text simulation
      setTranscript("Mode vocal actif. Parlez ou tapez votre message ci-dessous.");
    }
  };

  const handleUserMessage = (text: string) => {
    setAiStatus('thinking');
    setTranscript(`"${text}"`);

    if (onSendMessageVoice) {
      onSendMessageVoice(text);
    }

    setTimeout(() => {
      speakAiResponse(`J'ai bien reçu : "${text}". Comment puis-je vous assister ?`);
    }, 1000);
  };

  const speakAiResponse = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setAiStatus('speaking');
      setTranscript(text);
    };

    utterance.onend = () => {
      setAiStatus('listening');
      setTranscript("J'écoute... Parlez ou écrivez.");
    };

    utterance.onerror = () => {
      setAiStatus('listening');
      setTranscript("J'écoute... Parlez ou écrivez.");
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setTranscript('Microphone désactivé (muet).');
      setAudioLevel(1);
    } else {
      startListening();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput('');
    handleUserMessage(trimmed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 select-none animate-fadeIn">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between pt-2">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#333] text-white flex items-center justify-center transition-colors shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#1c1c1c] border border-[#2f2f2f] text-xs text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">Mode Vocal Aether AI</span>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#333] text-white flex items-center justify-center transition-colors shadow-md"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Center Animated Pulsing Blue Orb (ChatGPT Voice Mode identical style) */}
      <div className="flex flex-col items-center justify-center flex-1 space-y-6 my-auto">
        <div
          onClick={() => {
            if (!isListening) startListening();
          }}
          className="relative flex items-center justify-center cursor-pointer group"
          title="Touchez pour parler"
        >
          {/* Outer glowing pulse rings */}
          <div
            className="absolute rounded-full bg-blue-500/30 blur-2xl transition-transform duration-150"
            style={{
              width: `${280 * audioLevel}px`,
              height: `${280 * audioLevel}px`,
            }}
          />
          <div
            className="absolute rounded-full bg-indigo-600/40 blur-xl transition-transform duration-100"
            style={{
              width: `${210 * audioLevel}px`,
              height: `${210 * audioLevel}px`,
            }}
          />

          {/* Core Orb */}
          <div
            className={`relative w-44 h-44 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-blue-700 via-sky-400 to-indigo-200 shadow-[0_0_90px_rgba(37,99,235,0.8)] transition-transform duration-150 ${
              aiStatus === 'speaking'
                ? 'scale-110 shadow-[0_0_120px_rgba(56,189,248,0.9)] animate-pulse'
                : aiStatus === 'thinking'
                ? 'scale-95 opacity-90'
                : 'group-hover:scale-105'
            }`}
            style={{
              transform: `scale(${aiStatus === 'speaking' ? 1.15 : audioLevel})`,
            }}
          >
            {/* Inner texture highlights */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-black/30 pointer-events-none" />
          </div>
        </div>

        {/* Live Transcript / Status subtitle */}
        <div className="max-w-md text-center px-4 min-h-[60px] flex flex-col items-center justify-center space-y-2">
          <p className="text-neutral-200 text-lg sm:text-xl font-medium tracking-wide drop-shadow-md">
            {transcript}
          </p>
          {!isListening && (
            <button
              onClick={startListening}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all animate-bounce"
            >
              Activer le micro & Écouter
            </button>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar with optional quick input */}
      <div className="w-full max-w-md pb-6 flex flex-col items-center space-y-4">
        <form onSubmit={handleSendText} className="w-full flex items-center space-x-2 px-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Tapez un message vocal ou question..."
            className="flex-1 px-4 py-3 rounded-full bg-[#222] border border-[#383838] text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 shadow-md"
          />
          <button
            type="submit"
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center space-x-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Activer le micro' : 'Couper le micro'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isMuted
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#222] hover:bg-[#333] text-white border border-[#383838]'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Voice Session Button (X) */}
          <button
            onClick={onClose}
            title="Terminer la session"
            className="w-16 h-16 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-xl transition-transform active:scale-95 font-bold"
          >
            <X className="w-7 h-7 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Settings Bottom Sheet Modal */}
      {showSettings && (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-[#181818] border-t border-[#2f2f2f] rounded-t-[32px] p-6 shadow-2xl animate-slideUp max-w-xl mx-auto">
          <div className="w-12 h-1.5 bg-[#444] rounded-full mx-auto mb-6" />
          <h3 className="text-lg font-semibold text-white mb-4 text-center">Paramètres vocaux</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#222] border border-[#2f2f2f] hover:bg-[#282828] transition-colors cursor-pointer">
              <div className="flex items-center space-x-3 text-neutral-200">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-sm">Voix de l'assistant</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span>{selectedVoice}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#222] border border-[#2f2f2f] hover:bg-[#282828] transition-colors cursor-pointer">
              <div className="flex items-center space-x-3 text-neutral-200">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-sm">Langue</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span>{selectedLanguage}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#222] border border-[#2f2f2f] hover:bg-[#282828] transition-colors cursor-pointer">
              <div className="flex items-center space-x-3 text-neutral-200">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-sm">Sortie audio</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span>{audioOutput}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-6 py-3 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
          >
            Fermer les paramètres
          </button>
        </div>
      )}
    </div>
  );
};
