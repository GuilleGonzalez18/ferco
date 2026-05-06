import jwt from 'jsonwebtoken';
import { query } from './db.js';

function readJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  const disallowedSecrets = new Set([
    '',
    'dev_secret_change_me',
    'change_me',
    'change_me_super_long_secret',
  ]);

  if (disallowedSecrets.has(secret)) {
    throw new Error('JWT_SECRET debe configurarse con un valor real antes de iniciar el backend');
  }

  return secret;
}

export const JWT_SECRET = readJwtSecret();

export function normalizeTipo(tipo) {
  const t = String(tipo || '').toLowerCase().trim();
  return t === 'propietario' || t === 'admin' ? 'propietario' : 'vendedor';
}

export function isPropietario(authUser) {
  return authUser?.rol_nombre === 'propietario' || normalizeTipo(authUser?.tipo) === 'propietario';
}

export function requireAuth(req, res, next) {
  const user = getAuthUserFromRequest(req);
  if (!user?.id) return res.status(401).json({ error: 'No autorizado' });
  req.authUser = user;
  return next();
}

export function requirePropietario(req, res, next) {
  const user = req.authUser ?? getAuthUserFromRequest(req);
  if (!user?.id) return res.status(401).json({ error: 'No autorizado' });
  if (!isPropietario(user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requiere propietario' });
  }
  req.authUser = user;
  return next();
}

export async function hasPermission(authUser, recurso, accion) {
  if (!authUser?.id) return false;
  if (isPropietario(authUser)) return true;

  const rolId = Number(authUser.rol_id);
  if (!Number.isInteger(rolId) || rolId <= 0) return false;

  const result = await query(
    `SELECT 1
     FROM public.permisos_rol
     WHERE rol_id = $1
       AND recurso = $2
       AND accion = $3
       AND habilitado = true
     LIMIT 1`,
    [rolId, recurso, accion]
  );
  return result.rowCount > 0;
}

export function requirePermission(recurso, accion) {
  return async (req, res, next) => {
    const user = req.authUser ?? getAuthUserFromRequest(req);
    if (!user?.id) return res.status(401).json({ error: 'No autorizado' });
    req.authUser = user;

    if (await hasPermission(user, recurso, accion)) {
      return next();
    }

    return res.status(403).json({
      error: `Acceso denegado: se requiere permiso ${recurso}.${accion}`,
    });
  };
}

export function requireAnyPermission(permissionPairs = []) {
  return async (req, res, next) => {
    const user = req.authUser ?? getAuthUserFromRequest(req);
    if (!user?.id) return res.status(401).json({ error: 'No autorizado' });
    req.authUser = user;

    for (const permission of permissionPairs) {
      if (permission && await hasPermission(user, permission.recurso, permission.accion)) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Acceso denegado' });
  };
}

export function getAuthUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return {
      id: userId,
      username: payload.username || null,
      correo: payload.correo || null,
      nombre: payload.nombre || null,
      apellido: payload.apellido || null,
      tipo: payload.tipo || null,
      rol_id: payload.rol_id || null,
      rol_nombre: payload.rol_nombre || null,
    };
  } catch {
    return null;
  }
}
