/**
 * Utility parser for E2B Sandbox execution output blocks
 */

export interface ParsedE2BOutput {
  isE2B: boolean;
  environment: string;
  exitCode: number;
  executionTimeMs?: number;
  stdout: string;
  stderr: string;
}

export function parseE2BExecutionBlock(text: string): ParsedE2BOutput | null {
  if (!text.includes("RÉSULTAT DE L'EXÉCUTION DU CODE") && !text.includes("E2B Sandbox")) {
    return null;
  }

  const envMatch = text.match(/Environnement:\s*(.+)/);
  const exitCodeMatch = text.match(/Code de sortie:\s*(\d+)/);
  const timeMatch = text.match(/Temps(?:\sd'ex\u00e9cution)?:\s*(\d+)ms/i);

  const stdoutMatch = text.match(/STDOUT\s*:\s*```(?:\w*\n)?([\s\S]*?)```/);
  const stderrMatch = text.match(/STDERR\s*:\s*```(?:\w*\n)?([\s\S]*?)```/);

  return {
    isE2B: true,
    environment: envMatch ? envMatch[1].trim() : 'E2B Cloud Secure Sandbox',
    exitCode: exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0,
    executionTimeMs: timeMatch ? parseInt(timeMatch[1], 10) : undefined,
    stdout: stdoutMatch ? stdoutMatch[1].trim() : '',
    stderr: stderrMatch ? stderrMatch[1].trim() : '',
  };
}
