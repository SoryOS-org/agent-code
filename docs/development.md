# Guide de Développement

## 1. Démarrage Rapide

Ce projet est optimisé pour être développé de manière légère, y compris depuis un environnement mobile ou un navigateur sans dépendance lourde :

```bash
# 1. Lancer le serveur de développement full-stack (port 3000)
npm run dev

# 2. Exécuter la suite de tests automatisés
npm run test

# 3. Vérifier les types TypeScript
npm run lint

# 4. Compiler pour la production
npm run build
```

## 2. Configuration des Variables d'Environnement

Créez un fichier `.env` ou configurez les variables dans votre environnement :

```bash
# Obligatoire pour utiliser les modèles Google Gemini en direct
GEMINI_API_KEY="votre_cle_gemini"

# Optionnel : pour OpenAI ou Mistral
OPENAI_API_KEY="votre_cle_openai"
MISTRAL_API_KEY="votre_cle_mistral"

# Port d'écoute (par défaut 3000)
PORT=3000
```

> **Note :** Si aucune clé d'API n'est configurée, l'application fonctionne immédiatement grâce au mode **Test Hors-ligne (Mock Adapter)**, permettant de valider l'ensemble du flux de conversation sans dépendance extérieure.

## 3. Ajout d'un Nouveau Fournisseur d'IA

Pour connecter un nouveau fournisseur :
1. Créez une classe implémentant `ProviderAdapter` dans `packages/provider-adapters/src/`.
2. Définissez `isConfigured()`, `getModels()`, et `generateStream()`.
3. Enregistrez l'adaptateur dans `ProviderRegistry`.
4. Le frontend découvrira automatiquement le nouveau fournisseur et ses modèles via `/v1/models` !
