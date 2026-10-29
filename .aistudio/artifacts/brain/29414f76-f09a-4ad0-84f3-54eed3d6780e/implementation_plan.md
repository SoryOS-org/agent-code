# Plan d'Architecture & Alinement OpenCode pour Aether AI

Ce plan définit l'architecture complète pour élever Aether AI au niveau d'un **agent développeur autonome complet** strictement aligné sur les meilleures pratiques d'**OpenCode** (boucle d'exécution d'agent, panneau de suivi des tâches `TaskTools`, validation des actions E2B sensibles, et exécution de code/fichiers/commandes).

---

## Modèle de Décisions & Choix Utilisateur

> [!IMPORTANT]
> **Choix Confirmés par l'Utilisateur (Phase 1) :**
> - **Objectif Prioritaire** : Moteur d'agent autonome avec boucle d'exécution (`Agent Loop`) et gestion structurée des tâches.
> - **Niveau d'Autonomie E2B** : Autonomie totale avec fenêtre de confirmation/approbation pour les commandes sensibles (ex: modifications profondes, commandes shell destructives).
> - **Interface des Outils de Tâches (`TaskTools`)** : Reproduction fidèle de l'UX d'OpenCode (panneau latéral de tâches avec statuts *À faire*, *En cours*, *Terminé*, et journal des actions d'outils E2B).

---

## 1. Vue d'Ensemble & Concept Clé

Aether AI devient une plateforme de développement assistée par IA de classe mondiale, combinant :
1. **La Boucle d'Agent Autonome OpenCode (`Agent Loop`)** : Un moteur d'exécution capable de décomposer une requête complexe en étapes, de planifier les outils, d'exécuter du code/commandes dans E2B, et d'adapter sa trajectoire jusqu'à l'aboutissement.
2. **Panneau d'Outils & Tâches OpenCode (`TaskTools`)** : Un volet dédié (ou onglet de contrôle) permettant de visualiser les tâches planifiées, l'outil actuellement sollicité (`e2b_write_file`, `e2b_run_command`, `e2b_code_interpreter`), et la progression globale.
3. **Sécurité & Mode Approbation** : Notification et confirmation visuelle pour les commandes système sensibles ou la modification de fichiers stratégiques.

---

## 2. Expérience Utilisateur & Design Visuel

### Parcours Utilisateur
1. **Saisie d'un Objectif Complexe** : L'utilisateur demande de créer, compiler, tester ou modifier un projet complet (ex: *"Crée une application Rust avec Cargo, ajoute un module de calcul et valide l'exécution dans E2B"*).
2. **Planification Automatique des Tâches** : L'agent décompose immédiatement l'objectif en sous-tâches affichées dans le panneau **Tâches OpenCode**.
3. **Boucle d'Exécution E2B en Direct** : L'agent enchaîne la création de fichiers (`Cargo.toml`, `src/main.rs`), l'installation de dépendances, et la compilation. Chaque action d'outil fait clignoter le badge de l'outil actif dans la console.
4. **Validation des Commandes Sensibles** : Si une commande est critique, une carte d'approbation moderne s'affiche avec options *Autoriser* ou *Refuser*.
5. **Rendu Final & Consolidation** : L'IA affiche le terminal de résultats E2B (`TerminalView`) et coche toutes les tâches complétées.

### Identité Visuelle & Thème
- **Aesthetic Direction** : Studio de développement sombre professionnel (inspiré d'OpenCode, VS Code et Vercel).
- **Couleurs & Atmosphère** : Fond neutre très sombre (`#09090b`), bordures subtiles (`#27272a`), touches d'accent émeraude (`#10b981`) pour le succès E2B, et bleu cyan (`#06b6d4`) pour les tâches actives.
- **Typographie** : Famille principale *Plus Jakarta Sans* pour l'interface et *JetBrains Mono* / *IBM Plex Mono* pour le terminal et les blocs de code.

---

## 3. Décisions Produit & Trade-Offs

- **Décision 1 : Boucle d'Agent Multi-Tours (`Agent Loop`)**
  - *Choix* : Implémenter la boucle de raisonnement multi-étapes côté serveur (`ConversationEngine`), permettant à l'IA d'enchaîner jusqu'à $N$ appels d'outils automatiques tant que la tâche n'est pas résolue.
  - *Pourquoi* : Évite à l'utilisateur de devoir relancer manuellement chaque étape.

- **Décision 2 : Panneau de Tâches OpenCode (`TaskTools Panel`)**
  - *Choix* : Un volet rétractable à droite (ou au-dessus de la zone de chat) affichant la liste des tâches actives de l'agent.
  - *Pourquoi* : Offre une transparence totale sur les opérations de l'agent sans surcharger la conversation principale.

---

## 4. Architecture Technique & Moteur de Tâches

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     IHM FRONTEND (React + Vite)                         │
├──────────────────────────┬──────────────────────────────────────────────┤
│  Chat Stream View        │  Panneau Tâches OpenCode (TaskTools Panel)  │
│  - Messages              │  - Liste des tâches (Todo / Progress / Done) │
│  - CodeBlock & Terminal  │  - Outil E2B actif (write_file, run_command) │
└────────────┬─────────────┴──────────────────────┬───────────────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 CLIENT API & SSE STREAMING (src/api/client.ts)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              SERVEUR BACKEND & AGENT LOOP (packages/ai-core)            │
│  - ConversationEngine (Orchestrateur de boucle multi-tours)             │
│  - ToolRegistry (e2b_code_interpreter, e2b_write_file, e2b_run_command)│
│  - TaskManager (Gestion de l'arbre de tâches OpenCode)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      E2B CLOUD SANDBOX RUNTIME                          │
│  - Machine virtuelle isolée dans le cloud E2B                           │
│  - Compilateurs (rustc, cargo, python, node, gcc)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Étapes de Réalisation Clés

1. **Module `TaskManager` (`packages/ai-core/src/task-manager.ts`)** :
   - Structure de données pour gérer la liste des tâches d'un projet, leurs statuts et logs d'exécution.
2. **Composant UI `TaskToolsPanel` (`src/components/TaskToolsPanel.tsx`)** :
   - Panneau latéral affichant les tâches d'agent et l'indicateur d'outil E2B en cours d'utilisation.
3. **Boucle d'Agent Autonome Multi-Tours (`ConversationEngine.ts`)** :
   - Capacité du serveur à exécuter l'outil, lire son retour, puis relancer l'IA pour l'étape suivante jusqu'à complétion de la tâche.
