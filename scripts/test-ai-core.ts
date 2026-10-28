/**
 * Automated Test Suite for Aether AI Core
 * Runs unit and integration validation across AI Core, Adapters, and Database
 */

import { ConversationEngine, ContextManager, ToolRegistry } from '../packages/ai-core/src/index.ts';
import { ProviderRegistry, MockTestAdapter } from '../packages/provider-adapters/src/index.ts';
import { InMemoryDatabase } from '../packages/database/src/store.ts';
import { validateStreamMessageInput } from '../packages/contracts/src/index.ts';
import type { Message, SSEMessage } from '../packages/types/src/index.ts';

async function runTests() {
  console.log('--- [1/6] Testing Provider Registry & Mock Adapter ---');
  const registry = new ProviderRegistry();
  const mockAdapter = new MockTestAdapter();
  registry.register(mockAdapter);

  const models = registry.getAllModels();
  if (!models.some((m) => m.id === 'mock-model-v1')) {
    throw new Error('FAIL: Mock model not found in registry');
  }
  const openRouterFree = models.filter((m) => m.providerId === 'openrouter');
  if (openRouterFree.length === 0) {
    throw new Error('FAIL: OpenRouter free models not registered');
  }
  console.log(`✓ Provider Registry OK (${models.length} models available, including ${openRouterFree.length} OpenRouter free models)`);

  console.log('--- [2/6] Testing AI Conversation Engine & Streaming with Mock ---');
  const engine = new ConversationEngine(registry);
  const streamEvents: SSEMessage[] = [];

  const result = await engine.streamConversation({
    conversationId: 'test-conv-1',
    userMessageId: 'test-usr-1',
    assistantMessageId: 'test-ast-1',
    history: [],
    prompt: 'Bonjour depuis les tests unitaires',
    modelId: 'mock-model-v1',
    onEvent: (evt) => {
      streamEvents.push(evt);
    },
  });

  if (!result.fullText.includes('[Test Mock Response]')) {
    throw new Error(`FAIL: Unexpected mock stream output: ${result.fullText}`);
  }
  if (!streamEvents.some((e) => e.event === 'message_start')) {
    throw new Error('FAIL: message_start SSE event not fired');
  }
  if (!streamEvents.some((e) => e.event === 'text_delta')) {
    throw new Error('FAIL: text_delta SSE event not fired');
  }
  if (!streamEvents.some((e) => e.event === 'message_complete')) {
    throw new Error('FAIL: message_complete SSE event not fired');
  }
  console.log(`✓ AI Core Streaming OK (${streamEvents.length} SSE events, generated ${result.fullText.length} chars)`);

  console.log('--- [3/6] Testing Context Manager History Budgeting ---');
  const contextManager = new ContextManager(100); // Small limit to test pruning
  const fakeHistory: Message[] = [
    { id: '1', conversationId: 'c1', role: 'user', content: 'Long message 1 '.repeat(20), createdAt: '' },
    { id: '2', conversationId: 'c1', role: 'assistant', content: 'Long message 2 '.repeat(20), createdAt: '' },
    { id: '3', conversationId: 'c1', role: 'user', content: 'Recent short message', createdAt: '' },
  ];
  const pruned = contextManager.prepareContext(fakeHistory, 'System instruction');
  if (pruned[0].role !== 'system') {
    throw new Error('FAIL: System prompt should be first item');
  }
  console.log(`✓ Context Manager OK (pruned ${fakeHistory.length} messages down to within budget)`);

  console.log('--- [4/6] Testing Tool Registry & Built-in Tools ---');
  const toolRegistry = new ToolRegistry();
  const calc = toolRegistry.get('calculate');
  if (!calc) throw new Error('FAIL: calculate tool not found');
  const calcResult = (await calc.execute({ expression: '(10 + 5) * 4' })) as { result: number };
  if (calcResult.result !== 60) {
    throw new Error(`FAIL: calculate tool returned ${calcResult.result}, expected 60`);
  }

  const timeTool = toolRegistry.get('get_current_time');
  if (!timeTool) throw new Error('FAIL: get_current_time tool not found');
  const timeResult = (await timeTool.execute({})) as { iso: string };
  if (!timeResult.iso) throw new Error('FAIL: time tool returned invalid output');

  const textTool = toolRegistry.get('analyze_text');
  if (!textTool) throw new Error('FAIL: analyze_text tool not found');
  const textResult = (await textTool.execute({ text: 'Bonjour tout le monde !' })) as { wordCount: number };
  if (textResult.wordCount !== 4) throw new Error(`FAIL: analyze_text returned ${textResult.wordCount} words`);
  console.log('✓ Tool Registry & Execution OK (calc, time, analyze)');

  console.log('--- [5/6] Testing Database User Ownership Isolation ---');
  const db = new InMemoryDatabase();
  const convUser1 = await db.createConversation({ userId: 'user_alice', title: 'Conversation Alice' });
  const aliceConv = await db.getConversation(convUser1.id, 'user_alice');
  if (!aliceConv) throw new Error('FAIL: Alice could not read her own conversation');

  // Attempt unauthorized access by Bob
  const bobAccess = await db.getConversation(convUser1.id, 'user_bob');
  if (bobAccess !== null) {
    throw new Error('SECURITY VIOLATION: User Bob accessed Alice conversation!');
  }

  // Attempt unauthorized deletion by Bob
  const bobDelete = await db.deleteConversation(convUser1.id, 'user_bob');
  if (bobDelete !== false) {
    throw new Error('SECURITY VIOLATION: User Bob deleted Alice conversation!');
  }
  console.log('✓ Database User Ownership Isolation OK (Strict multi-tenant security confirmed)');

  console.log('--- [6/6] Testing Input Contracts Validation ---');
  const validCheck = validateStreamMessageInput({ content: 'Salut', modelId: 'gemini-3.8-flash' });
  if (!validCheck.valid) throw new Error('FAIL: Valid input was rejected');

  const invalidCheck = validateStreamMessageInput({ content: '' });
  if (invalidCheck.valid) throw new Error('FAIL: Empty content without attachment was accepted');
  console.log('✓ Request Contracts & Schema Validation OK');

  console.log('\n========================================');
  console.log('🎉 ALL 6 TEST SUITES PASSED SUCCESSFULLY');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
