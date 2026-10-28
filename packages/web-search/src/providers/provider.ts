/**
 * Base search provider contracts and error classes
 */

import type { SearchOptions, WebSearchResponse, SearchProvider } from '../types/index.ts';

export class SearchProviderError extends Error {
  constructor(public readonly provider: string, message: string, public readonly code?: string) {
    super(`[${provider}] ${message}`);
    this.name = 'SearchProviderError';
  }
}

export type { SearchOptions, WebSearchResponse, SearchProvider };
