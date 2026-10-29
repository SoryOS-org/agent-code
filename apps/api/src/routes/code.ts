/**
 * E2B Code Execution Routes
 * POST /code/execute - Executes Python/JavaScript in E2B Cloud Sandbox with SSE streaming output
 */

import { Router } from 'express';
import { executeSecureCode } from '@packages/opencode-e2b/src/code-executor.ts';

export const codeRouter = Router();

/**
 * Execute code in E2B Cloud Sandbox with SSE streaming output
 */
codeRouter.post('/code/execute', async (req, res) => {
  const { language, code } = req.body || {};

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Code source requis.' });
    return;
  }

  const lang = (language as 'python' | 'javascript' | 'typescript') || 'javascript';

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendSSE = (event: string, data: any) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('code_start', { language: lang, timestamp: new Date().toISOString() });

  try {
    const result = await executeSecureCode({ language: lang, code });

    sendSSE('code_output', {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      environment: result.environment,
      executionTimeMs: result.executionTimeMs,
    });

    sendSSE('code_complete', {
      success: result.exitCode === 0,
      executionTimeMs: result.executionTimeMs,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    sendSSE('error', { message });
    res.end();
  }
});
