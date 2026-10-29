/**
 * XML Tool Call Parser for OpenRouter / Open-weights LLMs
 * Parses <tool_call>tool_name<arg_key>...</arg_key><arg_value>...</arg_value></tool_call>
 * and executes the tool automatically.
 */

import { writeE2BFile, runE2BCommand } from './e2b-agent-tools.js';
import { executeSecureCode } from './code-executor.js';

export interface ParsedXmlToolCall {
  toolName: string;
  args: Record<string, string>;
  rawXml: string;
}

export function extractXmlToolCalls(text: string): ParsedXmlToolCall[] {
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  const calls: ParsedXmlToolCall[] = [];
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(text)) !== null) {
    const rawXml = match[0];
    const body = match[1];

    // First word is tool name
    const toolNameMatch = body.match(/^([a-zA-Z0-9_-]+)/);
    if (!toolNameMatch) continue;

    const toolName = toolNameMatch[1];
    const args: Record<string, string> = {};

    // Parse key-value pairs
    const kvRegex = /<arg_key>([\s\S]*?)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/g;
    let kvMatch: RegExpExecArray | null;

    while ((kvMatch = kvRegex.exec(body)) !== null) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      args[key] = value;
    }

    calls.push({ toolName, args, rawXml });
  }

  return calls;
}

export async function executeXmlToolCalls(calls: ParsedXmlToolCall[]): Promise<Array<{ toolName: string; result: any }>> {
  const results = [];

  for (const call of calls) {
    const { toolName, args } = call;
    try {
      if (toolName === 'e2b_write_file' || toolName === 'write') {
        const path = args.path || args.filename || 'file.txt';
        const content = args.content || args.code || '';
        const res = await writeE2BFile(path, content);
        results.push({ toolName, result: res });
      } else if (toolName === 'e2b_run_command' || toolName === 'shell') {
        const command = args.command || args.cmd || 'ls -la';
        const res = await runE2BCommand(command);
        results.push({ toolName, result: res });
      } else if (toolName === 'e2b_code_interpreter') {
        const language = (args.language as any) || 'javascript';
        const code = args.code || args.content || '';
        const res = await executeSecureCode({ language, code });
        results.push({ toolName, result: res });
      } else if (toolName === 'read') {
        const path = args.path || '';
        const res = await runE2BCommand(`cat ${JSON.stringify(path)}`);
        results.push({ toolName, result: { path, content: res.stdout } });
      } else if (toolName === 'grep') {
        const query = args.query || '';
        const path = args.path || '.';
        const res = await runE2BCommand(`grep -rn ${JSON.stringify(query)} ${JSON.stringify(path)}`);
        results.push({ toolName, result: { query, matches: res.stdout } });
      }
    } catch (err: unknown) {
      console.warn(`[XmlToolCallParser] Execution error for ${toolName}:`, err);
    }
  }

  return results;
}

export function cleanXmlToolCallsFromText(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
}
