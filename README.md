# Aether AI ⚡

> Assistant IA conversationnel complet, modulaire, sécurisé et multi-fournisseurs avec streaming temps réel.

Aether AI est conçu selon une architecture logicielle découplée pour garantir extensibilité, performance et isolation des responsabilités.

---

## 🌟 Points Forts

- **Architecture Modulaire** : Séparation stricte entre le frontend, l'API backend, le moteur d'orchestration (`ai-core`), les adaptateurs de fournisseurs et la base de données.
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
│   └── database/               # Schéma relationnel & store isolé
├── src/                        # Interface utilisateur React (Vite SPA)
│   ├── api/                    # Client HTTP et streaming SSE
│   ├── components/             # Sidebar, Header, Messages, Markdown, Input, Paramètres
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

PORT=3000
```

Si aucune clé n'est fournie, le mode Test Hors-ligne s'active automatiquement pour vous permettre d'explorer et tester l'ensemble des fonctionnalités.
