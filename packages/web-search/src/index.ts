/**
 * @packages/web-search
 * Entry point for Web Search and Web Fetch tools
 * Architectural pattern inspired by OpenCode
 */

import { createWebSearchTool } from './tools/websearch.ts';
import { createWebFetchTool } from './tools/webfetch.ts';
import { getDefaultSearchProvider } from './providers/index.ts';

export * from './types/index.ts';
export * from './providers/index.ts';
export * from './tools/websearch.ts';
export * from './tools/webfetch.ts';
export * from './utils/http.ts';
export * from './utils/clean-html.ts';

/**
 * Creates both websearch and webfetch tools ready for ToolRegistry
 */
export function createWebSearchTools(customProvider = getDefaultSearchProvider()) {
  return [
    createWebSearchTool(customProvider),
    createWebFetchTool(),
  ];
}
