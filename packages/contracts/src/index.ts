/**
 * @packages/contracts
 * Request/response validation contracts and payload schemas
 */

import type { Attachment, Conversation, Message, ModelDefinition, UserPreferences } from '@packages/types/src/index.ts';

export interface CreateConversationInput {
  title?: string;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
}

export interface UpdateConversationInput {
  title?: string;
  pinned?: boolean;
  systemPrompt?: string;
  temperature?: number;
}

export interface StreamMessageInput {
  content: string;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  attachments?: Array<{
    name: string;
    mimeType: string;
    size: number;
    base64Data?: string;
  }>;
  webSearch?: boolean;
}

export interface FileUploadResponse {
  attachment: Attachment;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  activeProvider: string;
  providersStatus: Record<string, { configured: boolean; modelsCount: number }>;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
}

export interface ModelsResponse {
  models: ModelDefinition[];
  defaultModelId: string;
}

export interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  preferences: UserPreferences;
}

export function validateStreamMessageInput(input: unknown): { valid: boolean; error?: string; data?: StreamMessageInput } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { content, modelId, systemPrompt, temperature, attachments, webSearch } = input as Record<string, unknown>;

  if (typeof content !== 'string') {
    return { valid: false, error: 'Field "content" must be a string' };
  }

  if (content.trim().length === 0 && (!Array.isArray(attachments) || attachments.length === 0)) {
    return { valid: false, error: 'Message content cannot be empty unless an attachment is provided' };
  }

  if (content.length > 50000) {
    return { valid: false, error: 'Message content exceeds maximum allowed size (50,000 characters)' };
  }

  if (modelId !== undefined && typeof modelId !== 'string') {
    return { valid: false, error: 'Field "modelId" must be a string' };
  }

  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    return { valid: false, error: 'Field "temperature" must be a number between 0 and 2' };
  }

  const parsedAttachments = Array.isArray(attachments)
    ? attachments.map((att: unknown) => {
        const a = att as Record<string, unknown>;
        return {
          name: typeof a.name === 'string' ? a.name : 'attachment',
          mimeType: typeof a.mimeType === 'string' ? a.mimeType : 'application/octet-stream',
          size: typeof a.size === 'number' ? a.size : 0,
          base64Data: typeof a.base64Data === 'string' ? a.base64Data : undefined,
        };
      })
    : undefined;

  return {
    valid: true,
    data: {
      content: content.trim(),
      modelId: typeof modelId === 'string' ? modelId : undefined,
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : undefined,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      attachments: parsedAttachments,
      webSearch: Boolean(webSearch),
    },
  };
}
