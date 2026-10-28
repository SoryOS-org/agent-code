/**
 * Settings Modal Component: user preferences, system instructions, temperature, provider status
 */

import React, { useState, useEffect } from 'react';
import type { ModelDefinition, UserPreferences } from '@packages/types/src/index.ts';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Key,
  RotateCcw,
  Save,
  Activity,
} from 'lucide-react';
import { api } from '../api/client.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  models: ModelDefinition[];
  onSavePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  models,
  onSavePreferences,
}) => {
  const [systemPrompt, setSystemPrompt] = useState(preferences.systemPrompt);
  const [temperature, setTemperature] = useState(preferences.temperature);
  const [defaultModel, setDefaultModel] = useState(preferences.defaultModel);
  const [streamResponses, setStreamResponses] = useState(preferences.streamResponses);
  const [healthData, setHealthData] = useState<any>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(preferences.systemPrompt);
      setTemperature(preferences.temperature);
      setDefaultModel(preferences.defaultModel);
      setStreamResponses(preferences.streamResponses);
      api.getHealth().then(setHealthData).catch(() => {});
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePreferences({
      systemPrompt,
      temperature,
      defaultModel,
      streamResponses,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setSystemPrompt('Tu es un assistant IA bienveillant, concis, précis et expert en développement, analyse et rédaction.');
    setTemperature(0.7);
    setDefaultModel('gemini-3.8-flash');
    setStreamResponses(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Paramètres de l'Assistant</h2>
              <p className="text-xs text-slate-400">Personnalisez le comportement, les modèles et le système</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-200">
          {/* Instructions système */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Directives Système (System Prompt)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Ex: Réponds toujours en français, sois rigoureux et utilise des exemples de code TypeScript..."
              className="w-full p-3 text-xs md:text-sm rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-600 leading-relaxed resize-none"
            />
            <p className="text-[11px] text-slate-500">
              Ces instructions conditionnent la personnalité et les contraintes de l'IA pour chaque réponse.
            </p>
          </div>

          {/* Modèle par défaut & Température */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Modèle par défaut
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full p-2.5 text-xs md:text-sm rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-cyan-500 text-slate-100"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.providerName}) {m.isConfigured ? '✓' : '(Non configuré)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Créativité (Température)
                </label>
                <span className="text-xs font-mono text-cyan-400 font-semibold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Précis & Déterministe)</span>
                <span>1.5 (Très Créatif)</span>
              </div>
            </div>
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-200">Streaming en direct (SSE)</div>
              <div className="text-[11px] text-slate-500">Affiche le texte token par token au fur et à mesure</div>
            </div>
            <button
              type="button"
              onClick={() => setStreamResponses(!streamResponses)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                streamResponses ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  streamResponses ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* État des fournisseurs & Sécurité */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Santé du Backend & Connectivité IA</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Google Gemini</span>
                  {healthData?.providersStatus?.gemini?.configured ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Configuré
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                      <AlertCircle className="w-3 h-3" /> Clé manquante
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Fournisseur natif serveur via @google/genai SDK.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">OpenRouter (Gratuit)</span>
                  {healthData?.providersStatus?.openrouter?.configured ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Configuré
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                      <AlertCircle className="w-3 h-3" /> Clé requise
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Modèles gratuits : Llama 3.3 70B, DeepSeek R1, Qwen 2.5 Coder.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Mode Test Hors-ligne</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Prêt
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Modèle local simulé pour valider sans dépendance externe.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
              <Key className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Sécurité absolue :</strong> Toutes les clés d'API sont stockées et traitées exclusivement côté backend. Aucun jeton ou secret n'est exposé au navigateur web.
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-900/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedSuccess ? 'Enregistré !' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
