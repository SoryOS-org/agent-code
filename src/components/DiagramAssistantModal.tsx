/**
 * Diagram & README Assistant Modal
 * Quick-start templates for Mermaid (Flowchart, Sequence, Mindmap, ERD, State, Gantt)
 * and comprehensive GitHub README.md generation
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  GitFork,
  ArrowRightLeft,
  BrainCircuit,
  Database,
  Layers,
  Calendar,
  FileText,
  Copy,
  Check,
  Play,
} from 'lucide-react';

interface DiagramAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

interface TemplateItem {
  id: string;
  category: 'diagram' | 'readme' | 'mindmap';
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  sampleCode: string;
}

export const DiagramAssistantModal: React.FC<DiagramAssistantModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'diagram' | 'readme' | 'mindmap'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const templates: TemplateItem[] = [
    {
      id: 'readme-full',
      category: 'readme',
      title: 'README.md Complet avec Diagramme',
      description: 'Génère un README professionnel GitHub avec badges, table des matières, architecture Mermaid et guide d\'installation.',
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      prompt: 'Génère un fichier README.md complet et professionnel pour ce projet (assistant IA avec monorepo, backend Express SSE et frontend React). Inclus des badges de build, une table des matières, un diagramme Mermaid d\'architecture globale (flowchart TD), les prérequis, les variables d\'environnement et les instructions d\'installation.',
      sampleCode: `# Mon Projet IA
\`\`\`mermaid
flowchart TD
    Client[Web Client] -->|SSE / API| API[API Gateway]
    API --> AI[Provider Adapters]
\`\`\``,
    },
    {
      id: 'flowchart-arch',
      category: 'diagram',
      title: 'Flux d\'Architecture (Flowchart)',
      description: 'Diagramme de flux Mermaid TD ou LR pour illustrer les couches applicatives, services et bases de données.',
      icon: <Layers className="w-5 h-5 text-blue-400" />,
      prompt: 'Crée un diagramme Mermaid complet de type flowchart TD illustrant l\'architecture de l\'application (Frontend React, Client API, Express Gateway, Orchestrateur IA, Adaptateurs Gemini / OpenRouter et Stockage). Utilise des sous-graphes (subgraph) et des styles élégants.',
      sampleCode: `\`\`\`mermaid
flowchart TD
    subgraph Frontend [Client Web]
        UI[Interface React]
        SSE[Client SSE]
    end
    subgraph Backend [Serveur Node.js]
        Server[Express Gateway]
        Orchestrator[AI Core Engine]
    end
    UI --> SSE
    SSE --> Server
    Server --> Orchestrator
\`\`\``,
    },
    {
      id: 'sequence-auth',
      category: 'diagram',
      title: 'Diagramme de Séquence (Auth & Streaming)',
      description: 'Diagramme temporel Mermaid montrant les échanges pas-à-pas entre utilisateur, frontend, backend et LLM.',
      icon: <ArrowRightLeft className="w-5 h-5 text-purple-400" />,
      prompt: 'Génère un diagramme de séquence Mermaid (sequenceDiagram) détaillé montrant le flux complet d\'une requête utilisateur avec streaming SSE : 1. Envoi du message, 2. Vérification du quota, 3. Streaming des tokens par le LLM, 4. Réception progressive et affichage dans le chat.',
      sampleCode: `\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as Utilisateur
    participant Front as Frontend Web
    participant API as API Server
    participant LLM as Moteur Gemini / LLM

    User->>Front: Saisie du prompt
    Front->>API: POST /api/conversations/:id/messages
    API->>LLM: Inférence streaming
    loop Tokens reçus
        LLM-->>API: Chunk delta
        API-->>Front: Event SSE (text_delta)
        Front-->>User: Affichage temps réel
    end
    LLM-->>API: Finish (stop)
    API-->>Front: Event SSE (message_complete)
\`\`\``,
    },
    {
      id: 'mindmap-proj',
      category: 'mindmap',
      title: 'Carte Mentale / Markflow (Mindmap)',
      description: 'Organigramme arborescent Mermaid mindmap pour structurer les idées, fonctionnalités ou la roadmap.',
      icon: <BrainCircuit className="w-5 h-5 text-amber-400" />,
      prompt: 'Génère une carte mentale Mermaid complète (mindmap) représentant l\'écosystème d\'un assistant IA moderne : Modèles (Gemini, OpenRouter, Mistral), Fonctionnalités (Chat, Multimodal, Diagrammes, Synthèse vocale), Sécurité (Chiffrement, RBAC) et Déploiement.',
      sampleCode: `\`\`\`mermaid
mindmap
  root((Assistant IA))
    Fonctionnalités
      Streaming SSE
      Rendu Mermaid
      Recherche Web
      Dictée Vocale
    Fournisseurs
      Google Gemini
      OpenRouter Free
      Mistral AI
    Sécurité
      Isolation clés API
      Rate limiting
\`\`\``,
    },
    {
      id: 'er-database',
      category: 'diagram',
      title: 'Schéma de Base de Données (ERD)',
      description: 'Diagramme entité-relation Mermaid pour bases relationnelles (PostgreSQL, SQLite, Prisma).',
      icon: <Database className="w-5 h-5 text-rose-400" />,
      prompt: 'Génère un diagramme entité-relation Mermaid (erDiagram) pour la base de données d\'un assistant IA avec les entités : USERS, CONVERSATIONS, MESSAGES, ATTACHMENTS et MODEL_CONFIGS avec leurs relations et clés primaires.',
      sampleCode: `\`\`\`mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : "crée"
    CONVERSATIONS ||--|{ MESSAGES : "contient"
    MESSAGES ||--o{ ATTACHMENTS : "possède"
    USERS {
        uuid id PK
        string email
        json preferences
    }
    CONVERSATIONS {
        uuid id PK
        string title
        string model_id
    }
\`\`\``,
    },
    {
      id: 'gantt-roadmap',
      category: 'diagram',
      title: 'Planning & Roadmap (Gantt)',
      description: 'Diagramme de Gantt Mermaid pour planifier les sprints, jalons et livraisons.',
      icon: <Calendar className="w-5 h-5 text-teal-400" />,
      prompt: 'Crée un diagramme de Gantt Mermaid (gantt) pour la roadmap de développement d\'une application IA sur 4 semaines : Conception & Architecture, Intégration LLM, Interface ChatGPT responsive, et Tests & Déploiement.',
      sampleCode: `\`\`\`mermaid
gantt
    title Roadmap Assistant IA
    dateFormat  YYYY-MM-DD
    section Phase 1
    Architecture & Monorepo :done, a1, 2026-11-01, 7d
    section Phase 2
    Streaming SSE & Gemini   :active, a2, 2026-11-08, 7d
    section Phase 3
    Interface & Mermaid      :a3, 2026-11-15, 7d
\`\`\``,
    },
  ];

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const handleCopySample = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#1e1e1e] border border-[#2f2f2f] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f2f] bg-[#1e1e1e]">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">
                Studio Diagrammes Mermaid & README
              </h3>
              <p className="text-xs text-[#888888]">
                Flowcharts, diagrammes de séquence, cartes mentales (mindmap) et documentation GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center px-5 py-2.5 bg-[#171717] border-b border-[#2a2a2a] space-x-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Tous les modèles' },
            { id: 'diagram', label: '📊 Diagrammes (Flow, Seq, ERD)' },
            { id: 'mindmap', label: '🧠 Mindmaps & Cartes' },
            { id: 'readme', label: '📑 Documentation README.md' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white font-medium shadow-xs'
                  : 'bg-[#262626] text-[#b4b4b4] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#141414]">
          {filteredTemplates.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#1c1c1c] border border-[#2e2e2e] hover:border-[#3e3e3e] transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-[#282828] shrink-0">{item.icon}</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-[#a0a0a0] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => handleCopySample(item.id, item.sampleCode)}
                    className="p-2 rounded-xl hover:bg-[#282828] text-[#888888] hover:text-white transition-colors"
                    title="Copier un exemple de syntaxe"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onSelectPrompt(item.prompt);
                      onClose();
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Générer</span>
                  </button>
                </div>
              </div>

              {/* Syntax preview snippet */}
              <div className="rounded-xl bg-[#0f0f0f] border border-[#262626] p-2.5 font-mono text-[11.5px] text-[#888888] overflow-x-auto">
                <pre className="m-0 leading-tight">
                  <code>{item.sampleCode.slice(0, 180)}...</code>
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between text-xs text-[#888888]">
          <span className="flex items-center space-x-1.5">
            <GitFork className="w-3.5 h-3.5 text-blue-400" />
            <span>Support natif : Flowchart, Sequence, Mindmap, ERD, State, Gantt, Pie</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#282828] hover:bg-[#333333] text-white transition-colors text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
