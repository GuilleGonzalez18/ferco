import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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
    };
  } catch {
    return null;
  }
}
