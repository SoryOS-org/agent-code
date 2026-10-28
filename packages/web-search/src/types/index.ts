/**
 * @packages/web-search
 * Type definitions and data schemas for web search and content fetching
 * Inspired by OpenCode's real web search architecture
 */

export interface SearchOptions {
  query: string;
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword';
  category?: 'company' | 'research paper' | 'news' | 'github' | 'tweet' | 'pdf';
  includeDomains?: string[];
  excludeDomains?: string[];
  signal?: AbortSignal;
}

export interface SearchResultItem {
  id?: string;
  url: string;
  title: string;
  snippet: string;
  source: string; // Domain name (e.g. github.com, wikipedia.org)
  score?: number;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
}

export interface WebSearchResponse {
  query: string;
  provider: 'exa' | 'parallel' | 'fallback' | 'mock';
  results: SearchResultItem[];
  totalResults: number;
  latencyMs: number;
  warning?: string;
}

export interface WebFetchOptions {
  url: string;
  maxCharacters?: number;
  format?: 'markdown' | 'text' | 'html';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface WebFetchResponse {
  url: string;
  finalUrl: string;
  title: string;
  content: string;
  contentType: string;
  status: number;
  characterCount: number;
  latencyMs: number;
  truncated: boolean;
}

export interface SearchProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  search(options: SearchOptions): Promise<WebSearchResponse>;
}
