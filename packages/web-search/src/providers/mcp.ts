/**
 * MCP (Model Context Protocol) JSON-RPC 2.0 HTTP Client
 * Replicates OpenCode's native WebSearchMcp mechanism
 * from OpenCode's packages/core/src/plugin/websearch/mcp.ts
 */

export interface McpCallParams {
  url: string;
  tool: string;
  arguments: Record<string, unknown>;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface McpTextContentItem {
  type: 'text';
  text: string;
  _meta?: { searchTime?: number };
}

export interface McpResult {
  content?: McpTextContentItem[];
  structuredContent?: {
    search_id?: string;
    results?: Array<{
      url: string;
      title?: string | null;
      publish_date?: string | null;
      excerpts: string[];
    }>;
  };
}

export interface McpResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: McpResult;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export const OPENCODE_USER_AGENT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OpenCode-User/1.0; +https://opencode.ai';

export const MAX_RESPONSE_BYTES = 256 * 1024;

/**
 * Parses response body which may be either standard JSON-RPC or SSE stream (lines starting with 'data: ')
 * Exactly as implemented in OpenCode packages/core/src/plugin/websearch/mcp.ts
 */
export function parseMcpResponseBody(body: string): McpResult | undefined {
  const trimmed = body.trim();

  // 1. Direct JSON check
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as McpResponse;
      if (parsed.result) {
        return parsed.result;
      }
    } catch {
      // not direct json, proceed to SSE parse
    }
  }

  // 2. Server-Sent Events (SSE) parse
  for (const line of body.split('\n')) {
    const cleanLine = line.trim();
    if (!cleanLine.startsWith('data: ')) continue;
    const jsonStr = cleanLine.substring(6).trim();
    if (!jsonStr.startsWith('{')) continue;

    try {
      const parsed = JSON.parse(jsonStr) as McpResponse;
      if (parsed.result) {
        return parsed.result;
      }
    } catch {
      // ignore individual malformed SSE line
    }
  }

  return undefined;
}

/**
 * Performs MCP tools/call request over HTTP POST
 */
export async function callMcpTool(params: McpCallParams): Promise<McpResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), params.timeoutMs ?? 25000);

  const requestBody = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: params.tool,
      arguments: params.arguments,
    },
  });

  try {
    const res = await fetch(params.url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'User-Agent': OPENCODE_USER_AGENT,
        ...(params.headers || {}),
      },
      body: requestBody,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`MCP request to ${params.tool} failed with HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const text = await res.text();
    const result = parseMcpResponseBody(text);
    if (!result) {
      throw new Error(`Invalid or empty MCP response from ${params.tool}`);
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
