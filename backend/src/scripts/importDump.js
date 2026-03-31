import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

const dumpPath = process.env.DUMP_FILE;
const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const port = process.env.PGPORT || process.env.DB_PORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'ferco_db';
const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';
const psqlBin = process.env.PSQL_BIN || 'psql';

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
  '-v', 'ON_ERROR_STOP=1',
  '-f', dumpPath,
];

const proc = spawn(psqlBin, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PGPASSWORD: password,
  },
});

proc.on('error', (error) => {
  if (error?.code === 'ENOENT') {
    // eslint-disable-next-line no-console
    console.error(`No se encontró psql (${psqlBin}). Define PSQL_BIN en .env con la ruta completa, por ejemplo:`);
    // eslint-disable-next-line no-console
    console.error('PSQL_BIN=C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error(`Error ejecutando psql: ${error?.message || error}`);
  process.exit(1);
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
