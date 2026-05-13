import { Router } from 'express';
import { query } from '../db.js';
import { isPropietario, requireAuth, requirePropietario } from '../auth.js';
import { sendServerError } from '../dbErrors.js';
import {
  firstError, respondIfInvalid,
  validateRequired, validateMaxLength, validateBoolean, validateIdentifier, validateArray,
} from '../middleware/validate.js';

export const permisosRouter = Router();

// ── GET /api/permisos/roles ────────────────────────────────────────────────────
permisosRouter.get('/roles', requireAuth, requirePropietario, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM public.roles ORDER BY es_sistema DESC, nombre ASC');
    res.json(result.rows);
  } catch (err) {
    return sendServerError(res, err, {
      fallback: 'No se pudieron obtener los roles',
      context: 'permisos.getRoles',
    });
  }
});

// ── POST /api/permisos/roles ───────────────────────────────────────────────────
permisosRouter.post('/roles', requireAuth, requirePropietario, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del rol es requerido' });
  try {
    const result = await query(
      'INSERT INTO public.roles (nombre, es_sistema) VALUES ($1, false) RETURNING *',
      [nombre.trim().toLowerCase()]
    );
    const nuevoRolId = result.rows[0].id;
    // Clonar permisos del rol 'vendedor' como punto de partida
    const vendedorQ = await query('SELECT id FROM public.roles WHERE nombre = $1 LIMIT 1', ['vendedor']);
    const vendedorId = vendedorQ.rows[0]?.id;
    if (vendedorId) {
      await query(`
        INSERT INTO public.permisos_rol (rol_id, recurso, accion, habilitado)
        SELECT $1, recurso, accion, habilitado
        FROM public.permisos_rol
        WHERE rol_id = $2
        ON CONFLICT (rol_id, recurso, accion) DO NOTHING
      `, [nuevoRolId, vendedorId]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    return sendServerError(res, err, {
      fallback: 'No se pudo crear el rol',
      context: 'permisos.postRoles',
    });
  }
});

// ── DELETE /api/permisos/roles/:id ────────────────────────────────────────────
permisosRouter.delete('/roles/:id', requireAuth, requirePropietario, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id <= 0) return res.status(400).json({ error: 'ID de rol inválido' });
  try {
    const rol = await query('SELECT * FROM public.roles WHERE id = $1', [id]);
    if (!rol.rows.length) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.rows[0].es_sistema) return res.status(400).json({ error: 'No se puede eliminar un rol del sistema' });
    // Mover usuarios de ese rol a vendedor
    const vendedorQ = await query('SELECT id FROM public.roles WHERE nombre = $1 LIMIT 1', ['vendedor']);
    const vendedorId = vendedorQ.rows[0]?.id ?? null;
    await query('UPDATE public.usuarios SET rol_id = $1 WHERE rol_id = $2', [vendedorId, id]);
    // Los permisos se eliminan en cascada por el FK ON DELETE CASCADE
    await query('DELETE FROM public.roles WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    return sendServerError(res, err, {
      fallback: 'No se pudo eliminar el rol',
      context: 'permisos.deleteRol',
    });
  }
});

// ── GET /api/permisos/:rolId ───────────────────────────────────────────────────
permisosRouter.get('/:rolId', requireAuth, async (req, res) => {
  const rolId = parseInt(req.params.rolId, 10);
  if (!rolId || rolId <= 0) return res.status(400).json({ error: 'ID de rol inválido' });
  const authUser = req.authUser;
  if (!isPropietario(authUser) && Number(authUser?.rol_id) !== rolId) {
    return res.status(403).json({ error: 'No autorizado para consultar permisos de otro rol' });
  }
  try {
    const result = await query(
      'SELECT recurso, accion, habilitado FROM public.permisos_rol WHERE rol_id = $1',
      [rolId]
    );
    res.json(result.rows);
  } catch (err) {
    return sendServerError(res, err, {
      fallback: 'No se pudieron obtener los permisos del rol',
      context: 'permisos.getRol',
    });
  }
});

// ── PUT /api/permisos/:rolId ───────────────────────────────────────────────────
// Body: [{ recurso, accion, habilitado }, ...]
permisosRouter.put('/:rolId', requireAuth, requirePropietario, async (req, res) => {
  const rolId = parseInt(req.params.rolId, 10);
  if (!rolId || rolId <= 0) return res.status(400).json({ error: 'ID de rol inválido' });
  const permisos = req.body;
  if (!Array.isArray(permisos)) return res.status(400).json({ error: 'Se espera un array de permisos' });

  const arraySizeErr = validateArray(permisos, 'Permisos', { min: 0, max: 500 });
  if (respondIfInvalid(res, arraySizeErr)) return;

  for (let i = 0; i < permisos.length; i++) {
    const { recurso, accion, habilitado } = permisos[i] ?? {};
    const itemErr = firstError(
      validateRequired(recurso, `permisos[${i}].recurso`),
      validateMaxLength(recurso, 50, `permisos[${i}].recurso`),
      validateIdentifier(recurso, `permisos[${i}].recurso`),
      validateRequired(accion, `permisos[${i}].accion`),
      validateMaxLength(accion, 50, `permisos[${i}].accion`),
      validateIdentifier(accion, `permisos[${i}].accion`),
      validateBoolean(habilitado, `permisos[${i}].habilitado`),
    );
    if (respondIfInvalid(res, itemErr)) return;
  }
  try {
    const rolQ = await query('SELECT id FROM public.roles WHERE id = $1', [rolId]);
    if (!rolQ.rows.length) return res.status(404).json({ error: 'Rol no encontrado' });
    for (const { recurso, accion, habilitado } of permisos) {
      await query(`
        INSERT INTO public.permisos_rol (rol_id, recurso, accion, habilitado)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (rol_id, recurso, accion) DO UPDATE SET habilitado = EXCLUDED.habilitado
      `, [rolId, recurso, accion, habilitado]);
    }
    const result = await query(
      'SELECT recurso, accion, habilitado FROM public.permisos_rol WHERE rol_id = $1',
      [rolId]
    );
    res.json(result.rows);
  } catch (err) {
    return sendServerError(res, err, {
      fallback: 'No se pudieron actualizar los permisos del rol',
      context: 'permisos.putRol',
    });
  }
});

