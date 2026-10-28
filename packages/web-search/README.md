# @packages/web-search

Package d'outils et d'orchestration pour la recherche Web et la récupération de contenu lisible, répliquant fidèlement l'architecture native d'**OpenCode** (`anomalyco/opencode`).

---

## 🔬 Analyse du Code Source OpenCode (`anomalyco/opencode`)

L'étude approfondie du dépôt officiel OpenCode a mis en évidence le fonctionnement exact du moteur de recherche Web natif :

1. **Protocole MCP (Model Context Protocol) sur HTTP/SSE** :
   - Fichiers sources clés dans OpenCode :
     - `packages/core/src/plugin/websearch/mcp.ts`
     - `packages/core/src/plugin/websearch/exa.ts`
     - `packages/core/src/plugin/websearch/parallel.ts`
     - `packages/core/src/websearch.ts`
     - `packages/core/src/tool/plugin/websearch.ts`
     - `packages/core/src/tool/plugin/webfetch.ts`
2. **Comment OpenCode effectue des recherches SANS clé API** :
   - OpenCode n'embarque pas de proxy fermé ; il interroge directement les serveurs MCP ouverts mis à disposition par les fournisseurs partenaires :
     - **Exa MCP** : `https://mcp.exa.ai/mcp` avec méthode JSON-RPC 2.0 `tools/call`, outil `web_search_exa`. Lorsque aucune clé API n'est fournie par l'utilisateur, l'URL est interrogée sans paramètre `?exaApiKey=...` et répond via un flux SSE (`event: message` `data: {...}`).
     - **Parallel MCP** : `https://search.parallel.ai/mcp` avec méthode `tools/call`, outil `web_search`. Sans clé utilisateur, le header `Authorization: Bearer` est omis et l'en-tête `User-Agent: OpenCode` est transmis.
   - Si l'utilisateur définit une clé optionnelle (`EXA_API_KEY` ou `PARALLEL_API_KEY`), OpenCode la transmet pour débloquer des quotas accrus.
3. **Format des citations pour l'Agent LLM** :
   - OpenCode formate chaque résultat avec un titre cliquable en Markdown et les dates de publication :
     ```markdown
     ## [Titre de la source](https://url-source.com)
     Published: 2026-10-28T...

     Extrait pertinent ou résumé textuel...
     ```
4. **Outil `webfetch`** :
   - Requête HTTP directe avec User-Agent `Mozilla/5.0 ... OpenCode-User/1.0; +https://opencode.ai`.
   - Formats pris en charge : `markdown` (par défaut), `text`, `html`.
   - Suivi sécurisé des redirections (jusqu'à 10).
   - Nettoyage des balises scripts/styles et extraction du contenu lisible limité à 256 Ko.

---

## 🏗️ Architecture du Package

```
packages/web-search/
├── package.json              # Déclaration du package
├── README.md                 # Analyse OpenCode & documentation
├── src/
│   ├── index.ts              # Exports publics
│   ├── types/
│   │   └── index.ts          # Types SearchOptions, SearchResultItem, WebFetchResponse
│   ├── utils/
│   │   ├── http.ts           # Safe fetch, validation URL & anti-SSRF
│   │   └── clean-html.ts     # Extracteur HTML vers Markdown lisible
│   ├── providers/
│   │   ├── provider.ts       # Interface SearchProvider & gestion d'erreurs
│   │   ├── mcp.ts            # Client MCP JSON-RPC 2.0 / SSE (reproduction de mcp.ts d'OpenCode)
│   │   ├── exa.ts            # Fournisseur Exa MCP natif OpenCode (sans clé obligatoire)
│   │   ├── parallel.ts       # Fournisseur Parallel MCP natif OpenCode (sans clé obligatoire)
│   │   ├── fallback.ts       # Fournisseur de secours Web
│   │   ├── opencode.ts       # Orchestrateur OpenCode (rotation Exa -> Parallel -> Fallback)
│   │   └── index.ts          # Registre & instanciation par défaut
│   └── tools/
│       ├── websearch.ts      # Outil "websearch" pour les modèles d'IA
│       └── webfetch.ts       # Outil "webfetch" pour extraction ciblée de page
```

---

## 🚀 Utilisation avec les Modèles IA

Les deux outils `websearch` et `webfetch` sont enregistrés dans le registre d'outils du moteur de conversation (`packages/ai-core/src/index.ts`).

### 1. `websearch`
- **Paramètres** :
  - `query` (string, requis) : Requête de recherche
  - `numResults` (number, optionnel, 1-10) : Nombre de résultats
  - `type` (auto | neural | keyword)
- **Retour** :
  - `results` : Résultats structurés (url, title, snippet, source, publishedDate).
  - `content` : Texte Markdown directement injectable dans le prompt de synthèse du modèle avec citations `## [Titre](URL)`.

### 2. `webfetch`
- **Paramètres** :
  - `url` (string, requis) : URL HTTP/HTTPS
  - `format` (markdown | text | html)
  - `maxCharacters` (number, défaut 8000)

---

## 🧪 Tests

Exécutez le script de test pour valider l'accès aux endpoints OpenCode réels :
```bash
npm run test:web
```
