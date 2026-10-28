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
  }
}

/**
 * Main AI Core Conversation Engine
 */
export class ConversationEngine {
  private providerRegistry: ProviderRegistry;
  private contextManager: ContextManager;
  private toolRegistry: ToolRegistry;

  constructor(
    providerRegistry = new ProviderRegistry(),
    contextManager = new ContextManager(),
    toolRegistry = new ToolRegistry()
  ) {
    this.providerRegistry = providerRegistry;
    this.contextManager = contextManager;
    this.toolRegistry = toolRegistry;
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

    const fullHistory = [...options.history, newUserMessage];
    const preparedMessages = this.contextManager.prepareContext(
      fullHistory,
      options.systemPrompt
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
        systemInstruction: options.systemPrompt,
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
