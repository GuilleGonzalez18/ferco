import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { productosRouter } from './routes/productos.js';
import { clientesRouter } from './routes/clientes.js';
import { usuariosRouter } from './routes/usuarios.js';
import { ventasRouter } from './routes/ventas.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${PORT}`);
});
