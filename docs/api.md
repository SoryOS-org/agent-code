# Spécification de l'API Aether AI

Toutes les routes sont préfixées par `/v1` (avec alias `/api`).

## 1. Santé du système
- **`GET /v1/health`**
  - Retourne l'état du serveur, le temps d'activité (uptime), et l'état de configuration des différents fournisseurs d'IA.

## 2. Modèles d'IA
- **`GET /v1/models`**
  - Retourne la liste des modèles déclarés par les adaptateurs, leurs fonctionnalités (vision, streaming, raisonnement) et leur statut de configuration.

## 3. Profil et Préférences
- **`GET /v1/me`**
  - Récupère l'utilisateur actif et ses préférences (instructions système, température, thème).
- **`PATCH /v1/me/preferences`**
  - Met à jour les préférences de l'utilisateur.
  - Body : `{ "systemPrompt"?: string, "temperature"?: number, "defaultModel"?: string, "streamResponses"?: boolean }`

## 4. Conversations
- **`GET /v1/conversations`**
  - Liste toutes les conversations appartenant à l'utilisateur authentifié (triées par conversations épinglées puis date).
- **`POST /v1/conversations`**
  - Crée une nouvelle conversation.
  - Body : `{ "title"?: string, "modelId"?: string, "systemPrompt"?: string, "temperature"?: number }`
- **`GET /v1/conversations/:id`**
  - Récupère les métadonnées d'une conversation spécifique.
- **`PATCH /v1/conversations/:id`**
  - Met à jour le titre, le statut épinglé, le modèle ou les paramètres.
- **`DELETE /v1/conversations/:id`**
  - Supprime la conversation et tous ses messages associés.

## 5. Messages et Streaming
- **`GET /v1/conversations/:id/messages`**
  - Récupère l'historique complet des messages d'une conversation.
- **`POST /v1/conversations/:id/messages/stream`**
  - Démarre un flux Server-Sent Events (SSE).
  - Body :
    ```json
    {
      "content": "Bonjour, écris une fonction TypeScript",
      "modelId": "gemini-3.8-flash",
      "systemPrompt": "Sois concis.",
      "temperature": 0.7,
      "webSearch": false,
      "attachments": [
        {
          "name": "photo.png",
          "mimeType": "image/png",
          "size": 10240,
          "base64Data": "..."
        }
      ]
    }
    ```
  - Événements SSE retournés :
    - `message_start` : `{ "messageId": "...", "role": "assistant", "model": "..." }`
    - `text_delta` : `{ "delta": "..." }`
    - `reasoning_delta` : `{ "delta": "..." }`
    - `message_complete` : `{ "messageId": "...", "totalTokens": 120, "latencyMs": 420, "finishReason": "stop", "fullText": "..." }`
    - `error` : `{ "code": "...", "message": "...", "hint": "..." }`

## 6. Fichiers et Pièces jointes
- **`POST /v1/files`**
  - Téléverse une pièce jointe (max 10 Mo) après validation stricte du type MIME.
