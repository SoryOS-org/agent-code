/**
 * Welcome Screen Component: ChatGPT-identical clean center greeting and starter prompts
 * with prominent options for Mermaid diagrams (flowcharts, mindmaps, sequence, ERD) and README generation
 */

import React from 'react';
import {
  Code2,
  Workflow,
  BrainCircuit,
  Database,
  FileText,
  Compass,
  Sparkles,
} from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  activeModelName: string;
  onOpenDiagramStudio?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  onOpenDiagramStudio,
}) => {
  const suggestions = [
    {
      icon: <Workflow className="w-4 h-4 text-blue-400" />,
      title: 'Diagramme d\'Architecture (Flowchart)',
      tag: 'Mermaid',
      prompt: 'Génère un diagramme Mermaid complet de type flowchart TD illustrant l\'architecture modulaire de cette application (Client React, Passerelle Express SSE, Moteur d\'orchestration IA, Fournisseurs LLM et stockage). Ajoute des styles et des sous-graphes.',
    },
    {
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      title: 'Générer un README.md avec Diagramme',
      tag: 'README',
      prompt: 'Génère un fichier README.md complet et professionnel pour GitHub. Inclus des badges (version, licence, TypeScript), un diagramme Mermaid flowchart de l\'architecture, la structure des dossiers, les variables d\'environnement et les étapes d\'installation.',
    },
    {
      icon: <BrainCircuit className="w-4 h-4 text-amber-400" />,
      title: 'Carte Mentale / Mindmap (Markflow)',
      tag: 'Mindmap',
      prompt: 'Crée une carte mentale Mermaid complète (mindmap) représentant l\'écosystème d\'un assistant IA moderne : Modèles LLM, Capacités multimodales, Outils intégrés, Sécurité et Déploiement.',
    },
    {
      icon: <Database className="w-4 h-4 text-rose-400" />,
      title: 'Schéma Base de Données (ERD)',
      tag: 'Base de données',
      prompt: 'Génère un diagramme entité-relation Mermaid (erDiagram) pour une base de données d\'assistant IA avec les tables users, conversations, messages, attachments et model_configs, leurs champs et clés étrangères.',
    },
    {
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
      title: 'Composant React TypeScript',
      tag: 'Code',
      prompt: 'Écris un composant React en TypeScript avec Tailwind CSS pour un visualiseur interactif de graphiques avec zoom et export.',
    },
    {
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      title: 'Diagramme de Séquence (Auth & SSE)',
      tag: 'Séquence',
      prompt: 'Crée un diagramme de séquence Mermaid (sequenceDiagram) avec autonumber montrant les étapes détaillées d\'un appel streaming SSE entre l\'utilisateur, le frontend, le serveur Express et l\'API LLM.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-2xl mx-auto w-full text-center my-auto select-none">
      <div className="space-y-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
          Que puis-je faire pour vous ?
        </h2>
        <p className="text-xs md:text-sm text-[#a0a0a0] max-w-md mx-auto">
          Posez une question, demandez du code, ou générez instantanément des diagrammes Mermaid interactifs et de la documentation README.
        </p>

        {onOpenDiagramStudio && (
          <div className="pt-1">
            <button
              onClick={onOpenDiagramStudio}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ouvrir la bibliothèque de Diagrammes & README</span>
            </button>
          </div>
        )}
      </div>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group p-3.5 rounded-2xl bg-[#212121] hover:bg-[#2a2a2a] border border-[#383838] hover:border-[#484848] transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-[#2a2a2a] group-hover:bg-[#383838] transition-colors">
                  {item.icon}
                </span>
                <span className="font-medium text-xs md:text-sm text-[#ececec] line-clamp-1">
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2e2e2e] text-[#8e8e8e] font-mono shrink-0">
                {item.tag}
              </span>
            </div>
            <p className="text-xs text-[#a0a0a0] leading-relaxed line-clamp-2">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
