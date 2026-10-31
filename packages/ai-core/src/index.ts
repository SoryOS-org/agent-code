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
import { createE2BAgentTools } from '@packages/e2b/src/e2b-agent-tools.ts';
import { createAgentTools } from '@packages/agent-tools/src/index.ts';
import {
  extractXmlToolCalls,
  executeXmlToolCalls,
  cleanXmlToolCallsFromText,
} from '@packages/e2b/src/tool-call-parser.ts';
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

    // Register Core Agent Tools (Connect to E2B by default if available)
    const agentTools = createAgentTools();
    for (const tool of agentTools) {
      this.register(tool);
    }

    // Ensure E2B specific names are also registered as aliases or specific tools if needed
    const e2bTools = createE2BAgentTools();
    for (const tool of e2bTools) {
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

    const e2bCapabilitiesInstruction = `
[IDENTITÉ ET MISSIONS]
Tu es Aether AI, un agent de programmation autonome de type OpenCode.
Ton but est de réaliser ENTIÈREMENT la tâche demandée dans le workspace.

[RÈGLES CRITIQUES]
1. FIDÉLITÉ : Si on demande un "jeu de voiture", tu FAIS un jeu de voiture. Ne change jamais le sujet (pas de "jeu de devinettes").
2. ACTION RÉELLE : Toute intention de créer ou modifier du code DOIT passer par l'outil 'write'. Ne te contente pas d'écrire le code dans ton message, appelle l'outil !
3. CHEMINS COMPLETS : Donne toujours le chemin complet du fichier (ex: index.html, src/game.ts).
4. TECHNOLOGIE : Préfère HTML5 (Canvas/JS/CSS) pour les jeux afin qu'ils soient visibles dans la Preview.

[MÉTHODOLOGIE]
- PLAN : Annonce ton plan brièvement.
- ACTION : Appelle TOUS les outils nécessaires (write, shell) immédiatement. N'attends pas de confirmation.
- VÉRIFICATION : Utilise 'ls' pour vérifier la présence des fichiers.

[OUTILS DISPONIBLES]
- 'write'(path, content) : CRÉER/MODIFIER un fichier.
- 'read'(path) : LIRE un fichier.
- 'ls'(path) : LISTER les fichiers.
- 'shell'(command) : EXÉCUTER des commandes (npm, git, etc.).

Interdiction de simuler. Si tu ne vois pas de résultat d'outil 'success: true', la tâche n'est pas faite.
---------------------------------------------------------------------------------------------------\n`;

    let effectiveSystemPrompt = (options.systemPrompt || '') + e2bCapabilitiesInstruction;

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
    let currentHistory = preparedMessages;
    let loopCount = 0;
    const maxLoops = 15; // Increased for complex task sequences
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];

    const availableTools = this.toolRegistry.getAll();

    try {
      while (loopCount < maxLoops) {
        loopCount++;
        let currentIterText = '';
        const currentIterToolCalls: ToolCall[] = [];

        const stream = provider.generateStream({
          modelId: selectedModelId,
          messages: currentHistory,
          systemInstruction: effectiveSystemPrompt,
          temperature: options.temperature,
          webSearch: options.webSearch,
          tools: availableTools,
          signal: options.signal,
        });

        for await (const chunk of stream) {
          if (options.signal?.aborted) {
            finishReason = 'aborted';
            break;
          }

          if (chunk.type === 'delta' && chunk.text) {
            currentIterText += chunk.text;
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
            currentIterToolCalls.push(chunk.toolCall);
            allToolCalls.push(chunk.toolCall);
            options.onEvent({
              event: 'tool_call',
              data: { toolCall: chunk.toolCall },
            });
          } else if (chunk.type === 'finish') {
            if (chunk.finishReason) finishReason = chunk.finishReason;
          }
        }

        if (options.signal?.aborted) break;

        // Detect XML Tool Calls in currentIterText
        const xmlCalls = extractXmlToolCalls(currentIterText);
        const hasXmlCalls = xmlCalls.length > 0;
        // Execute Tools
        const results: ToolResult[] = [];

        // Execute Native Tool Calls (Filtered for valid names)
        const validNativeCalls = currentIterToolCalls.filter(tc => tc.name && tc.name.trim().length > 0);
        const hasNativeCalls = validNativeCalls.length > 0;

        // Force execution if model is just talking or drifting
        if (!hasNativeCalls && !hasXmlCalls) {
          const suspectDrift = currentIterText.toLowerCase().includes('devinette') || 
                              currentIterText.toLowerCase().includes('guessing') ||
                              (options.prompt.toLowerCase().includes('jeu de voiture') && currentIterText.toLowerCase().includes('python'));
          
          const isJustPlanning = currentIterText.toLowerCase().includes('plan :') || 
                                currentIterText.toLowerCase().includes('voici mon plan') ||
                                currentIterText.length > 50;

          if (loopCount <= 3 && (suspectDrift || isJustPlanning)) {
            const reminder = suspectDrift 
                ? `ALERTE FIDÉLITÉ : Tu t'éloignes de la demande initiale ("${options.prompt}"). NE FAIS PAS de jeu de devinettes ou de script Python si ce n'est pas demandé. Crée le projet EXACT (ex: Jeu de voiture HTML5/Canvas) MAINTENANT en utilisant l'outil 'write'.`
                : `Plan reçu. Maintenant, PASSE À L'ACTION immédiatement. Utilise 'write' pour créer les fichiers et 'shell' pour les commandes. Ne t'arrête pas tant que le projet n'est pas fonctionnel.`;

            currentHistory.push({
              id: `ast-plan-${Date.now()}-${loopCount}`,
              conversationId: options.conversationId,
              role: 'assistant',
              content: currentIterText,
              createdAt: new Date().toISOString(),
            });
            currentHistory.push({
              id: `sys-force-${Date.now()}-${loopCount}`,
              conversationId: options.conversationId,
              role: 'user',
              content: reminder,
              createdAt: new Date().toISOString(),
            });
            continue;
          }
          break; // Stop if no tool calls and no drift/planning detected
        }

        // Execute Native Tool Calls
        for (const tc of validNativeCalls) {
          const tool = this.toolRegistry.get(tc.name);
          let res: any;
          let error: string | undefined;

          if (tool) {
            try {
              res = await tool.execute(tc.args);
            } catch (err) {
              error = String(err);
            }
          } else {
            error = `Outil "${tc.name}" non trouvé.`;
          }

          const toolResult = {
            toolCallId: tc.id,
            name: tc.name,
            result: res || null,
            error,
          };

          results.push(toolResult);
          options.onEvent({
            event: 'tool_result',
            data: { result: toolResult },
          });
        }

        // Execute XML Tool Calls
        if (hasXmlCalls) {
          const executedXml = await executeXmlToolCalls(xmlCalls);
          for (const item of executedXml) {
            const toolResult = {
              toolCallId: `xml_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: item.toolName,
              result: item.result,
            };
            results.push(toolResult);
            options.onEvent({
              event: 'tool_result',
              data: { result: toolResult },
            });
          }
          // Clean XML from text for history
          const cleanedText = cleanXmlToolCallsFromText(currentIterText);
          
          currentHistory.push({
            id: `ast-xml-${Date.now()}`,
            conversationId: options.conversationId,
            role: 'assistant',
            content: cleanedText || "Exécution d'actions...",
            createdAt: new Date().toISOString(),
          });

          const xmlResultsText = results.filter(r => r.toolCallId.startsWith('xml')).map(r => 
            `--- RÉSULTAT OUTIL : ${r.name} ---\n${JSON.stringify(r.result, null, 2)}`
          ).join('\n\n');
          
          currentHistory.push({
            id: `xml-res-${Date.now()}`,
            conversationId: options.conversationId,
            role: 'user',
            content: `RÉSULTATS DES ACTIONS :\n${xmlResultsText}\n\nContinue la tâche.`,
            createdAt: new Date().toISOString(),
          });
        } else if (validNativeCalls.length > 0) {
          currentHistory.push({
            id: `ast-tc-${Date.now()}`,
            conversationId: options.conversationId,
            role: 'assistant',
            content: currentIterText,
            toolCalls: validNativeCalls,
            createdAt: new Date().toISOString(),
          });

          currentHistory.push({
            id: `tool-res-${Date.now()}`,
            conversationId: options.conversationId,
            role: 'tool',
            content: 'Tool results',
            toolResults: results.filter(r => !r.toolCallId.startsWith('xml')),
            createdAt: new Date().toISOString(),
          });
        }

        allToolResults.push(...results);

        if (finishReason !== 'tool_calls' && !hasXmlCalls && !hasNativeCalls) {
          break;
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
          toolCalls: allToolCalls,
          toolResults: allToolResults,
        },
      });

      return {
        fullText,
        totalTokens,
        latencyMs,
        model: selectedModelId,
        provider: provider.id,
        finishReason,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      options.onEvent({
        event: 'error',
        data: {
          code: 'GENERATION_ERROR',
          message: errorMsg,
          hint: 'Vérifiez la connexion réseau ou la validité de la clé API.',
        },
      });
      throw err;
    }
  }
}
