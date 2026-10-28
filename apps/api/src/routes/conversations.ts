/**
 * Conversations and SSE Streaming routes
 */

import { Router } from 'express';
import { db } from '@packages/database/src/index.ts';
import { ConversationEngine } from '@packages/ai-core/src/index.ts';
import { validateStreamMessageInput } from '@packages/contracts/src/index.ts';
import type { SSEMessage } from '@packages/types/src/index.ts';

export const conversationsRouter = Router();
const engine = new ConversationEngine();

/**
 * List all conversations for authenticated user
 */
conversationsRouter.get('/conversations', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const list = await db.listConversations(userId);
  res.json({ conversations: list, total: list.length });
});

/**
 * Create a new conversation
 */
conversationsRouter.post('/conversations', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const { title, modelId, systemPrompt, temperature } = req.body || {};

  const conv = await db.createConversation({
    userId,
    title: typeof title === 'string' ? title : undefined,
    modelId: typeof modelId === 'string' ? modelId : undefined,
    systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : undefined,
    temperature: typeof temperature === 'number' ? temperature : undefined,
  });

  res.status(201).json(conv);
});

/**
 * Get single conversation
 */
conversationsRouter.get('/conversations/:id', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const conv = await db.getConversation(req.params.id, userId);

  if (!conv) {
    res.status(404).json({ error: 'Conversation non trouvée ou accès refusé' });
    return;
  }

  res.json(conv);
});

/**
 * Update conversation (title, pin, parameters)
 */
conversationsRouter.patch('/conversations/:id', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const { title, pinned, modelId, systemPrompt, temperature } = req.body || {};

  const updated = await db.updateConversation(req.params.id, userId, {
    title,
    pinned,
    modelId,
    systemPrompt,
    temperature,
  });

  if (!updated) {
    res.status(404).json({ error: 'Conversation non trouvée ou accès refusé' });
    return;
  }

  res.json(updated);
});

/**
 * Delete conversation
 */
conversationsRouter.delete('/conversations/:id', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const deleted = await db.deleteConversation(req.params.id, userId);

  if (!deleted) {
    res.status(404).json({ error: 'Conversation non trouvée ou accès refusé' });
    return;
  }

  res.json({ success: true });
});

/**
 * List messages in a conversation
 */
conversationsRouter.get('/conversations/:id/messages', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const conv = await db.getConversation(req.params.id, userId);

  if (!conv) {
    res.status(404).json({ error: 'Conversation non trouvée ou accès refusé' });
    return;
  }

  const messages = await db.listMessages(req.params.id, userId);
  res.json({ messages, total: messages.length });
});

/**
 * SSE Streaming chat endpoint
 * POST /conversations/:id/messages/stream
 */
conversationsRouter.post('/conversations/:id/messages/stream', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const conversationId = req.params.id;

  const conv = await db.getConversation(conversationId, userId);
  if (!conv) {
    res.status(404).json({ error: 'Conversation introuvable' });
    return;
  }

  const validation = validateStreamMessageInput(req.body);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error || 'Requête invalide' });
    return;
  }

  const { content, modelId, systemPrompt, temperature, attachments, webSearch } = validation.data;

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
  });

  const sendSSE = (event: SSEMessage) => {
    if (res.writableEnded) return;
    res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
  };

  const userMsgId = `msg_usr_${Date.now()}`;
  const assistantMsgId = `msg_ast_${Date.now()}`;

  try {
    // 1. Save user message to database
    await db.addMessage(conversationId, userId, {
      id: userMsgId,
      role: 'user',
      content,
      attachments: attachments?.map((att, i) => ({
        id: `att_${Date.now()}_${i}`,
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        base64Data: att.base64Data,
        createdAt: new Date().toISOString(),
      })),
    });

    // 2. Fetch existing history
    const existingMessages = await db.listMessages(conversationId, userId);
    // Exclude the current user message from history array passed to engine since engine takes prompt separately
    const historyBeforeCurrent = existingMessages.filter((m) => m.id !== userMsgId);

    // 3. Stream response using AI Engine
    const targetModel = modelId || conv.modelId || 'gemini-3.8-flash';
    const effectiveSystemPrompt = systemPrompt || conv.systemPrompt;
    const effectiveTemperature = temperature ?? conv.temperature ?? 0.7;

    const result = await engine.streamConversation({
      conversationId,
      userMessageId: userMsgId,
      assistantMessageId: assistantMsgId,
      history: historyBeforeCurrent,
      prompt: content,
      attachments,
      modelId: targetModel,
      systemPrompt: effectiveSystemPrompt,
      temperature: effectiveTemperature,
      webSearch,
      signal: abortController.signal,
      onEvent: (evt) => {
        sendSSE(evt);
      },
    });

    // 4. Save assistant response message to database
    if (result.fullText.length > 0) {
      await db.addMessage(conversationId, userId, {
        id: assistantMsgId,
        role: 'assistant',
        content: result.fullText,
        metadata: {
          model: result.model,
          provider: result.provider,
          tokens: result.totalTokens,
          latencyMs: result.latencyMs,
          finishReason: result.finishReason as any,
        },
      });
    }

    res.end();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur interne de génération';
    sendSSE({
      event: 'error',
      data: {
        code: 'STREAM_FAILED',
        message: errorMsg,
      },
    });
    res.end();
  }
});
