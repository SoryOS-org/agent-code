# Modèle de Données et Persistance

## 1. Stratégie de Persistance

Aether AI utilise le pattern Repository pour découpler la logique métier du moteur de stockage :

1. **Environnement Mobile / Développement Rapide** :
   - Un store en mémoire thread-safe (`InMemoryDatabase`) avec données pré-amorcées.
   - Ne nécessite aucun serveur PostgreSQL local ni Docker, idéal pour le développement léger sur téléphone ou conteneur éphémère.
2. **Production & Déploiement Cloud** :
   - Schéma relationnel compatible PostgreSQL & Drizzle ORM avec contraintes d'intégrité référentielle et indexation.

## 2. Schéma Relationnel

### Tables Principales
- `users` : Utilisateurs du système (`id`, `email`, `name`, `created_at`, `updated_at`).
- `user_preferences` : Préférences personnalisées (`user_id`, `theme`, `default_model`, `system_prompt`, `temperature`, `max_tokens`, `stream_responses`).
- `conversations` : Sessions de discussion (`id`, `user_id`, `title`, `model_id`, `provider_id`, `system_prompt`, `temperature`, `pinned`, `created_at`, `updated_at`).
  - Index : `(user_id, updated_at DESC)`
- `messages` : Échanges individuels (`id`, `conversation_id`, `user_id`, `role`, `content`, `tokens`, `latency_ms`, `model`, `finish_reason`, `created_at`).
  - Index : `(conversation_id, created_at ASC)`
- `attachments` : Fichiers liés aux messages (`id`, `message_id`, `conversation_id`, `user_id`, `name`, `mime_type`, `size`, `storage_path`, `base64_data`, `created_at`).
- `usage_events` : Télémétrie et suivi des tokens consommés (`id`, `user_id`, `conversation_id`, `model_id`, `provider_id`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `duration_ms`).

## 3. Règle d'Isolation Multi-locataire (Ownership)

Toutes les requêtes de lecture, modification ou suppression vérifient systématiquement la condition :
```ts
if (conversation.userId !== currentUserId) {
  return null; // Accès refusé
}
```
Un utilisateur ne peut en aucun cas accéder aux données d'un tiers.
