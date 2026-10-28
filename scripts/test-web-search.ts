/**
 * Automated Test Suite for OpenCode Web Search & Web Fetch
 * Tests MCP client, Exa MCP provider, Parallel MCP provider,
 * OpenCode unified orchestrator, Markdown citations, and ToolRegistry integration
 */

import {
  sanitizeAndValidateUrl,
  extractDomain,
  cleanHtmlToMarkdown,
  ExaSearchProvider,
  ParallelSearchProvider,
  OpenCodeSearchProvider,
  getDefaultSearchProvider,
  createWebSearchTool,
  createWebFetchTool,
  createWebSearchTools,
  formatOpenCodeSearchResults,
} from '../packages/web-search/src/index.ts';
import { ToolRegistry } from '../packages/ai-core/src/index.ts';

async function runWebSearchTests() {
  console.log('--- [1/6] Testing URL Sanitization & SSRF Protection ---');
  const validUrl = sanitizeAndValidateUrl('https://example.com/docs/guide');
  if (!validUrl.valid || validUrl.url?.hostname !== 'example.com') {
    throw new Error('FAIL: Valid HTTPS URL was rejected');
  }

  const localhostUrl = sanitizeAndValidateUrl('http://localhost:8080/admin');
  if (localhostUrl.valid) {
    throw new Error('FAIL: SSRF security flaw: localhost was allowed!');
  }

  const privateIpUrl = sanitizeAndValidateUrl('http://192.168.1.1/secret');
  if (privateIpUrl.valid) {
    throw new Error('FAIL: SSRF security flaw: private IP 192.168.x.x was allowed!');
  }

  const invalidProto = sanitizeAndValidateUrl('javascript:alert(1)');
  if (invalidProto.valid) {
    throw new Error('FAIL: Invalid protocol javascript: was allowed!');
  }

  const domain = extractDomain('https://sub.github.com/org/repo');
  if (domain !== 'sub.github.com') {
    throw new Error(`FAIL: Unexpected domain extraction: ${domain}`);
  }
  console.log('✓ URL Sanitization and SSRF Protection OK');

  console.log('--- [2/6] Testing HTML Cleaning & Markdown Extraction ---');
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Guide de l'IA Moderne</title>
        <script>console.log("malicious or heavy script");</script>
        <style>body { background: black; }</style>
      </head>
      <body>
        <nav><a href="/home">Ignorer ce menu</a></nav>
        <h1>Introduction aux Agents Autonomes</h1>
        <p>Les agents utilisent des outils comme <strong>Exa</strong> et <em>DuckDuckGo</em>.</p>
        <p>Pour en savoir plus, visitez <a href="https://opencode.ai">le site OpenCode</a>.</p>
        <ul>
          <li>Recherche sémantique</li>
          <li>Lecture de pages Web</li>
        </ul>
        <pre><code>const agent = new Agent();</code></pre>
        <footer>Copyright 2026</footer>
      </body>
    </html>
  `;

  const parsed = cleanHtmlToMarkdown(sampleHtml, 1000);
  if (parsed.title !== "Guide de l'IA Moderne") {
    throw new Error(`FAIL: Title extraction failed: got "${parsed.title}"`);
  }
  if (parsed.markdown.includes('malicious or heavy script')) {
    throw new Error('FAIL: Scripts were not stripped from HTML!');
  }
  if (parsed.markdown.includes('Ignorer ce menu')) {
    throw new Error('FAIL: Nav tag content was not stripped!');
  }
  if (!parsed.markdown.includes('# Introduction aux Agents Autonomes')) {
    throw new Error('FAIL: Heading 1 was not converted to markdown');
  }
  if (!parsed.markdown.includes('[le site OpenCode](https://opencode.ai)')) {
    throw new Error('FAIL: Anchor tag was not converted to markdown link [text](url)');
  }
  if (!parsed.markdown.includes('- Recherche sémantique')) {
    throw new Error('FAIL: List items were not converted to markdown bullets');
  }
  console.log(`✓ HTML to Markdown extraction OK (Extracted ${parsed.characterCount} clean chars, title: "${parsed.title}")`);

  console.log('--- [3/6] Testing Native OpenCode Exa MCP Provider (No user key) ---');
  const exa = new ExaSearchProvider();
  if (!exa.isConfigured()) {
    throw new Error('FAIL: Exa MCP should be configured by default without user API key in OpenCode');
  }
  const exaResult = await exa.search({ query: 'Debian 13 ARM64 features', numResults: 3 });
  console.log(`✓ Exa MCP returned ${exaResult.results.length} results in ${exaResult.latencyMs}ms`);
  if (exaResult.results.length === 0) {
    throw new Error('FAIL: Exa MCP returned 0 results');
  }
  console.log(`  Top Exa result: "${exaResult.results[0].title}" (${exaResult.results[0].url})`);

  console.log('--- [4/6] Testing Native OpenCode Parallel MCP Provider (No user key) ---');
  const parallel = new ParallelSearchProvider();
  const parallelResult = await parallel.search({ query: 'TypeScript latest release', numResults: 3 });
  console.log(`✓ Parallel MCP returned ${parallelResult.results.length} results in ${parallelResult.latencyMs}ms`);
  if (parallelResult.results.length > 0) {
    console.log(`  Top Parallel result: "${parallelResult.results[0].title}" (${parallelResult.results[0].url})`);
  }

  console.log('--- [5/6] Testing OpenCode Markdown Citation Formatter ---');
  const markdownContent = formatOpenCodeSearchResults(exaResult);
  if (!markdownContent.includes('## [') || !markdownContent.includes('](')) {
    throw new Error('FAIL: OpenCode markdown citations were not formatted with ## [Title](URL)');
  }
  console.log('✓ OpenCode Markdown citations formatted properly');

  console.log('--- [6/6] Testing ToolRegistry & websearch / webfetch Integration ---');
  const registry = new ToolRegistry();
  const [searchTool, fetchTool] = createWebSearchTools();

  registry.register(searchTool);
  registry.register(fetchTool);

  const registered = registry.getAll();
  const hasSearch = registered.some((t) => t.name === 'websearch');
  const hasFetch = registered.some((t) => t.name === 'webfetch');

  if (!hasSearch || !hasFetch) {
    throw new Error('FAIL: Tools websearch and webfetch not properly registered in ToolRegistry');
  }

  // Execute websearch tool through registry
  const searchToolInstance = registry.get('websearch');
  const toolExecution = await searchToolInstance?.execute({ query: 'OpenCode AI assistant', numResults: 2 });
  if (!toolExecution || typeof toolExecution !== 'object' || 'error' in (toolExecution as Record<string, unknown>)) {
    throw new Error(`FAIL: websearch execution failed: ${JSON.stringify(toolExecution)}`);
  }
  console.log(`✓ websearch tool executed successfully (${(toolExecution as any).results?.length} results, content length ${(toolExecution as any).content?.length})`);

  // Execute webfetch tool through registry on example.com
  const fetchToolInstance = registry.get('webfetch');
  const fetchExecution = await fetchToolInstance?.execute({ url: 'https://example.com' });
  if (!fetchExecution || typeof fetchExecution !== 'object' || 'error' in (fetchExecution as Record<string, unknown>)) {
    throw new Error(`FAIL: webfetch execution failed: ${JSON.stringify(fetchExecution)}`);
  }
  console.log(`✓ webfetch tool executed successfully on example.com (${(fetchExecution as any).characterCount} clean chars extracted)`);

  console.log('\n======================================================');
  console.log('🎉 ALL 6 WEB SEARCH & OPENCEDE ARCHITECTURE TESTS PASSED!');
  console.log('======================================================\n');
}

runWebSearchTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
