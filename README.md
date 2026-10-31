# Aether AI ⚡

> Assistant IA conversationnel complet, modulaire, sécurisé et multi-fournisseurs avec streaming temps réel.

Aether AI est conçu selon une architecture logicielle découplée pour garantir extensibilité, performance et isolation des responsabilités.

---

## 🌟 Points Forts

- **Architecture Modulaire** : Séparation stricte entre le frontend, l'API backend, le moteur d'orchestration (`ai-core`), les adaptateurs de fournisseurs et la base de données.
- **Environnement de Travail Remote E2B** : Nouvellement intégré ! Propose un sandbox cloud sécurisé pour l'exécution d'outils, les workflows de terminal interactif et la persistance des sessions.
- **Multi-fournisseurs d'IA** :
  - **Google Gemini** (via `@google/genai` natif serveur : `gemini-3.8-flash`, `gemini-4-argon`).
  - **OpenAI** (compatible GPT-4o, GPT-4o-mini).
  - **Mistral AI** (Mistral Large).
  - **Mode Test Hors-ligne** (validation instantanée et tests sans clé d'API).
- **Streaming Temps Réel (SSE)** : Réponses progressives token par token avec latence minimale et bouton d'interruption.
- **Gestionnaire de Contexte Intelligent** : Mémoire glissante, calcul du budget de tokens et injection de directives système personnalisées.
- **Rendu Markdown & Code Expert** : Blocs de code avec coloration syntaxique, numérotation de lignes et copie en un clic.
- **Gestion Multimodale** : Prise en charge des fichiers (images, documents, code source) avec validation MIME.
- **Sécurité et Isolation Multi-locataire** : Clés d'API confinées au serveur et contrôle d'accès strict par propriétaire de conversation.
- **Adapté au Développement Mobile** : Zéro dépendance native lourde (pas besoin de Docker, Rust ou PostgreSQL local pour démarrer).

---

## 📂 Structure du Répertoire

```
.
├── apps/
│   └── api/                    # Serveur API indépendant (routes, auth, validation)
├── packages/
│   ├── types/                  # Types TypeScript partagés
│   ├── contracts/              # Schémas de validation des requêtes et contrats
│   ├── ai-core/                # Moteur d'orchestration, contexte, outils, streaming
│   ├── provider-adapters/      # Adaptateurs Gemini, OpenAI, Mistral, Mock
│   ├── database/               # Schéma relationnel & store isolé
│   └── e2b/                    # **NOUVEAU** Plugin et gestionnaire de sandbox E2B
├── src/                        # Interface utilisateur React (Vite SPA)
│   ├── api/                    # Client HTTP et streaming SSE
│   ├── components/             # Sidebar, Header, Messages, Markdown, Input, Paramètres
│   │   ├── AgentActionsView.tsx
│   │   ├── CodeExecutionTerminal.tsx
│   │   ├── MessageItem.tsx          # Carte de message améliorée (polish opencode)
│   │   ├── PreviewModal.tsx
│   │   ├── TaskToolsPanel.tsx       # Carte des tâches améliorée (polish opencode)
│   │   └── TerminalModal.tsx
│   ├── App.tsx                 # Application principale
│   └── index.css               # Styles Tailwind CSS
├── docs/                       # Documentation détaillée
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── security.md
│   └── development.md
├── scripts/
│   └── test-ai-core.ts         # Suite de tests automatisés
├── server.ts                   # Point d'entrée full-stack (Express + Vite sur Port 3000)
└── package.json
```

---

## 🚀 Fonctionnalités E2B (Environment de Travail Remote)

L'environnement de travail E2B est une sandbox cloud sécurisée où l'agent exécute des outils, des commandes shell et partage des fichiers — comme bolt.new / lovable / replit, mais intégrée directement dans Aether.

### Rôle Principal
- **Exécution d'outils** : `shell`, `write`, `code_interpreter`, `glob`, `grep`, `read`, `edit` et autres outils agent fonctionnent dans le sandbox E2B.
- **Terminal Interactif** : PTY live avec historique, redimensionnement, et contrôle complet des sessions.
- **Persistance** : Les fichiers créés dans le sandbox sont automatiquement miroités vers l'arborescence locale `workspace/`.
- **Streaming SSE** : Status et sortie en direct des exécutions E2B vers l'interface utilisateur.

### Points d'Accès API
- `GET /code/sandbox` → Statut de la sandbox active (enabled/active/id/sandboxId)
- `DELETE /code/sandbox` → Arrêt propre de la session E2B
- `GET /code/terminal/stream` → Flux SSE PTY (sortie temps réel du shell)
- `POST /code/terminal/input` → Écriture brute dans le PTY interactif
- `POST /code/terminal/resize` → Redimensionne la fenêtre PTY
- `POST /code/command` → Exécution locale E2B fallback (backup si E2B_API_KEY manquant)
- `POST /code/execute` → Exécution sécurisée de code (Python/JS/TypeScript) en streaming (E2B sandbox)

### Configuration
Ajoutez `E2B_API_KEY` (obtenu sur https://e2b.dev/dashboard) dans votre `.env` :

```env
E2B_API_KEY="votre_cle_e2b"
E2B_PROJECT_PATH="/home/user/project"
E2B_SANDBOX_TIMEOUT_MS="3600000"
```

Si `E2B_API_KEY` est manquant, tous les outils tombent en fallback local (exécution workspace).

---

## 🚀 Démarrage

### 1. Lancer le serveur de développement
```bash
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

### 2. Lancer la suite de tests
```bash
npm run test
```

### 3. Vérifier les types
```bash
npm run lint
```

### 4. Construire pour la production
```bash
npm run build
```

---

## 🔐 Variables d'Environnement

Définissez les variables dans `.env` :

```env
# Clé Google Gemini (exécutée exclusivement côté serveur)
GEMINI_API_KEY="votre_cle_gemini"

# Clés optionnelles
OPENAI_API_KEY=""
MISTRAL_API_KEY=""

# E2B API Key (optionnel, pour le sandbox remote)
E2B_API_KEY=""
E2B_PROJECT_PATH="/home/user/project"
E2B_SANDBOX_TIMEOUT_MS="3600000"

PORT=3000
```

Si aucune clé n'est fournie, le mode Test Hors-ligne s'active automatiquement pour vous permettre d'explorer et tester l'ensemble des fonctionnalités.

---

## 📚 À Propos

Cette application est le cœur de Aether AI — une interface conversationnelle alimentée par l'IA, conçue pour la productivité et la sécurité, avec un accent sur la performance multi-fournisseurs et l'expérience utilisateur.

**Licence :** Propriétaire