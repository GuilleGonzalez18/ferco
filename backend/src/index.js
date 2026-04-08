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

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || '';

const allowedOrigins = corsOrigin
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.length) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${PORT}`);
});
