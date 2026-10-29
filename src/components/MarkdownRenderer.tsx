/**
 * High-performance, secure Markdown & README & Mermaid Renderer
 * ChatGPT-styled typography, interactive Mermaid diagrams (flowcharts, mindmaps, sequence, ERD),
 * polished tables, citation badges ([^1^][^3^]), task lists, code blocks with syntax highlighting.
 */

import React, { useState } from 'react';
import { Check, Copy, Play, Loader2 } from 'lucide-react';
import { MermaidBlock } from './MermaidBlock.tsx';
import { CodeExecutionTerminal } from './CodeExecutionTerminal.tsx';
import { TerminalView } from './TerminalView.tsx';
import { parseE2BExecutionBlock } from '../utils/e2bParser.ts';
import { ThoughtAccordion } from './ThoughtAccordion.tsx';
import { api } from '../api/client.ts';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming }) => {
  let thoughtText = '';
  let mainContent = content.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/g, '').trim();

  const thinkMatch = mainContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
  if (thinkMatch) {
    thoughtText = thinkMatch[1].trim();
    mainContent = mainContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();
  }

  const blocks = parseBlocks(mainContent);

  return (
    <div className="max-w-none text-[#ececec] text-[15px] leading-relaxed space-y-3 break-words">
      {thoughtText && <ThoughtAccordion thought={thoughtText} />}
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          const lang = (block.language || '').toLowerCase().trim();
          if (lang === 'mermaid' || lang === 'markflow' || lang === 'flowchart' || lang === 'mindmap') {
            return <MermaidBlock key={idx} code={block.content} />;
          }

          return (
            <CodeBlock
              key={idx}
              language={block.language || 'text'}
              code={block.content}
            />
          );
        }
        return <TextBlock key={idx} text={block.content} />;
      })}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse rounded-xs align-middle" />
      )}
    </div>
  );
};

interface Block {
  type: 'text' | 'code';
  language?: string;
  content: string;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }
    blocks.push({
      type: 'code',
      language: match[1]?.trim() || 'code',
      content: match[2]?.replace(/\n$/, '') || '',
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    const remaining = markdown.slice(lastIndex);
    const openCodeMatch = remaining.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*)$/);
    if (openCodeMatch) {
      blocks.push({
        type: 'code',
        language: openCodeMatch[1]?.trim() || 'code',
        content: openCodeMatch[2] || '',
      });
    } else {
      blocks.push({
        type: 'text',
        content: remaining,
      });
    }
  }

  return blocks;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    environment: string;
    executionTimeMs?: number;
  } | null>(null);

  const cleanLang = (language || 'text').toLowerCase().trim();
  const isRunnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts', 'node', 'bash', 'sh', 'shell', 'rust', 'rs'].includes(cleanLang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleExecuteE2B = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setExecutionOutput(null);

    const mappedLang = cleanLang.includes('py')
      ? 'python'
      : cleanLang.includes('rust') || cleanLang === 'rs'
      ? 'rust'
      : cleanLang.includes('bash') || cleanLang.includes('sh') || cleanLang === 'shell'
      ? 'bash'
      : 'javascript';

    api.executeCode(
      { language: mappedLang, code },
      {
        onEvent: (event) => {
          if (event.event === 'code_output') {
            setExecutionOutput({
              stdout: event.data.stdout || '',
              stderr: event.data.stderr || '',
              exitCode: event.data.exitCode ?? 0,
              environment: event.data.environment || 'E2B Cloud Secure Sandbox',
              executionTimeMs: event.data.executionTimeMs,
            });
          }
        },
        onError: (err) => {
          setExecutionOutput({
            stdout: '',
            stderr: `Erreur d'exécution : ${err.message}`,
            exitCode: 1,
            environment: 'E2B Cloud Secure Sandbox',
          });
          setIsExecuting(false);
        },
        onComplete: () => {
          setIsExecuting(false);
        },
      }
    );
  };

  const lines = code.split('\n');

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-[#2f2f2f] bg-[#0d0d0d] shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#2f2f2f] text-xs text-[#b4b4b4]">
        <span className="font-mono text-xs text-[#ececec] font-medium lowercase">
          {language}
        </span>

        <div className="flex items-center space-x-2">
          {/* Run in E2B Sandbox Button */}
          {isRunnable && (
            <button
              onClick={handleExecuteE2B}
              disabled={isExecuting}
              title="Exécuter ce code dans E2B Cloud Sandbox"
              className="flex items-center space-x-1.5 py-1 px-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-medium transition-all active:scale-95 text-xs shadow-xs disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Exécution...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/30" />
                  <span>Exécuter dans E2B</span>
                </>
              )}
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            aria-label="Copier le code"
            className="flex items-center space-x-1.5 py-1 px-2 rounded-lg hover:bg-[#2f2f2f] text-[#b4b4b4] hover:text-white transition-colors text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto text-[13.5px] font-mono leading-relaxed text-[#ececec]">
        <pre className="m-0 p-0">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre">
                {highlightSyntax(line, language)}
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Embedded Live Terminal Output */}
      {executionOutput && (
        <div className="border-t border-[#2f2f2f] p-2 bg-[#080808]">
          <TerminalView
            environment={executionOutput.environment}
            exitCode={executionOutput.exitCode}
            executionTimeMs={executionOutput.executionTimeMs}
            stdout={executionOutput.stdout}
            stderr={executionOutput.stderr}
            onClose={() => setExecutionOutput(null)}
          />
        </div>
      )}
    </div>
  );
};

// Syntax highlighting tokens
function highlightSyntax(line: string, _lang: string): React.ReactNode {
  if (/^\s*(\/\/|#|--)/.test(line)) {
    return <span className="text-[#787878] italic">{line}</span>;
  }

  const parts = line.split(
    /(\b(?:const|let|var|function|return|import|export|from|class|extends|if|else|for|while|async|await|try|catch|type|interface|def|print|select|from|where)\b|"[^"]*"|'[^']*'|`[^`]*`|\b\d+\b)/g
  );

  return parts.map((part, index) => {
    if (
      /^(const|let|var|function|return|import|export|from|class|extends|if|else|for|while|async|await|try|catch|type|interface|def|print|select|where)$/.test(
        part
      )
    ) {
      return (
        <span key={index} className="text-[#e29578] font-medium">
          {part}
        </span>
      );
    }
    if (/^["'`].*["'`]$/.test(part)) {
      return (
        <span key={index} className="text-[#a7c957]">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={index} className="text-[#90e0ef]">
          {part}
        </span>
      );
    }
    return part;
  });
}

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        // E2B Sandbox Code Execution Terminal Block
        const e2bParsed = parseE2BExecutionBlock(trimmed);
        if (e2bParsed) {
          return (
            <TerminalView
              key={idx}
              environment={e2bParsed.environment}
              exitCode={e2bParsed.exitCode}
              executionTimeMs={e2bParsed.executionTimeMs}
              stdout={e2bParsed.stdout}
              stderr={e2bParsed.stderr}
            />
          );
        }

        // Horizontal separator rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          return <hr key={idx} className="my-5 border-t border-[#383838]" />;
        }

        // Footnote definition like [^1]: https://...
        if (/^\[\^[0-9]+\]:\s+/.test(trimmed)) {
          const fnMatch = trimmed.match(/^\[\^([0-9]+)\]:\s+(.+)$/);
          if (fnMatch) {
            return (
              <div key={idx} className="text-xs text-[#9a9a9a] py-1 flex items-start space-x-2 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-blue-400 border border-[#383838]">
                  [{fnMatch[1]}]
                </span>
                <a
                  href={fnMatch[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-300 underline truncate"
                >
                  {fnMatch[2]}
                </a>
              </div>
            );
          }
        }

        // Markdown Headings
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-[15px] font-bold text-white mt-3 mb-1">
              {formatInline(trimmed.slice(5))}
            </h4>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-white mt-4 mb-2">
              {formatInline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-bold text-white mt-5 mb-2">
              {formatInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl font-bold text-white mt-6 mb-3">
              {formatInline(trimmed.slice(2))}
            </h1>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[#525252] pl-3.5 my-2 text-[#b4b4b4] italic"
            >
              {formatInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Markdown Table (Robust parsing for LLM output)
        if (trimmed.includes('|') && (trimmed.includes('\n') || trimmed.includes('|---'))) {
          const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length >= 2 && lines[0].includes('|')) {
            const sepIdx = lines.findIndex((l) => l.includes('-') && l.includes('|'));
            if (sepIdx !== -1 && sepIdx > 0) {
              const headerStr = lines[sepIdx - 1];
              const headerCells = headerStr
                .split('|')
                .slice(1, -1)
                .map((c) => c.trim());
              const rowLines = lines.slice(sepIdx + 1);

              return (
                <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-[#2f2f2f] shadow-sm">
                  <table className="w-full text-left text-sm text-[#ececec]">
                    <thead className="bg-[#1f1f1f] text-xs uppercase font-semibold text-[#b4b4b4] border-b border-[#2f2f2f]">
                      <tr>
                        {headerCells.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5">
                            {formatInline(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a] bg-[#141414]">
                      {rowLines.map((rowStr, rIdx) => {
                        const cells = rowStr
                          .split('|')
                          .slice(1, -1)
                          .map((c) => c.trim());
                        if (cells.length === 0) return null;
                        return (
                          <tr key={rIdx} className="hover:bg-[#1a1a1a] transition-colors">
                            {cells.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-2">
                                {formatInline(cell)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }
          }
        }

        // Markdown Task List (- [ ] or - [x])
        if (trimmed.includes('\n- [ ]') || trimmed.includes('\n- [x]') || trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
          const lines = trimmed.split('\n');
          return (
            <div key={idx} className="my-2 space-y-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const isChecked = line.trim().startsWith('- [x]') || line.trim().startsWith('- [X]');
                const isUnchecked = line.trim().startsWith('- [ ]');
                if (isChecked || isUnchecked) {
                  const label = line.replace(/^\s*-\s*\[[ xX]\]\s*/, '');
                  return (
                    <div key={lIdx} className="flex items-center space-x-2 text-sm text-[#ececec]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-[#484848] bg-[#292929] text-blue-500 focus:ring-0 cursor-default"
                      />
                      <span className={isChecked ? 'line-through text-[#888888]' : ''}>
                        {formatInline(label)}
                      </span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="text-sm">
                    {formatInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Bulleted lists
        if (
          trimmed.includes('\n- ') ||
          trimmed.startsWith('- ') ||
          trimmed.includes('\n* ') ||
          trimmed.startsWith('* ')
        ) {
          const items = trimmed.split(/\n[-*] /);
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            items[0] = items[0].slice(2);
          }
          return (
            <ul key={idx} className="list-disc pl-5 my-2 space-y-1.5 text-[#ececec]">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>{formatInline(item.trim())}</li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split(/\n\d+\.\s/);
          items[0] = items[0].replace(/^\d+\.\s/, '');
          return (
            <ol key={idx} className="list-decimal pl-5 my-2 space-y-1.5 text-[#ececec]">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>{formatInline(item.trim())}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="my-1.5 text-[#ececec]">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </>
  );
};

function formatInline(str: string): React.ReactNode {
  // Support inline code, bold, italics, links [label](url), and citations [^1^][^3^], [^1]
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\[\^[0-9^]+\](?:\s*\[\^[0-9^]+\])*)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-[#2f2f2f] text-white font-mono text-[13px] border border-[#3c3c3c]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={i} className="text-[#ececec] italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    // Markdown links [text](url)
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    // Citations like [^1^] or [^1^][^3^] or [^1]
    if (/^(\[\^[0-9^]+\])+$/.test(token)) {
      const matches = token.match(/\[\^([0-9^]+)\]/g);
      if (matches) {
        return (
          <span key={i} className="inline-flex items-center space-x-0.5 mx-0.5 align-baseline">
            {matches.map((m, mIdx) => {
              const num = m.replace(/[^0-9]/g, '');
              return (
                <span
                  key={mIdx}
                  className="inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[11px] font-mono font-medium bg-blue-900/40 text-blue-300 border border-blue-700/40 shadow-xs"
                  title={`Source [${num}]`}
                >
                  {num}
                </span>
              );
            })}
          </span>
        );
      }
    }
    return token;
  });
}

