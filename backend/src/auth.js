import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function normalizeTipo(tipo) {
  const t = String(tipo || '').toLowerCase().trim();
  return t === 'propietario' || t === 'admin' ? 'propietario' : 'vendedor';
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
  if (normalizeTipo(user.tipo) !== 'propietario') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere propietario' });
  }
  req.authUser = user;
  return next();
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
    };
  } catch {
    return null;
  }
}
