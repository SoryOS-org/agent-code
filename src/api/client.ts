/**
 * Centralized API Client for Aether AI
 * Handles API calls, SSE streaming connections, and file uploads
 */

import type {
  Conversation,
  Message,
  ModelDefinition,
  SSEMessage,
  UserPreferences,
} from '@packages/types/src/index.ts';
import type { StreamMessageInput } from '@packages/contracts/src/index.ts';

const API_BASE = '/v1';

export class ApiError extends Error {
  code?: string;
  hint?: string;

  constructor(message: string, code?: string, hint?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.hint = hint;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // not json
    }
    const message = errorData?.error?.message || errorData?.error || response.statusText;
    const code = errorData?.error?.code;
    const hint = errorData?.error?.hint;
    throw new ApiError(message, code, hint);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Health
  getHealth: () => request<{
    status: string;
    timestamp: string;
    uptimeSeconds: number;
    activeProvider: string;
    providersStatus: Record<string, { configured: boolean; modelsCount: number }>;
  }>('/health'),

  // Models
  getModels: () => request<{ models: ModelDefinition[]; defaultModelId: string }>('/models'),

  // User & Preferences
  getUserProfile: () => request<{
    user: { id: string; email: string; name: string };
    preferences: UserPreferences;
  }>('/me'),

  updatePreferences: (prefs: Partial<UserPreferences>) =>
    request<{ success: boolean; preferences: UserPreferences }>('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),

  // Conversations
  listConversations: () => request<{ conversations: Conversation[]; total: number }>('/conversations'),

  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),

  createConversation: (data?: { title?: string; modelId?: string; systemPrompt?: string; temperature?: number }) =>
    request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  updateConversation: (
    id: string,
    updates: { title?: string; pinned?: boolean; modelId?: string; systemPrompt?: string; temperature?: number }
  ) =>
    request<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteConversation: (id: string) =>
    request<{ success: boolean }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),

  // Messages
  listMessages: (conversationId: string) =>
    request<{ messages: Message[]; total: number }>(`/conversations/${conversationId}/messages`),

  // File Upload
  uploadFile: async (file: { name: string; mimeType: string; size: number; base64Data: string; conversationId?: string }) =>
    request<{ attachment: any }>('/files', {
      method: 'POST',
      body: JSON.stringify(file),
    }),

  /**
   * Stream message via Server-Sent Events (SSE)
   */
  streamMessage: (
    conversationId: string,
    payload: StreamMessageInput,
    callbacks: {
      onEvent: (event: SSEMessage) => void;
      onError: (err: ApiError) => void;
      onComplete: () => void;
    },
    signal?: AbortSignal
  ): () => void => {
    let isAborted = false;

    const controller = new AbortController();
    const activeSignal = signal || controller.signal;

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: activeSignal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new ApiError(errJson?.error?.message || errJson?.error || 'Échec de la connexion de streaming');
        }

        if (!response.body) {
          throw new ApiError('Flux SSE indisponible');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const rawMessage of messages) {
            const lines = rawMessage.split('\n');
            let eventType = 'text_delta';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6).trim();
              }
            }

            if (dataStr) {
              try {
                const parsedData = JSON.parse(dataStr);
                callbacks.onEvent({
                  event: eventType as any,
                  data: parsedData,
                });
              } catch {
                // partial json parse
              }
            }
          }
        }

        callbacks.onComplete();
      } catch (err: unknown) {
        if (activeSignal.aborted) {
          callbacks.onComplete();
          return;
        }
        const message = err instanceof Error ? err.message : 'Erreur réseau de streaming';
        callbacks.onError(new ApiError(message));
      }
    })();

    return () => {
      isAborted = true;
      controller.abort();
    };
  },

  /**
   * Execute code via E2B Cloud Sandbox with SSE streaming output
   */
  executeCode: (
    payload: { language: 'python' | 'javascript' | 'typescript' | 'bash' | 'sh' | 'rust' | 'rs' | 'shell'; code: string },
    callbacks: {
      onEvent: (event: { event: 'code_start' | 'code_output' | 'code_complete' | 'error'; data: any }) => void;
      onError: (err: ApiError) => void;
      onComplete: () => void;
    },
    signal?: AbortSignal
  ): () => void => {
    let isAborted = false;
    const controller = new AbortController();
    const activeSignal = signal || controller.signal;

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/code/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: activeSignal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new ApiError(errJson?.error?.message || errJson?.error || 'Échec de la connexion à E2B');
        }

        if (!response.body) {
          throw new ApiError('Flux SSE E2B indisponible');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const rawMessage of messages) {
            const lines = rawMessage.split('\n');
            let eventType = 'code_output';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6).trim();
              }
            }

            if (dataStr) {
              try {
                const parsedData = JSON.parse(dataStr);
                callbacks.onEvent({
                  event: eventType as any,
                  data: parsedData,
                });
              } catch {
                // ignore partial json
              }
            }
          }
        }

        callbacks.onComplete();
      } catch (err: unknown) {
        if (activeSignal.aborted) {
          callbacks.onComplete();
          return;
        }
        const message = err instanceof Error ? err.message : 'Erreur réseau E2B';
        callbacks.onError(new ApiError(message));
      }
    })();

    return () => {
      isAborted = true;
      controller.abort();
    };
  },

  /**
   * Search Web without API keys via remote @packages/web-service
   */
  searchWeb: async (query: string, limit = 5): Promise<{ providerID: string; results: any[]; query: string; latencyMs: number }> => {
    return request('/websearch', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  },

  /**
   * Get search providers status
   */
  getWebSearchProviders: async (): Promise<{ providers: any[]; default: string }> => {
    return request('/websearch/providers');
  },

  /**
   * Get Workspace File Tree (VS Code Explorer)
   */
  getWorkspaceTree: async (): Promise<{ root: any[] }> => {
    return request('/workspace/tree');
  },

  /**
   * Get File Content (VS Code Open File)
   */
  getWorkspaceFile: async (path: string): Promise<{ path: string; content: string }> => {
    return request(`/workspace/file?path=${encodeURIComponent(path)}`);
  },

  /**
   * Run Terminal Command in E2B Sandbox
   */
  runTerminalCommand: async (command: string): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }> => {
    return request('/code/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },
};
