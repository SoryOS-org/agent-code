# Sécurité et Fiabilité

## 1. Confinement des Clés d'API & Secrets

- **Règle absolue** : Les clés API (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`) ne sont **jamais** exposées au navigateur.
- Toutes les invocations vers les modèles d'intelligence artificielle sont orchestrées exclusivement par le backend (`packages/provider-adapters`).
- Le bundle frontend ne contient aucune référence aux secrets d'environnement.

## 2. Validation Stricte des Entrées

- Les charges utiles HTTP sont inspectées et validées par les schémas dans `packages/contracts`.
- Les chaînes de caractères sont plafonnées en taille (max 50 000 caractères par message) pour prévenir les attaques de saturation mémoire ou de déni de service.
- La température est bornée entre `0.0` et `2.0`.

## 3. Sécurité des Fichiers et Pièces Jointes

- Liste blanche de types MIME stricts (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`, `text/plain`, `text/markdown`, etc.).
- Plafond de taille strict (10 Mo maximum).
- Assainissement des noms de fichiers pour éviter les traversées de répertoires (`filename.replace(/[^a-zA-Z0-9._-]/g, '_')`).

## 4. Outils et Exécution de Code

- Les outils fournis au modèle (`calculate`, `get_current_time`, `analyze_text`) opèrent dans des périmètres strictement délimités sans accès au système de fichiers du serveur ni aux commandes du système d'exploitation (`exec`/`spawn`).
- L'outil de calcul filtre tous les caractères non mathématiques avant évaluation.
