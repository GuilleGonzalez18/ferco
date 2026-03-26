import { Router } from 'express';
import { query } from '../db.js';

export const usuariosRouter = Router();

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
  return res.json({ ...result.rows[0], tipo: 'vendedor' });
});
