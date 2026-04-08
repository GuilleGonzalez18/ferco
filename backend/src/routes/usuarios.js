import { Router } from 'express';
import { query } from '../db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getAuthUserFromRequest } from '../auth.js';
import { sendDbError } from '../dbErrors.js';
import { sendMail } from '../mailer.js';

export const usuariosRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const RESET_CODE_TTL_MINUTES = Number(process.env.RESET_CODE_TTL_MINUTES || 10);

function normalizeTipo(value) {
  const tipo = String(value || '').trim().toLowerCase();
  if (tipo === 'admin' || tipo === 'propietario') return 'propietario';
  return 'vendedor';
}

function isPropietario(authUser) {
  return normalizeTipo(authUser?.tipo) === 'propietario';
}

function isBcryptHash(value) {
  const v = String(value || '');
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(v);
}

async function hashPassword(plainText) {
  return bcrypt.hash(plainText, 12);
}

async function comparePassword(plainText, hashed) {
  try {
    return await bcrypt.compare(plainText, hashed);
  } catch {
    return false;
  }
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

  const usernameValue = String(username || '').trim();
  const correoValue = String(correo || '').trim().toLowerCase();
  const passwordValue = String(password || '');
  if (!usernameValue || !passwordValue || !correoValue) {
    return res.status(400).json({ error: 'username, password y correo son requeridos' });
  }

  const usernameExists = await query(
    `SELECT id FROM public.usuarios WHERE username = $1 LIMIT 1`,
    [usernameValue]
  );
  if (usernameExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese username' });
  }
  const correoExists = await query(
    `SELECT id FROM public.usuarios WHERE correo = $1 LIMIT 1`,
    [correoValue]
  );
  if (correoExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  try {
    const hashedPassword = await hashPassword(passwordValue);
    const result = await query(
      `INSERT INTO public.usuarios
        (username, password, tipo, nombre, apellido, correo, telefono, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, username, tipo, nombre, apellido, correo, telefono, direccion`,
      [usernameValue, hashedPassword, normalizeTipo(tipo), nombre, apellido, correoValue, telefono, direccion]
    );
    return res.status(201).json({ ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) });
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear el usuario');
  }
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
  const usernameValue = String(username || '').trim();
  const correoValue = String(correo || '').trim().toLowerCase();
  if (!usernameValue || !correoValue) {
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
    [usernameValue, id]
  );
  if (usernameExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese username' });
  }
  const correoExists = await query(
    `SELECT id
     FROM public.usuarios
     WHERE correo = $1 AND id <> $2
     LIMIT 1`,
    [correoValue, id]
  );
  if (correoExists.rowCount) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  try {
    let hashedPassword = '';
    if (passwordValue) {
      hashedPassword = await hashPassword(passwordValue);
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
      [usernameValue, hashedPassword, tipoFinal, nombre, apellido, correoValue, telefono, direccion, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ ...result.rows[0], tipo: normalizeTipo(result.rows[0].tipo) });
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar el usuario');
  }
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
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  const result = await query(
    `SELECT id, username, password, tipo, nombre, apellido, correo
     FROM public.usuarios
     WHERE correo = $1
     LIMIT 1`,
    [correo]
  );
  if (!result.rowCount) return res.status(401).json({ error: 'Credenciales inválidas' });

  const dbUser = result.rows[0];
  let passwordOk = false;
  if (isBcryptHash(dbUser.password)) {
    passwordOk = await comparePassword(password, dbUser.password);
  } else {
    passwordOk = dbUser.password === password;
    if (passwordOk) {
      const upgradedHash = await hashPassword(password);
      await query(`UPDATE public.usuarios SET password = $1 WHERE id = $2`, [upgradedHash, dbUser.id]);
    }
  }
  if (!passwordOk) return res.status(401).json({ error: 'Credenciales inválidas' });

  const user = {
    id: dbUser.id,
    username: dbUser.username,
    tipo: normalizeTipo(dbUser.tipo),
    nombre: dbUser.nombre,
    apellido: dbUser.apellido,
    correo: dbUser.correo,
  };
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

usuariosRouter.post('/forgot-password', async (req, res) => {
  const correo = String(req.body?.correo || '').trim().toLowerCase();
  if (!correo) return res.status(400).json({ error: 'Correo requerido' });

  const userQ = await query(
    `SELECT id, correo
     FROM public.usuarios
     WHERE correo = $1
     LIMIT 1`,
    [correo]
  );

  if (!userQ.rowCount) {
    return res.status(404).json({
      error: 'El correo no pertenece a la empresa, si esto es un error comunicate con un propietario.',
    });
  }

  const userId = Number(userQ.rows[0].id);
  const plainCode = String(Math.floor(100000 + Math.random() * 900000));
  const tokenHash = crypto.createHash('sha256').update(plainCode).digest('hex');
  const expireAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO public.password_reset_tokens (usuario_id, token_hash, expires_at, used)
     VALUES ($1, $2, $3, false)`,
    [userId, tokenHash, expireAt.toISOString()]
  );

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  try {
    await sendMail({
      from,
      to: correo,
      subject: 'Recuperar contraseña - Ferco',
      text: `Recibimos una solicitud para restablecer tu contraseña.\n\nTu código de recuperación es: ${plainCode}\n\nEste código vence en ${RESET_CODE_TTL_MINUTES} minutos.`,
    });
  } catch (error) {
    return res.status(502).json({ error: 'No se pudo enviar el correo en este momento. Intenta nuevamente.' });
  }

  return res.json({ ok: true });
});

usuariosRouter.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Código y nueva contraseña son requeridos' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenQ = await query(
    `SELECT id, usuario_id, expires_at, used
     FROM public.password_reset_tokens
     WHERE token_hash = $1
     ORDER BY id DESC
     LIMIT 1`,
    [tokenHash]
  );
  if (!tokenQ.rowCount) return res.status(400).json({ error: 'Código inválido o vencido' });

  const row = tokenQ.rows[0];
  if (row.used) return res.status(400).json({ error: 'Código inválido o vencido' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Código inválido o vencido' });
  }

  const newHash = await hashPassword(newPassword);
  await query(`UPDATE public.usuarios SET password = $1 WHERE id = $2`, [newHash, row.usuario_id]);
  await query(`UPDATE public.password_reset_tokens SET used = true WHERE id = $1`, [row.id]);
  await query(`UPDATE public.password_reset_tokens SET used = true WHERE usuario_id = $1 AND id <> $2 AND used = false`, [row.usuario_id, row.id]);

  return res.json({ ok: true });
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
