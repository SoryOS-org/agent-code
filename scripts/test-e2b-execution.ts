/**
 * Test script for E2B Cloud Sandbox execution
 */

import { executeSecureCode } from '../packages/opencode-e2b/src/code-executor.js';

async function main() {
  console.log('--- TEST 1: Exécution Python dans E2B Cloud Sandbox ---');
  const pythonResult = await executeSecureCode({
    language: 'python',
    code: 'import sys, math\nprint("Hello from E2B Sandbox!")\nprint(f"Python Version: {sys.version.split()[0]}")\nprint(f"Pi: {math.pi:.5f}")',
  });

  console.log('Résultat Python :', JSON.stringify(pythonResult, null, 2));

  console.log('\n--- TEST 2: Exécution JavaScript dans E2B Cloud Sandbox ---');
  const jsResult = await executeSecureCode({
    language: 'javascript',
    code: 'console.log("Hello Node.js in E2B Sandbox!"); console.log("Calcul:", [1,2,3,4].reduce((a,b)=>a+b, 0));',
  });

  console.log('Résultat JavaScript :', JSON.stringify(jsResult, null, 2));
}

main().catch((err) => {
  console.error('Erreur lors du test E2B :', err);
});
