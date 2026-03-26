import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

const dumpPath = process.env.DUMP_FILE;
const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const port = process.env.PGPORT || process.env.DB_PORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'ferco_db';
const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';

if (!dumpPath) {
  // eslint-disable-next-line no-console
  console.error('Falta DUMP_FILE en .env');
  process.exit(1);
}

const args = [
  '-h', host,
  '-p', String(port),
  '-U', user,
  '-d', database,
  '-f', dumpPath,
];

const proc = spawn('psql', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PGPASSWORD: password,
  },
});

proc.on('exit', (code) => {
  if (code === 0) {
    // eslint-disable-next-line no-console
    console.log('Dump importado correctamente con psql.');
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.error(`Falló la importación del dump (exit code ${code}).`);
  process.exit(code ?? 1);
});
