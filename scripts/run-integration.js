/**
 * run-integration.js
 * Levanta el backend, espera que esté listo, corre los integration tests y mata el proceso.
 * Uso: node scripts/run-integration.js
 */
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const backendDir = join(rootDir, 'backend');
const HEALTH_URL = process.env.INTEGRATION_BASE_URL
  ? `${process.env.INTEGRATION_BASE_URL}/api/health`
  : 'http://localhost:3001/api/health';
const TIMEOUT_MS = 30_000;
const POLL_MS = 500;

/** Espera hasta que el health endpoint responda 200 */
async function waitForBackend() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return true;
    } catch {
      // backend todavía no levantó
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

console.log('▶  Iniciando backend para integration tests...');
const isWindows = process.platform === 'win32';
const backend = spawn(
  isWindows ? 'node.exe' : 'node',
  ['src/index.js'],
  {
    cwd: backendDir,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  }
);

backend.stdout.pipe(process.stdout);
backend.stderr.pipe(process.stderr);

backend.on('error', (err) => {
  console.error('✗ Error al iniciar el backend:', err.message);
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`✗ El backend terminó inesperadamente con código ${code}`);
    process.exit(1);
  }
});

console.log(`⏳ Esperando que el backend responda en ${HEALTH_URL} (máx ${TIMEOUT_MS / 1000}s)...`);
const ready = await waitForBackend();

if (!ready) {
  console.error('✗ El backend no respondió a tiempo. Abortando.');
  backend.kill();
  process.exit(1);
}

console.log('✓ Backend listo. Corriendo integration tests...\n');
const tests = spawnSync(
  'node',
  [
    '--test',
    'src/__tests__/integration/ventas.integration.test.js',
    'src/__tests__/integration/stock.integration.test.js',
    'src/__tests__/integration/cfe.integration.test.js',
  ],
  {
    cwd: backendDir,
    env: { ...process.env, RUN_INTEGRATION_TESTS: '1' },
    stdio: 'inherit',
    shell: isWindows,
  }
);

console.log('\n▶  Deteniendo backend...');
backend.kill();
process.exit(tests.status ?? 1);

