/**
 * E2B Code Execution Routes
 * POST /code/execute - Executes Python/JavaScript in E2B Cloud Sandbox with SSE streaming output
 */

import { Router } from 'express';
import { executeSecureCode } from '@packages/e2b/src/code-executor.ts';

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

/**
 * GET /code/sandbox
 * Status of the persistent E2B sandbox (the agent's remote work environment)
 */
codeRouter.get('/code/sandbox', async (_req, res) => {
  try {
    const { getSandboxStatus } = await import('@packages/e2b/src/sandbox-manager.ts');
    res.json(getSandboxStatus());
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * DELETE /code/sandbox
 * Stop the persistent E2B sandbox (release the remote environment)
 */
codeRouter.delete('/code/sandbox', async (_req, res) => {
  try {
    const { stopSandbox } = await import('@packages/e2b/src/sandbox-manager.ts');
    res.json(await stopSandbox());
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * POST /code/command
 * Run terminal / shell commands in E2B sandbox or secure local fallback
 */
codeRouter.post('/code/command', async (req, res) => {
  const { command } = req.body || {};
  if (!command || typeof command !== 'string') {
    res.status(400).json({ error: 'Commande requise.' });
    return;
  }

  try {
    const { runE2BCommand } = await import('@packages/e2b/src/e2b-agent-tools.ts');
    const result = await runE2BCommand(command);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      stdout: '',
      stderr: `Erreur d'exécution : ${message}`,
      exitCode: 1,
      executionTimeMs: 0,
    });
  }
});
