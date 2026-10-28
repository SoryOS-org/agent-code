# Architecture du Système Aether AI

## 1. Vue d'ensemble

Aether AI est un assistant conversationnel intelligent de niveau entreprise conçu avec une architecture modulaire, découplée et évolutive. L'application sépare rigoureusement l'interface utilisateur, l'orchestration métier, les adaptateurs de modèles d'intelligence artificielle et la couche de persistance.

```
+-----------------------------------------------------------+
|                        Frontend                           |
|       (React SPA + Tailwind CSS + Client API SSE)         |
+-----------------------------+-----------------------------+
                              | HTTP / SSE
+-----------------------------v-----------------------------+
|                       Backend API                         |
|     (Node.js / Express / Fastify architecture modulaire)  |
|                                                           |
|  - Auth & Ownership Context (Multi-tenant)                |
|  - Validation des contrats & schemas                      |
|  - File Upload & MIME validation                          |
+--------------+-----------------------------+--------------+
               |                             |
+--------------v---------------+  +----------v--------------+
|       packages/ai-core       |  |    packages/database    |
| - Sliding Context Manager    |  | - Repository Pattern    |
| - Tool Execution Registry    |  | - In-memory / Postgres  |
| - Stream Orchestrator        |  | - Strict Ownership Check|
+--------------+---------------+  +-------------------------+
               |
+--------------v---------------+
|  packages/provider-adapters  |
| - Google Gemini (@google/    |
|   genai SDK natif serveur)   |
| - OpenRouter (Modèles        |
|   gratuits: openrouter/free) |
| - OpenAI Compatible          |
| - Mistral AI                 |
| - Test Mock Adapter          |
+------------------------------+
```

## 2. Découpage modulaire

- **`apps/api`** : Serveur REST et passerelle Server-Sent Events (SSE). Ne contient aucune dépendance vers React ou l'interface visuelle.
- **`packages/types`** : Types de domaine partagés (Message, Conversation, ToolCall, ModelDefinition, SSEMessage).
- **`packages/contracts`** : Schémas de validation des requêtes et contrats d'API.
- **`packages/ai-core`** : Moteur d'orchestration conversationnelle agnostique des interfaces. Gère le calcul du budget de tokens, la fenêtre glissante d'historique, les outils exécutables et le routage vers le bon adaptateur.
- **`packages/provider-adapters`** : Fournisseurs d'IA interchangeables avec négociation de capacités (streaming, vision, raisonnement, outils).
- **`packages/database`** : Dépôt de données unifié garantissant une isolation stricte par utilisateur (`userId`).
- **`src/`** : Interface utilisateur réactive et responsive (mobile, tablette, desktop) avec coloration syntaxique de code, prévisualisation de documents, et sélecteur de modèles.

## 3. Flux de Streaming Server-Sent Events (SSE)

1. L'utilisateur saisit un message (avec pièces jointes et options éventuelles).
2. Le client initie une requête `POST /v1/conversations/:id/messages/stream`.
3. Le serveur authentifie l'utilisateur, vérifie la propriété de la conversation, et enregistre le message utilisateur.
4. Le moteur `ai-core` résout le fournisseur correspondant au modèle choisi (ex: Gemini 3.8 Flash).
5. Le flux génère des événements typés :
   - `message_start` : initialisation de l'assistant.
   - `text_delta` : morceaux de texte progressifs.
   - `tool_call` : appel d'outils si nécessaire.
   - `message_complete` : clôture avec statistiques de tokens et latence.
   - `error` : propagation explicite avec conseils de configuration si un problème survient.
6. Le message final est persisté dans le dépôt de données.
