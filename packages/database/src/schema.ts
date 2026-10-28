/**
 * @packages/database/schema
 * Relational schema definition (Drizzle / PostgreSQL compatible)
 */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionRow {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ConversationRow {
  id: string;
  userId: string;
  title: string;
  modelId: string;
  providerId: string;
  systemPrompt?: string;
  temperature?: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tokens?: number;
  latencyMs?: number;
  model?: string;
  finishReason?: string;
  createdAt: string;
}

export interface AttachmentRow {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath?: string;
  base64Data?: string;
  createdAt: string;
}

export interface UserPreferencesRow {
  userId: string;
  theme: 'system' | 'light' | 'dark';
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  streamResponses: boolean;
  updatedAt: string;
}

export interface UsageEventRow {
  id: string;
  userId: string;
  conversationId: string;
  modelId: string;
  providerId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  createdAt: string;
}

export interface ToolCallRow {
  id: string;
  messageId: string;
  toolName: string;
  argumentsJson: string;
  resultJson?: string;
  error?: string;
  createdAt: string;
}

/**
 * SQL DDL Schema string for reference, migrations, and PostgreSQL deployment
 */
export const POSTGRES_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(16) DEFAULT 'system' NOT NULL,
  default_model VARCHAR(64) DEFAULT 'gemini-3.8-flash' NOT NULL,
  system_prompt TEXT DEFAULT '' NOT NULL,
  temperature NUMERIC(3,2) DEFAULT 0.7 NOT NULL,
  max_tokens INT DEFAULT 4096 NOT NULL,
  stream_responses BOOLEAN DEFAULT TRUE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  model_id VARCHAR(64) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  system_prompt TEXT,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  pinned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  tokens INT,
  latency_ms INT,
  model VARCHAR(64),
  finish_reason VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size INT NOT NULL,
  storage_path TEXT,
  base64_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE SET NULL,
  model_id VARCHAR(64) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  duration_ms INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
`;
