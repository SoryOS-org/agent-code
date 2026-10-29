/**
 * @packages/web-service
 * Types & Contracts for Remote Web Search Service
 * Modeled after OpenCode's packages/protocol/src/groups/websearch.ts & core/src/websearch.ts
 */

export interface RemoteWebSearchResult {
  title: string;
  url: string;
  content: string;
  published?: string;
  score?: number;
}

export interface RemoteWebSearchResponse {
  providerID: string;
  results: RemoteWebSearchResult[];
  query: string;
  latencyMs: number;
}

export interface RemoteWebSearchQuery {
  query: string;
  providerID?: string;
  limit?: number;
}

export interface WebSearchProviderInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  requiresKey: boolean;
}
