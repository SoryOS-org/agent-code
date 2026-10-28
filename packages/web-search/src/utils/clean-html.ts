/**
 * HTML Parsing and Markdown/Text extraction utility
 * Cleans scripts, styles, navigational noise, and transforms articles into readable markdown
 */

export interface ParsedHtmlResult {
  title: string;
  markdown: string;
  characterCount: number;
  truncated: boolean;
}

/**
 * Strips HTML noise and converts structured tags to clean markdown
 */
export function cleanHtmlToMarkdown(html: string, maxCharacters = 8000): ParsedHtmlResult {
  if (!html || typeof html !== 'string') {
    return { title: '', markdown: '', characterCount: 0, truncated: false };
  }

  // 1. Extract title if present
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // 2. Remove non-content tags: scripts, styles, iframes, svg, noscript, nav, footer, header, forms
  let content = html
    .replace(/<!--[\s\S]*?-->/g, '') // comments
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ');

  // 3. Convert headings
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  content = content.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  content = content.replace(/<h[56][^>]*>([\s\S]*?)<\/h[56]>/gi, '\n\n##### $1\n\n');

  // 4. Convert links: <a href="url">text</a> -> [text](url)
  content = content.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) return '';
    return `[${cleanText}](${href})`;
  });

  // 5. Convert lists
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  content = content.replace(/<\/(ul|ol)>/gi, '\n');

  // 6. Convert code blocks and inline code
  content = content.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 7. Convert emphasis and paragraphs
  content = content.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  content = content.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // 8. Strip any remaining HTML tags
  content = content.replace(/<[^>]+>/g, ' ');

  // 9. Decode HTML entities
  content = decodeHtmlEntities(content);

  // 10. Clean up whitespace
  content = content
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  // 11. Handle truncation
  let truncated = false;
  if (content.length > maxCharacters) {
    truncated = true;
    const remaining = content.length - maxCharacters;
    content = `${content.slice(0, maxCharacters)}\n\n... [Contenu tronqué : ${remaining} caractères restants]`;
  }

  return {
    title,
    markdown: content,
    characterCount: content.length,
    truncated,
  };
}

/**
 * Basic HTML entity decoding
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)));
}
