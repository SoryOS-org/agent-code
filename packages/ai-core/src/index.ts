/**
 * @packages/ai-core
 * Independent conversation orchestration engine
 */

import type {
  Message,
  ModelDefinition,
  Role,
  SSEMessage,
  StreamEventType,
  ToolCall,
  ToolResult,
} from '@packages/types/src/index.ts';
import {
  type ProviderAdapter,
  ProviderRegistry,
  type ProviderStreamChunk,
} from '@packages/provider-adapters/src/index.ts';
import { createWebSearchTools } from '@packages/web-search/src/index.ts';
import { createE2BAgentTools } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';
import { createAgentTools } from '@packages/agent-tools/src/index.ts';
import {
  extractXmlToolCalls,
  executeXmlToolCalls,
  cleanXmlToolCallsFromText,
} from '@packages/opencode-e2b/src/tool-call-parser.ts';
import { TaskManager } from '@packages/task-manager/src/index.ts';
import type { WebSearchResponse } from '@packages/web-search/src/types/index.ts';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface EngineStreamOptions {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  history: Message[];
  prompt: string;
  attachments?: Array<{ name: string; mimeType: string; size: number; base64Data?: string }>;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  webSearch?: boolean;
  onEvent: (event: SSEMessage) => void;
  signal?: AbortSignal;
}

export interface EngineResult {
  fullText: string;
  totalTokens: number;
  latencyMs: number;
  model: string;
  provider: string;
  finishReason: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export class ContextManager {
  private maxHistoryTokens: number;

  constructor(maxHistoryTokens = 60000) {
    this.maxHistoryTokens = maxHistoryTokens;
  }

  /**
   * Budget and prune history to fit comfortably within model context limits
   */
  prepareContext(history: Message[], systemPrompt?: string): Message[] {
    const context: Message[] = [];

    // System message if provided
    if (systemPrompt && systemPrompt.trim().length > 0) {
      context.push({
        id: 'sys-prompt',
        conversationId: '',
        role: 'system',
        content: systemPrompt.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    // Rough token heuristic (~4 chars per token)
    let accumulatedTokens = 0;
    const historyToInclude: Message[] = [];

    // Iterate backwards from most recent message
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const approxTokens = Math.ceil((msg.content?.length || 0) / 4);

      if (accumulatedTokens + approxTokens > this.maxHistoryTokens) {
        break; // Context window limit reached
      }

      accumulatedTokens += approxTokens;
      historyToInclude.unshift(msg);
    }

    return [...context, ...historyToInclude];
  }
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.registerDefaults();
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private registerDefaults(): void {
    // Current time tool
    this.register({
      name: 'get_current_time',
      description: 'Obtenir l\'heure et la date courante au format ISO et local.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: () => {
        return {
          iso: new Date().toISOString(),
          locale: new Date().toLocaleString('fr-FR', { timeZone: 'UTC' }),
          year: new Date().getUTCFullYear(),
        };
      },
    });

    // Safe mathematical calculator
    this.register({
      name: 'calculate',
      description: 'Effectuer des calculs mathématiques précis (expressions arithmétiques standard).',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Ex: 24 * 60 + 15' },
        },
        required: ['expression'],
      },
      execute: ({ expression }) => {
        if (typeof expression !== 'string') return { error: 'Expression invalide' };
        // Only allow numbers, math operators, parentheses
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        try {
          // eslint-disable-next-line no-eval
          const result = Function(`'use strict'; return (${sanitized})`)();
          return { expression, result };
        } catch {
          return { error: 'Erreur d\'évaluation mathématique' };
        }
      },
    });

    // Text analyzer
    this.register({
      name: 'analyze_text',
      description: 'Analyser un texte : nombre de mots, caractères, estimation de temps de lecture.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Le texte à analyser' },
        },
        required: ['text'],
      },
      execute: ({ text }) => {
        const str = typeof text === 'string' ? text : '';
        const words = str.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9\u00C0-\u00FF]/.test(w));
        return {
          charCount: str.length,
          wordCount: words.length,
          estimatedReadingTimeSeconds: Math.ceil(words.length / 3.3),
        };
      },
    });

    // Register OpenCode-inspired Web Search and Web Fetch tools
    const webTools = createWebSearchTools();
    for (const tool of webTools) {
      this.register(tool);
    }

    // Register Full E2B Agent Tools (Code execution, write file, run command)
    const e2bTools = createE2BAgentTools();
    for (const tool of e2bTools) {
      this.register(tool);
    }

    // Register OpenCode Modular Workspace Agent Tools (shell, read, write, grep)
    const agentTools = createAgentTools();
    for (const tool of agentTools) {
      this.register(tool);
    }
  }
}

/**
 * Main AI Core Conversation Engine
 */
export class ConversationEngine {
  private providerRegistry: ProviderRegistry;
  private contextManager: ContextManager;
  private toolRegistry: ToolRegistry;
  private taskManager: TaskManager;

  constructor(
    providerRegistry = new ProviderRegistry(),
    contextManager = new ContextManager(),
    toolRegistry = new ToolRegistry(),
    taskManager = new TaskManager()
  ) {
    this.providerRegistry = providerRegistry;
    this.contextManager = contextManager;
    this.toolRegistry = toolRegistry;
    this.taskManager = taskManager;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Orchestrates prompt preparation, model resolution, streaming SSE events,
   * error handling, and completion metrics.
   */
  async streamConversation(options: EngineStreamOptions): Promise<EngineResult> {
    const startTime = Date.now();
    const defaultModel = 'gemini-3.8-flash';
    const selectedModelId = options.modelId || defaultModel;

    // Resolve provider
    const provider = this.providerRegistry.findProviderForModel(selectedModelId);

    if (!provider) {
      const errEvt: SSEMessage = {
        event: 'error',
        data: {
          code: 'PROVIDER_NOT_FOUND',
          message: `Aucun fournisseur disponible pour le modèle "${selectedModelId}".`,
          hint: 'Vérifiez la liste des modèles supportés ou sélectionnez Google Gemini.',
        },
      };
      options.onEvent(errEvt);
      throw new Error(`Provider not found for model ${selectedModelId}`);
    }

    // Check configuration
    if (!provider.isConfigured()) {
      const helpMsg = provider.getMissingConfigHelp();
      const errEvt: SSEMessage = {
        event: 'error',
        data: {
          code: 'PROVIDER_UNCONFIGURED',
          message: `Le fournisseur ${provider.name} n'est pas encore configuré côté serveur.`,
          hint: helpMsg,
        },
      };
      options.onEvent(errEvt);
      throw new Error(`Provider ${provider.name} unconfigured: ${helpMsg}`);
    }

    // Build user message and context
    const currentAttachments = options.attachments?.map((att, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      name: att.name,
      mimeType: att.mimeType,
      size: att.size,
      base64Data: att.base64Data,
      createdAt: new Date().toISOString(),
    }));

    const newUserMessage: Message = {
      id: options.userMessageId,
      conversationId: options.conversationId,
      role: 'user',
      content: options.prompt,
      attachments: currentAttachments,
      createdAt: new Date().toISOString(),
    };

    const e2bCapabilitiesInstruction = `\n\n[CAPACITÉS ACTIVES D'AGENT DÉVELOPPEUR FULL AUTONOME : OPENCODE / CODEX / REPLIT STYLE]
Tu es Aether AI, un agent développeur autonome connecté directement à un environnement d'exécution complet E2B Cloud Sandbox.
Tes capacités d'agent incluent :
1. Exécution de code en direct (Python, JavaScript, TypeScript) via 'e2b_code_interpreter'.
2. Création et modification de fichiers (code source, scripts, README, config) via 'e2b_write_file'.
3. Exécution de commandes terminal shell (pip install, npm install, git, bash, scripts) via 'e2b_run_command'.
4. Recherche Web en direct avec sources cliquables.

Si l'utilisateur te demande si tu es capable d'exécuter, créer, modifier du code ou de gérer un projet comme OpenCode, Codex ou Replit : Réponds OUI avec enthousiasme et assurance, puis exécute ou génère le code/fichier immédiatement !
---------------------------------------------------------------------------------------------------\n`;

    let effectiveSystemPrompt = (options.systemPrompt || '') + e2bCapabilitiesInstruction;

    // Auto-detect web search intent if not explicitly enabled
    let effectiveWebSearch = options.webSearch;
    if (!effectiveWebSearch && options.prompt) {
      const lowerPrompt = options.prompt.toLowerCase();
      const searchKeywords = [
        'recherche',
        'recherches',
        'rechercher',
        'cherche',
        'chercher',
        'search',
        'actu',
        'actualité',
        'actualités',
        'sur internet',
        'sur le web',
        'sur google',
        'news',
        'dernières nouvelles',
        'dernier',
        'récent',
        'récente',
        'trouve',
        'informe-moi',
      ];
      if (searchKeywords.some((kw) => lowerPrompt.includes(kw))) {
        effectiveWebSearch = true;
      }
    }

    // If web search is active or auto-detected, execute websearch tool and ground conversation with structured sources
    if (effectiveWebSearch) {
      const searchTool = this.toolRegistry.get('websearch');
      if (searchTool) {
        const searchCallId = `tool_search_${Date.now()}`;
        options.onEvent({
          event: 'tool_call',
          data: {
            toolCall: {
              id: searchCallId,
              name: 'websearch',
              args: { query: options.prompt, numResults: 5 },
            },
          },
        });

        try {
          const searchData = (await searchTool.execute({
            query: options.prompt,
            numResults: 5,
          })) as WebSearchResponse;

          if (searchData && Array.isArray(searchData.results) && searchData.results.length > 0) {
            const formattedSources = searchData.results
              .map(
                (item, idx) =>
                  `[Source ${idx + 1}] Titre: "${item.title}"\nURL: ${item.url}\nDomaine: ${item.source}\nExtrait: ${item.snippet}`
              )
              .join('\n\n');

            const groundingInstruction = `\n\n--- DONNÉES DE RECHERCHE WEB EN DIRECT (OpenCode Engine: ${searchData.provider === 'exa' ? 'Exa Neural Search' : 'Web Search'}) ---\nRequête: "${options.prompt}"\n\n${formattedSources}\n\nCONSIGNES DE SOURÇAGE :\n1. Répondez précisément à la question en utilisant ces faits récents trouvés sur le Web.\n2. Citez explicitement chaque information avec des liens Markdown cliquables : [Titre de la source](URL).\n3. À la fin de la réponse, incluez systématiquement une section "### 🌐 Sources & Liens" avec les liens directs vers les pages consultées.\n---------------------------------------------------`;

            effectiveSystemPrompt += groundingInstruction;
          }
        } catch (searchErr) {
          console.warn('[ConversationEngine] Web search execution error:', searchErr);
        }
      }
    }

    // Auto-detect code execution intent if user prompt contains code blocks or run requests
    const lowerPromptForCode = options.prompt.toLowerCase();
    if (
      lowerPromptForCode.includes('exécute') ||
      lowerPromptForCode.includes('execute') ||
      lowerPromptForCode.includes('lance') ||
      lowerPromptForCode.includes('run') ||
      options.prompt.includes('```')
    ) {
      const codeMatch = options.prompt.match(/```([a-zA-Z]*)\n([\s\S]*?)```/);
      if (codeMatch) {
        const langRaw = codeMatch[1].toLowerCase();
        const codeToRun = codeMatch[2];
        const language = langRaw.includes('py') ? 'python' : 'javascript';

        const codeTool = this.toolRegistry.get('e2b_code_interpreter');
        if (codeTool) {
          const callId = `tool_code_${Date.now()}`;
          options.onEvent({
            event: 'tool_call',
            data: {
              toolCall: {
                id: callId,
                name: 'e2b_code_interpreter',
                args: { language, code: codeToRun },
              },
            },
          });

          try {
            const execResult = (await codeTool.execute({ language, code: codeToRun })) as any;
            if (execResult) {
              const execContext = `\n\n--- RÉSULTAT DE L'EXÉCUTION DU CODE (E2B Sandbox / Secure Runtime) ---\nEnvironnement: ${execResult.environment}\nCode de sortie: ${execResult.exitCode}\nTemps d'exécution: ${execResult.executionTimeMs}ms\n\nSTDOUT :\n\`\`\`\n${execResult.stdout || '(vide)'}\n\`\`\`\n\nSTDERR :\n\`\`\`\n${execResult.stderr || '(aucune)'}\n\`\`\`\n-------------------------------------------------------------`;
              effectiveSystemPrompt += execContext;
            }
          } catch (execErr) {
            console.warn('[ConversationEngine] Code execution error:', execErr);
          }
        }
      }
    }

    const fullHistory = [...options.history, newUserMessage];
    const preparedMessages = this.contextManager.prepareContext(
      fullHistory,
      effectiveSystemPrompt
    );

    // Emit message_start event
    options.onEvent({
      event: 'message_start',
      data: {
        messageId: options.assistantMessageId,
        conversationId: options.conversationId,
        role: 'assistant',
        model: selectedModelId,
      },
    });

    let fullText = '';
    let finishReason = 'stop';

    try {
      const stream = provider.generateStream({
        modelId: selectedModelId,
        messages: preparedMessages,
        systemInstruction: effectiveSystemPrompt,
        temperature: options.temperature,
        webSearch: options.webSearch,
        signal: options.signal,
      });

      for await (const chunk of stream) {
        if (options.signal?.aborted) {
          finishReason = 'aborted';
          break;
        }

        if (chunk.type === 'delta' && chunk.text) {
          fullText += chunk.text;
          options.onEvent({
            event: 'text_delta',
            data: { delta: chunk.text },
          });
        } else if (chunk.type === 'reasoning' && chunk.text) {
          options.onEvent({
            event: 'reasoning_delta',
            data: { delta: chunk.text },
          });
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          options.onEvent({
            event: 'tool_call',
            data: { toolCall: chunk.toolCall },
          });
        } else if (chunk.type === 'finish') {
          if (chunk.finishReason) finishReason = chunk.finishReason;
        }
      }

      // Process XML tool calls if emitted in text by models (e.g. OpenRouter free LLMs)
      if (fullText.includes('<tool_call>')) {
        const xmlCalls = extractXmlToolCalls(fullText);
        if (xmlCalls.length > 0) {
          const executed = await executeXmlToolCalls(xmlCalls);
          const cleanedText = cleanXmlToolCallsFromText(fullText);

          let toolResultsSummary = '\n\n### ⚡ Action(s) E2B Exécutée(s) :\n';
          for (const item of executed) {
            if (item.toolName === 'e2b_write_file') {
              toolResultsSummary += `- **Fichier créé dans la Sandbox E2B** : \`${item.result.path}\` (${item.result.message})\n`;
            } else if (item.toolName === 'e2b_run_command') {
              toolResultsSummary += `\n**Commande E2B** : \`${item.result.command || 'bash'}\` (Code ${item.result.exitCode})\n\`\`\`\n${item.result.stdout || item.result.stderr || '(succès)'}\n\`\`\`\n`;
            } else if (item.toolName === 'e2b_code_interpreter') {
              toolResultsSummary += `\n--- RÉSULTAT DE L'EXÉCUTION DU CODE (E2B Sandbox / Secure Runtime) ---\nEnvironnement: ${item.result.environment}\nCode de sortie: ${item.result.exitCode}\nTemps d'exécution: ${item.result.executionTimeMs}ms\n\nSTDOUT :\n\`\`\`\n${item.result.stdout || '(vide)'}\n\`\`\`\n\nSTDERR :\n\`\`\`\n${item.result.stderr || '(aucune)'}\n\`\`\`\n-------------------------------------------------------------\n`;
            }
          }

          fullText = cleanedText + toolResultsSummary;
        }
      }

      const latencyMs = Date.now() - startTime;
      const totalTokens = Math.ceil((options.prompt.length + fullText.length) / 4);

      options.onEvent({
        event: 'message_complete',
        data: {
          messageId: options.assistantMessageId,
          totalTokens,
          latencyMs,
          finishReason,
          fullText,
        },
      });

      return {
        fullText,
        totalTokens,
        latencyMs,
        model: selectedModelId,
        provider: provider.id,
        finishReason,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      options.onEvent({
        event: 'error',
        data: {
          code: 'GENERATION_ERROR',
          message: errorMsg,
          hint: 'Vérifiez la connexion réseau, les quotas ou la validité de la clé API.',
        },
      });
      throw err;
    }
  }
}
