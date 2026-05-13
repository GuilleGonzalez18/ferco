export function mapDbError(error) {
  const code = String(error?.code || '');
  const constraint = String(error?.constraint || '');
  const detail = String(error?.detail || '');

  if (code === '23505') {
    if (constraint === 'productos_ean_unique' || detail.includes('(ean)')) {
      return { status: 409, error: 'Ya existe el producto con ese codigo, validar' };
    }
    if (constraint === 'empaques_nombre_key') {
      return { status: 409, error: 'Ya existe un empaque con ese nombre' };
    }
    if (constraint === 'ux_usuarios_username') {
      return { status: 409, error: 'Ya existe un usuario con ese username' };
    }
    if (constraint === 'ux_usuarios_correo') {
      return { status: 409, error: 'Ya existe un usuario con ese correo' };
    }
    return { status: 409, error: 'Ya existe un registro con esos datos, validar' };
  }

  if (code === '23503') {
    return { status: 400, error: 'No se puede completar la operación por registros relacionados' };
  }

  return null;
}

export function logServerError(context, error) {
  const label = context ? `[${context}]` : '[server]';
  // eslint-disable-next-line no-console
  console.error(label, error);
}

export function sendServerError(
  res,
  error,
  { status = 500, fallback = 'Error interno del servidor', context = '' } = {}
) {
  logServerError(context, error);
  return res.status(status).json({ error: fallback });
}

export function sendDbError(res, error, fallback = 'No se pudo completar la operación') {
  const mapped = mapDbError(error);
  if (mapped) {
    return res.status(mapped.status).json({ error: mapped.error });
  }
  return sendServerError(res, error, { fallback, context: 'db' });
}
