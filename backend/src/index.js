import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { productosRouter } from './routes/productos.js';
import { clientesRouter } from './routes/clientes.js';
import { usuariosRouter } from './routes/usuarios.js';
import { ventasRouter } from './routes/ventas.js';
import { auditoriaRouter } from './routes/auditoria.js';
import { empaquesRouter } from './routes/empaques.js';
import { tiposIvaRouter } from './routes/tipos-iva.js';
import { configuracionRouter } from './routes/configuracion.js';
import { permisosRouter } from './routes/permisos.js';
import { ubicacionesRouter } from './routes/ubicaciones.js';
import { runMigration } from './scripts/runMigration.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';

function normalizeOrigin(value) {
  return String(value || '')
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\/+$/, '');
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

const allowedOrigins = corsOrigin
  .split(',')
  .map((value) => normalizeOrigin(value))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    const requestOrigin = normalizeOrigin(origin);
    const isAllowed = allowedOrigins.some((rule) => {
      if (!rule.includes('*')) return rule === requestOrigin;
      return wildcardToRegex(rule).test(requestOrigin);
    });
    if (isAllowed) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${requestOrigin}`));
  },
}));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, db: 'connected' });
  } catch (error) {
    return res.status(500).json({ ok: false, db: 'disconnected', error: error.message });
  }
});

app.use('/api/productos', productosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/empaques', empaquesRouter);
app.use('/api/tipos-iva', tiposIvaRouter);
app.use('/api/configuracion', configuracionRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/ubicaciones', ubicacionesRouter);

app.listen(PORT, async () => {
  console.log(`CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'all origins allowed'}`);
  try {
    await runMigration();
    // eslint-disable-next-line no-console
    console.log('Migración aplicada correctamente.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error de migración al iniciar:', err.message);
  }
});
