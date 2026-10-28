/**
 * HTTP and URL utilities for Web Search and Web Fetch
 * Provides timeouts, User-Agent identification, and SSRF security protection
 */

const DEFAULT_TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (compatible; OpenCodeWeb/1.0; +https://aether-ai.local)';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
    message?: string
  ) {
    super(message || `HTTP ${status} (${statusText}) for ${url}`);
    this.name = 'HttpError';
  }
}

export class TimeoutError extends Error {
  constructor(public readonly url: string, timeoutMs: number) {
    super(`Délai d'attente dépassé (${timeoutMs}ms) pour ${url}`);
    this.name = 'TimeoutError';
  }
}

/**
 * Validates and sanitizes a URL, blocking invalid protocols and local network SSRF
 */
export function sanitizeAndValidateUrl(rawUrl: string): { valid: boolean; error?: string; url?: URL } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL manquante ou invalide' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: `Format d'URL invalide: "${rawUrl}"` };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Protocole non supporté: "${parsed.protocol}". Seuls http: et https: sont autorisés.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Basic SSRF protection: block localhost and private network addresses
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost');

  const isPrivateIp =
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.startsWith('169.254.'); // Link-local / metadata

  if (isLocalhost || isPrivateIp) {
    return { valid: false, error: 'Accès aux adresses réseau locales et privées interdit pour des raisons de sécurité.' };
  }

  return { valid: true, url: parsed };
}

/**
 * Extracts a clean domain name for display as source (e.g. "github.com")
 */
export function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

/**
 * Executes a fetch request with timeout and error wrapping
 */
export async function safeFetch(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();

  let timeoutId: NodeJS.Timeout | null = null;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  const combinedSignal = options.signal;
  if (combinedSignal) {
    if (combinedSignal.aborted) {
      if (timeoutId) clearTimeout(timeoutId);
      throw new Error('Opération annulée');
    }
    combinedSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', USER_AGENT);
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    return response;
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    if (controller.signal.aborted && !combinedSignal?.aborted) {
      throw new TimeoutError(url, timeoutMs);
    }

    throw err;
  }
}
