import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config();

const dumpPath = process.env.DUMP_FILE || 'db-export.sql';
const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const port = process.env.PGPORT || process.env.DB_PORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'ferco_db';
const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';
const pgDumpBin = process.env.PG_DUMP_BIN || 'pg_dump';

// Export schema + data with DROP/CREATE and INSERT so it can be restored in another device.
const args = [
  '-h', host,
  '-p', String(port),
  '-U', user,
  '-d', database,
  '-f', dumpPath,
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-privileges',
  '--inserts',
  '--column-inserts',
  '-n', 'public',
  '-t', 'public.productos',
  '-t', 'public.clientes',
  '-t', 'public.usuarios',
  '-t', 'public.ventas',
  '-t', 'public.venta_detalle',
  '-t', 'public.pagos',
];

const proc = spawn(pgDumpBin, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PGPASSWORD: password,
  },
});

proc.on('error', (error) => {
  if (error?.code === 'ENOENT') {
    // eslint-disable-next-line no-console
    console.error(`No se encontró pg_dump (${pgDumpBin}). Define PG_DUMP_BIN en .env con la ruta completa, por ejemplo:`);
    // eslint-disable-next-line no-console
    console.error('PG_DUMP_BIN=C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error(`Error ejecutando pg_dump: ${error?.message || error}`);
  process.exit(1);
});

proc.on('exit', (code) => {
  if (code === 0) {
    // eslint-disable-next-line no-console
    console.log(`Dump exportado correctamente en: ${dumpPath}`);
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.error(`Falló la exportación del dump (exit code ${code}).`);
  process.exit(code ?? 1);
});
