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
 * GET /code/terminal/stream
 * Real PTY output stream (SSE) from the persistent E2B sandbox terminal.
 * New clients receive the last chunks (backlog) then live data.
 */
codeRouter.get('/code/terminal/stream', async (req, res) => {
  try {
    const { ensurePtySession, subscribePty, getPtyBacklog } = await import('@packages/e2b/src/pty-manager.ts');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(`event: pty_status\ndata: ${JSON.stringify(await ensurePtySession())}\n\n`);
    for (const chunk of getPtyBacklog()) {
      res.write(`event: pty\ndata: ${JSON.stringify(chunk)}\n\n`);
    }

    const unsubscribe = subscribePty((chunk) => {
      res.write(`event: pty\ndata: ${JSON.stringify(chunk)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(': hb\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`event: pty_error\ndata: ${JSON.stringify(message)}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /code/terminal/input
 * Write raw input into the interactive PTY (real commands in the sandbox shell)
 */
codeRouter.post('/code/terminal/input', async (req, res) => {
  const { data } = (req.body || {}) as { data?: string };
  if (typeof data !== 'string' || data.length === 0) {
    res.status(400).json({ error: "Les données d'entrée sont requises." });
    return;
  }
  try {
    const { writePtyInput } = await import('@packages/e2b/src/pty-manager.ts');
    res.json(await writePtyInput(data));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * POST /code/terminal/resize
 * Resize the interactive PTY window
 */
codeRouter.post('/code/terminal/resize', async (req, res) => {
  try {
    const { resizePty } = await import('@packages/e2b/src/pty-manager.ts');
    res.json(await resizePty(Number(req.body?.cols) || 80, Number(req.body?.rows) || 24));
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
