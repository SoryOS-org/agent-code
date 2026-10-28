/**
 * Search Providers Registry & Factory
 */

import type { SearchProvider } from '../types/index.ts';
import { OpenCodeSearchProvider } from './opencode.ts';
import { ExaSearchProvider } from './exa.ts';
import { ParallelSearchProvider } from './parallel.ts';
import { FallbackSearchProvider } from './fallback.ts';

export * from './provider.ts';
export * from './mcp.ts';
export * from './exa.ts';
export * from './parallel.ts';
export * from './fallback.ts';
export * from './opencode.ts';

/**
 * Returns the native OpenCode search provider (Exa MCP + Parallel MCP + Resilient Web Fallback).
 * Does NOT require any user API key.
 */
export function getDefaultSearchProvider(): SearchProvider {
  return new OpenCodeSearchProvider();
}
