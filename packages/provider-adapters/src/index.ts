/**
 * @packages/provider-adapters
 * Multi-provider adapter architecture with capability negotiation and streaming
 */

import { GoogleGenAI } from '@google/genai';
import type { Message, ModelDefinition, ToolCall } from '@packages/types/src/index.ts';

export interface ProviderStreamChunk {
  type: 'delta' | 'reasoning' | 'tool_call' | 'finish';
  text?: string;
  toolCall?: ToolCall;
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface ProviderStreamOptions {
  modelId: string;
  messages: Message[];
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  tools?: any[]; // Simplified for adapters
  toolChoice?: string | { type: 'function'; function: { name: string } };
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  getMissingConfigHelp(): string;
  getModels(): ModelDefinition[];
  generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk>;
}

/**
 * Google Gemini Provider Adapter
 * Uses official @google/genai SDK with server-side API Key
 */
export class GeminiAdapter implements ProviderAdapter {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  getMissingConfigHelp(): string {
    return 'Pour activer Google Gemini, configurez la variable d\'environnement GEMINI_API_KEY dans le panneau Paramètres > Secrets ou dans le fichier .env.';
  }

  getModels(): ModelDefinition[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        providerId: 'gemini',
        providerName: 'Google',
        description: 'Modèle rapide, multimodal et hautement performant pour les tâches quotidiennes et le code.',
        contextWindow: 1048576,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          audio: true,
          reasoning: true,
        },
        isDefault: true,
        isConfigured: configured,
      },
      {
        id: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        providerId: 'gemini',
        providerName: 'Google',
        description: 'Raisonnement avancé, analyse complexe et génération de code experte.',
        contextWindow: 2097152,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          audio: false,
          reasoning: true,
        },
        requiresPaidKey: true,
        isConfigured: configured,
      },
    ];
  }

  async *generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk> {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(this.getMissingConfigHelp());
      }
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

    for (const msg of options.messages) {
      if (msg.role === 'system') continue; // handled via systemInstruction

      if (msg.role === 'tool' && msg.toolResults) {
        contents.push({
          role: 'user', // Gemini expects tool results to be within a 'user' turn (actually tool role but SDK mapping is tricky)
          parts: msg.toolResults.map((res) => ({
            functionResponse: {
              name: res.name,
              response: {
                content: typeof res.result === 'string' ? res.result : JSON.stringify(res.result),
              },
            },
          })),
        });
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: Array<Record<string, unknown>> = [];

      // Handle tool calls in assistant messages
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.args,
            },
          });
        }
      }

      // Add attachments (images, PDFs, text) if present
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.base64Data) {
            // Clean base64 prefix if present
            const cleanBase64 = att.base64Data.includes(',') ? att.base64Data.split(',')[1] : att.base64Data;

            parts.push({
              inlineData: {
                mimeType: att.mimeType || 'image/png',
                data: cleanBase64,
              },
            });
          }
        }
      }

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Bonjour' }] });
    }

    const config: Record<string, unknown> = {};
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (typeof options.temperature === 'number') {
      config.temperature = options.temperature;
    }

    const tools: any[] = [];
    if (options.webSearch) {
      tools.push({ googleSearch: {} });
    }
    if (options.tools && options.tools.length > 0) {
      tools.push({
        functionDeclarations: options.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      });
    }

    if (tools.length > 0) {
      config.tools = tools;
      if (options.toolChoice) {
        config.toolConfig = {
          functionCallingConfig: {
            mode: typeof options.toolChoice === 'string' ? options.toolChoice.toUpperCase() : 'ANY',
          },
        };
      }
    }

    try {
      const responseStream = await this.client.models.generateContentStream({
        model: options.modelId || 'gemini-3.8-flash',
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        if (options.signal?.aborted) {
          yield { type: 'finish', finishReason: 'aborted' };
          return;
        }

        const text = chunk.text;
        if (text) {
          yield { type: 'delta', text };
        }

        const calls = chunk.functionCalls;
        if (calls && Array.isArray(calls)) {
          for (const call of calls) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: Math.random().toString(36).substring(7), // SDK doesn't always provide tool call IDs
                name: call.name || 'unknown',
                args: (call.args as Record<string, unknown>) || {},
              },
            };
          }
        }
      }

      yield { type: 'finish', finishReason: 'stop' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Erreur Gemini: ${msg}`);
    }
  }
}

/**
 * OpenAI Compatible Provider Adapter (GPT-4o, GPT-3.5, etc.)
 */
export class OpenAIAdapter implements ProviderAdapter {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  getMissingConfigHelp(): string {
    return 'Pour activer OpenAI, définissez OPENAI_API_KEY dans vos variables d\'environnement serveur.';
  }

  getModels(): ModelDefinition[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        providerId: 'openai',
        providerName: 'OpenAI',
        description: 'Modèle phare multimodal d\'OpenAI.',
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          audio: false,
          reasoning: true,
        },
        isConfigured: configured,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        providerId: 'openai',
        providerName: 'OpenAI',
        description: 'Version compacte et rapide de GPT-4o.',
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          audio: false,
          reasoning: false,
        },
        isConfigured: configured,
      },
    ];
  }

  async *generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(this.getMissingConfigHelp());
    }

    const messages: any[] = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    for (const msg of options.messages) {
      if (msg.role === 'tool' && msg.toolResults) {
        for (const res of msg.toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: res.toolCallId,
            content: typeof res.result === 'string' ? res.result : JSON.stringify(res.result),
          });
        }
        continue;
      }

      const formatted: any = { role: msg.role, content: msg.content || '' };
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const validCalls = msg.toolCalls.filter((tc) => tc && tc.name && tc.name.trim().length > 0);
        if (validCalls.length > 0) {
          formatted.tool_calls = validCalls.map((tc) => ({
            id: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
            type: 'function',
            function: {
              name: tc.name.trim(),
              arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args || {}),
            },
          }));
        }
      }
      messages.push(formatted);
    }

    const body: any = {
      model: options.modelId,
      messages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Réponse vide du serveur OpenAI');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallsByIndex = new Map<number, { id: string; name: string; args: string }>();

    function* flushToolCalls() {
      for (const tc of toolCallsByIndex.values()) {
        const name = tc.name.trim();
        if (!name) continue;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.args.trim().length > 0 ? JSON.parse(tc.args) : {};
        } catch {
          console.warn(`[OpenAIAdapter] JSON parse warning for ${name}:`, tc.args);
        }
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: tc.id || `call_${Date.now()}`,
            name,
            args: parsedArgs,
          },
        };
      }
      toolCallsByIndex.clear();
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          for (const chunk of flushToolCalls()) {
            yield chunk;
          }
          yield { type: 'finish', finishReason: 'stop' };
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const choice = json.choices?.[0];
          const delta = choice?.delta?.content;
          const toolCalls = choice?.delta?.tool_calls;
          const finishReason = choice?.finish_reason;

          if (delta) {
            yield { type: 'delta', text: delta };
          }

          if (toolCalls && Array.isArray(toolCalls)) {
            for (const tc of toolCalls) {
              const index = typeof tc.index === 'number' ? tc.index : 0;
              if (!toolCallsByIndex.has(index)) {
                toolCallsByIndex.set(index, {
                  id: tc.id || `call_${Date.now()}_${index}`,
                  name: tc.function?.name || '',
                  args: tc.function?.arguments || '',
                });
              } else {
                const existing = toolCallsByIndex.get(index)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name += tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
              }
            }
          }

          if (finishReason === 'tool_calls') {
            for (const chunk of flushToolCalls()) {
              yield chunk;
            }
            yield { type: 'finish', finishReason };
          } else if (finishReason) {
            for (const chunk of flushToolCalls()) {
              yield chunk;
            }
            yield { type: 'finish', finishReason };
          }
        } catch {
          // ignore parse error
        }
      }
    }
  }
}

/**
 * Mistral AI Provider Adapter
 */
export class MistralAdapter implements ProviderAdapter {
  readonly id = 'mistral';
  readonly name = 'Mistral AI';

  isConfigured(): boolean {
    return Boolean(process.env.MISTRAL_API_KEY);
  }

  getMissingConfigHelp(): string {
    return 'Pour activer Mistral AI, définissez MISTRAL_API_KEY dans vos variables d\'environnement serveur.';
  }

  getModels(): ModelDefinition[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        providerId: 'mistral',
        providerName: 'Mistral AI',
        description: 'Modèle européen de pointe avec capacités de raisonnement.',
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: true,
        },
        isConfigured: configured,
      },
    ];
  }

  async *generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(this.getMissingConfigHelp());
    }

    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.modelId,
        messages,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${err}`);
    }

    if (!response.body) throw new Error('Réponse vide du serveur Mistral');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          yield { type: 'finish', finishReason: 'stop' };
          return;
        }
        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: 'delta', text: delta };
        } catch {
          // ignore
        }
      }
    }
  }
}

/**
 * Mock Test Provider (Strictly for automated test suites and offline local validation)
 */
export class MockTestAdapter implements ProviderAdapter {
  readonly id = 'mock';
  readonly name = 'Test Mock Adapter';

  isConfigured(): boolean {
    return true; // Always available for unit/integration tests
  }

  getMissingConfigHelp(): string {
    return '';
  }

  getModels(): ModelDefinition[] {
    return [
      {
        id: 'mock-model-v1',
        name: 'Mock Test Model (Offline)',
        providerId: 'mock',
        providerName: 'Test Suite',
        description: 'Modèle simulé pour les tests automatisés et la validation hors-ligne.',
        contextWindow: 32000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          audio: false,
          reasoning: false,
        },
        isConfigured: true,
      },
    ];
  }

  async *generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk> {
    const lastMsg = options.messages[options.messages.length - 1];
    const prompt = lastMsg?.content || 'Bonjour';

    const testChunks = [
      `[Test Mock Response] `,
      `Message reçu : "${prompt}". `,
      `Ce fournisseur de test confirme que l'orchestration, `,
      `le pipeline de streaming SSE `,
      `et la gestion d'erreurs fonctionnent parfaitement.`,
    ];

    for (const chunk of testChunks) {
      if (options.signal?.aborted) {
        yield { type: 'finish', finishReason: 'aborted' };
        return;
      }
      yield { type: 'delta', text: chunk };
      // Small delay in tests if needed
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    yield { type: 'finish', finishReason: 'stop' };
  }
}

/**
 * OpenRouter Free Models Adapter
 * Dedicated exclusively to OpenRouter's free-tier models (":free")
 */
export class OpenRouterFreeAdapter implements ProviderAdapter {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter (Modèles Gratuits)';

  isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  getMissingConfigHelp(): string {
    return 'Pour activer les modèles gratuits OpenRouter, ajoutez OPENROUTER_API_KEY dans votre fichier .env ou les secrets du serveur (clé gratuite sans carte bancaire sur https://openrouter.ai/keys).';
  }

  getModels(): ModelDefinition[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'openrouter/free',
        name: 'OpenRouter Free (Auto-Routeur)',
        providerId: 'openrouter',
        providerName: 'OpenRouter Free',
        description: 'Routeur intelligent officiel : sélectionne automatiquement le meilleur modèle gratuit disponible.',
        contextWindow: 131072,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: true,
        },
        isFree: true,
        isConfigured: configured,
      },
      {
        id: 'google/gemini-2.0-flash-lite-preview-02-12:free',
        name: 'Gemini 2.0 Flash Lite (Gratuit)',
        providerId: 'openrouter',
        providerName: 'OpenRouter Free',
        description: 'Modèle rapide et multimodal de Google pour la conversation et la programmation.',
        contextWindow: 1048576,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: true,
        },
        isFree: true,
        isConfigured: configured,
      },
      {
        id: 'deepseek/deepseek-r1:free',
        name: 'DeepSeek R1 (Gratuit)',
        providerId: 'openrouter',
        providerName: 'OpenRouter Free',
        description: 'Modèle de raisonnement avancé avec chaîne de pensée (Reasoning).',
        contextWindow: 65536,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: true,
        },
        isFree: true,
        isConfigured: configured,
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Llama 3.3 70B Instruct (Gratuit)',
        providerId: 'openrouter',
        providerName: 'OpenRouter Free',
        description: 'Grand modèle open-weights de Meta pour les tâches complexes et la rédaction.',
        contextWindow: 131072,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: false,
        },
        isFree: true,
        isConfigured: configured,
      },
      {
        id: 'qwen/qwen-2.5-7b-instruct:free',
        name: 'Qwen 2.5 7B Instruct (Gratuit)',
        providerId: 'openrouter',
        providerName: 'OpenRouter Free',
        description: 'Modèle rapide et multilingue optimisé pour le code et le texte.',
        contextWindow: 32768,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          audio: false,
          reasoning: false,
        },
        isFree: true,
        isConfigured: configured,
      },
    ];
  }

  async *generateStream(options: ProviderStreamOptions): AsyncIterable<ProviderStreamChunk> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(this.getMissingConfigHelp());
    }

    const messages: any[] = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    for (const msg of options.messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool' && msg.toolResults) {
        for (const res of msg.toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: res.toolCallId,
            content: typeof res.result === 'string' ? res.result : JSON.stringify(res.result),
          });
        }
        continue;
      }

      const formatted: any = { role: msg.role, content: msg.content || '' };
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const validCalls = msg.toolCalls.filter((tc) => tc && tc.name && tc.name.trim().length > 0);
        if (validCalls.length > 0) {
          formatted.tool_calls = validCalls.map((tc) => ({
            id: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
            type: 'function',
            function: {
              name: tc.name.trim(),
              arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args || {}),
            },
          }));
        }
      }
      messages.push(formatted);
    }

    const body: any = {
      model: options.modelId || 'openrouter/free',
      messages,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://aether-ai.local',
        'X-Title': 'Aether AI Assistant',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    // If rate-limited (429) or not found (404), wait briefly and retry with openrouter/free
    if ((response.status === 429 || response.status === 404 || response.status === 503) && !options.signal?.aborted) {
      console.warn(`[OpenRouter] Received status ${response.status} for ${options.modelId}. Retrying with auto-router...`);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://aether-ai.local',
          'X-Title': 'Aether AI Assistant',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
        signal: options.signal,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        parsedMsg = parsed.error?.message || parsed.message || errorText;
      } catch {
        // raw text
      }

      if (response.status === 429) {
        throw new Error(
          `Quota temporaire OpenRouter atteint (Erreur 429 : trop de requêtes sur les modèles gratuits). Veuillez patienter quelques secondes ou basculer sur Gemini 3.8 Flash. Détail: ${parsedMsg}`
        );
      }

      throw new Error(`OpenRouter API error (${response.status}): ${parsedMsg}`);
    }

    if (!response.body) {
      throw new Error('Réponse vide du serveur OpenRouter');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallsByIndex = new Map<number, { id: string; name: string; args: string }>();

    function* flushToolCalls() {
      for (const tc of toolCallsByIndex.values()) {
        const name = tc.name.trim();
        if (!name) continue;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.args.trim().length > 0 ? JSON.parse(tc.args) : {};
        } catch {
          console.warn(`[OpenRouterAdapter] JSON parse warning for ${name}:`, tc.args);
        }
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: tc.id || `call_${Date.now()}`,
            name,
            args: parsedArgs,
          },
        };
      }
      toolCallsByIndex.clear();
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          for (const chunk of flushToolCalls()) {
            yield chunk;
          }
          yield { type: 'finish', finishReason: 'stop' };
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const choice = json.choices?.[0];
          const delta = choice?.delta?.content;
          const reasoning = choice?.delta?.reasoning;
          const toolCalls = choice?.delta?.tool_calls;
          const finishReason = choice?.finish_reason;

          if (reasoning) {
            yield { type: 'reasoning', text: reasoning };
          }
          if (delta) {
            yield { type: 'delta', text: delta };
          }

          if (toolCalls && Array.isArray(toolCalls)) {
            for (const tc of toolCalls) {
              const index = typeof tc.index === 'number' ? tc.index : 0;
              if (!toolCallsByIndex.has(index)) {
                toolCallsByIndex.set(index, {
                  id: tc.id || `call_${Date.now()}_${index}`,
                  name: tc.function?.name || '',
                  args: tc.function?.arguments || '',
                });
              } else {
                const existing = toolCallsByIndex.get(index)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name += tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
              }
            }
          }

          if (finishReason === 'tool_calls') {
            for (const chunk of flushToolCalls()) {
              yield chunk;
            }
            yield { type: 'finish', finishReason };
          } else if (finishReason) {
            for (const chunk of flushToolCalls()) {
              yield chunk;
            }
            yield { type: 'finish', finishReason };
          }
        } catch {
          // ignore partial json line
        }
      }
    }
  }
}

/**
 * Provider Registry
 */
export class ProviderRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  constructor() {
    this.register(new GeminiAdapter());
    this.register(new OpenRouterFreeAdapter());
    this.register(new OpenAIAdapter());
    this.register(new MistralAdapter());
    this.register(new MockTestAdapter());
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(providerId: string): ProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAllModels(): ModelDefinition[] {
    return this.getAll().flatMap((adapter) => adapter.getModels());
  }

  findProviderForModel(modelId: string): ProviderAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.getModels().some((m) => m.id === modelId)) {
        return adapter;
      }
    }
    // Default fallback to Gemini
    return this.adapters.get('gemini');
  }
}
