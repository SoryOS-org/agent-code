/**
 * @packages/types
 * Core TypeScript definitions for Aether AI Monorepo
 */

export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data?: string; // Inline data (base64 string without data: URL prefix or with)
  url?: string;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface MessageMetadata {
  tokens?: number;
  latencyMs?: number;
  model?: string;
  provider?: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | 'aborted';
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  modelId: string;
  providerId: string;
  systemPrompt?: string;
  temperature?: number;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ModelCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  reasoning: boolean;
}

export interface ModelDefinition {
  id: string;
  name: string;
  providerId: 'gemini' | 'openai' | 'mistral' | 'openrouter' | 'mock';
  providerName: string;
  description: string;
  contextWindow: number;
  capabilities: ModelCapabilities;
  isDefault?: boolean;
  isConfigured: boolean;
  requiresPaidKey?: boolean;
  isFree?: boolean;
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  streamResponses: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type StreamEventType =
  | 'message_start'
  | 'text_delta'
  | 'reasoning_delta'
  | 'tool_call'
  | 'message_complete'
  | 'error';

export interface StreamEventPayload {
  message_start: {
    messageId: string;
    conversationId: string;
    role: 'assistant';
    model: string;
  };
  text_delta: {
    delta: string;
  };
  reasoning_delta: {
    delta: string;
  };
  tool_call: {
    toolCall: ToolCall;
  };
  message_complete: {
    messageId: string;
    totalTokens?: number;
    latencyMs?: number;
    finishReason: string;
    fullText: string;
  };
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface SSEMessage<T extends StreamEventType = StreamEventType> {
  event: T;
  data: StreamEventPayload[T];
}
