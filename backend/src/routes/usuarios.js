import { Router } from 'express';
import { query } from '../db.js';
import jwt from 'jsonwebtoken';

export const usuariosRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

usuariosRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, username, tipo, nombre, apellido, correo, telefono, direccion
     FROM public.usuarios
     ORDER BY id DESC`
  );
  res.json(result.rows);
});

usuariosRouter.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  const result = await query(
    `SELECT id, username, tipo, nombre, apellido, correo
     FROM public.usuarios
     WHERE correo = $1 AND password = $2
     LIMIT 1`,
    [correo, password]
  );
  if (!result.rowCount) return res.status(401).json({ error: 'Credenciales inválidas' });
  const user = { ...result.rows[0], tipo: 'vendedor' };
  const token = jwt.sign(
    {
      sub: user.id,
      correo: user.correo,
      tipo: user.tipo,
      username: user.username,
      nombre: user.nombre || null,
      apellido: user.apellido || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return res.json({ user, token });
});

usuariosRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const result = await query(
      `SELECT id, username, tipo, nombre, apellido, correo, telefono, direccion
       FROM public.usuarios
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Usuario no encontrado' });
    return res.json({ ...result.rows[0], tipo: result.rows[0].tipo || 'vendedor' });
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
});
