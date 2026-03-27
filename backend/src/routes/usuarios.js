import { Router } from 'express';
import { query } from '../db.js';
import jwt from 'jsonwebtoken';
import { getAuthUserFromRequest } from '../auth.js';

export const usuariosRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function normalizeTipo(value) {
  const tipo = String(value || '').trim().toLowerCase();
  if (tipo === 'admin' || tipo === 'propietario') return 'propietario';
  return 'vendedor';
}

function isPropietario(authUser) {
  return normalizeTipo(authUser?.tipo) === 'propietario';
}

usuariosRouter.get('/', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) return res.status(401).json({ error: 'No autorizado' });

  if (isPropietario(authUser)) {
    const result = await query(
      `SELECT id, username, tipo, nombre, apellido, correo, telefono, direccion
       FROM public.usuarios
       ORDER BY id DESC`
    );
    return res.json(result.rows.map((u) => ({ ...u, tipo: normalizeTipo(u.tipo) })));
  }

  const result = await query(
    `SELECT id, username, tipo, nombre, apellido, correo, telefono, direccion
     FROM public.usuarios
     WHERE id = $1
     LIMIT 1`,
    [authUser.id]
  );
  return res.json(result.rows.map((u) => ({ ...u, tipo: normalizeTipo(u.tipo) })));
});

usuariosRouter.post('/', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) return res.status(401).json({ error: 'No autorizado' });
  if (!isPropietario(authUser)) {
    return res.status(403).json({ error: 'Solo un propietario puede crear usuarios' });
  }

  const {
    username,
    password,
    tipo = 'vendedor',
    nombre = null,
    apellido = null,
    correo,
    telefono = null,
    direccion = null,
  } = req.body || {};

  if (!username || !password || !correo) {
    return res.status(400).json({ error: 'username, password y correo son requeridos' });
  }

  const usernameExists = await query(
    `SELECT id FROM public.usuarios WHERE username = $1 LIMIT 1`,
    [username]
  );
  if (usernameExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese username' });
  }
  const correoExists = await query(
    `SELECT id FROM public.usuarios WHERE correo = $1 LIMIT 1`,
    [correo]
  );
  if (correoExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  const result = await query(
    `INSERT INTO public.usuarios
      (username, password, tipo, nombre, apellido, correo, telefono, direccion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, username, tipo, nombre, apellido, correo, telefono, direccion`,
    [username, password, normalizeTipo(tipo), nombre, apellido, correo, telefono, direccion]
  );
  return res.status(201).json({ ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) });
});

usuariosRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  const {
    username,
    password,
    tipo = 'vendedor',
    nombre = null,
    apellido = null,
    correo,
    telefono = null,
    direccion = null,
  } = req.body || {};

  if (!authUser?.id) return res.status(401).json({ error: 'No autorizado' });
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de usuario inválido' });
  }
  const canManageAll = isPropietario(authUser);
  const isSelf = Number(authUser.id) === id;
  if (!canManageAll && !isSelf) {
    return res.status(403).json({ error: 'Solo puedes editar tu propio usuario' });
  }
  if (!username || !correo) {
    return res.status(400).json({ error: 'username y correo son requeridos' });
  }

  const passwordValue = typeof password === 'string' ? password.trim() : '';
  const currentUserQ = await query(
    `SELECT id, tipo
     FROM public.usuarios
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  if (!currentUserQ.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
  const tipoActual = normalizeTipo(currentUserQ.rows[0].tipo);
  const tipoFinal = canManageAll ? normalizeTipo(tipo) : tipoActual;

  const usernameExists = await query(
    `SELECT id
     FROM public.usuarios
     WHERE username = $1 AND id <> $2
     LIMIT 1`,
    [username, id]
  );
  if (usernameExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese username' });
  }
  const correoExists = await query(
    `SELECT id
     FROM public.usuarios
     WHERE correo = $1 AND id <> $2
     LIMIT 1`,
    [correo, id]
  );
  if (correoExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  const result = await query(
    `UPDATE public.usuarios
     SET username = $1,
          password = COALESCE(NULLIF($2, ''), password),
          tipo = $3,
         nombre = $4,
         apellido = $5,
         correo = $6,
         telefono = $7,
         direccion = $8
     WHERE id = $9
     RETURNING id, username, tipo, nombre, apellido, correo, telefono, direccion`,
    [username, passwordValue, tipoFinal, nombre, apellido, correo, telefono, direccion, id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) });
});

usuariosRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) return res.status(401).json({ error: 'No autorizado' });
  if (!isPropietario(authUser)) {
    return res.status(403).json({ error: 'Solo un propietario puede eliminar usuarios' });
  }
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de usuario inválido' });
  }
  if (Number(authUser.id) === id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }
  const result = await query(`DELETE FROM public.usuarios WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.status(204).send();
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
  const user = { ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) };
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
    return res.json({ ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) });
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
});
