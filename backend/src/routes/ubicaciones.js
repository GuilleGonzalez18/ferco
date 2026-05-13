import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest, requireAuth, requirePermission } from '../auth.js';
import { sendDbError } from '../dbErrors.js';

export const ubicacionesRouter = Router();
ubicacionesRouter.use(requireAuth);

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

// ── DEPARTAMENTOS ─────────────────────────────────────────────────────────────

ubicacionesRouter.get('/departamentos', requirePermission('clientes', 'ver'), async (_req, res) => {
  const result = await query(
    `SELECT id, nombre FROM public.departamentos ORDER BY nombre ASC`
  );
  return res.json(result.rows);
});

ubicacionesRouter.post('/departamentos', requirePermission('clientes', 'editar'), async (req, res) => {
  const { nombre } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();
  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const result = await query(
      `INSERT INTO public.departamentos (nombre) VALUES ($1) RETURNING id, nombre`,
      [safeNombre]
    );
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['departamento', result.rows[0].id, 'crear', `Departamento creado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear el departamento');
  }
});

ubicacionesRouter.put('/departamentos/:id', requirePermission('clientes', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const { nombre } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });
  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const result = await query(
      `UPDATE public.departamentos SET nombre = $1 WHERE id = $2 RETURNING id, nombre`,
      [safeNombre, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Departamento no encontrado' });
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['departamento', id, 'editar', `Departamento editado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar el departamento');
  }
});

ubicacionesRouter.delete('/departamentos/:id', requirePermission('clientes', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });

  const inUse = await query(
    `SELECT 1 FROM public.clientes WHERE departamento_id = $1 LIMIT 1`,
    [id]
  );
  if (inUse.rowCount) {
    return res.status(400).json({ error: 'No se puede eliminar un departamento con clientes asignados' });
  }
  const hasBarrios = await query(
    `SELECT 1 FROM public.barrios WHERE departamento_id = $1 LIMIT 1`,
    [id]
  );
  if (hasBarrios.rowCount) {
    return res.status(400).json({ error: 'No se puede eliminar un departamento con ciudades asignadas' });
  }

  const prev = await query(`SELECT nombre FROM public.departamentos WHERE id = $1`, [id]);
  const result = await query(`DELETE FROM public.departamentos WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Departamento no encontrado' });

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    ['departamento', id, 'eliminar', `Departamento eliminado: ${prev.rows[0]?.nombre || id}`, authUser?.id || null, actorName(authUser)]
  );
  return res.status(204).send();
});

// ── BARRIOS (Ciudades) ────────────────────────────────────────────────────────

ubicacionesRouter.get('/barrios', requirePermission('clientes', 'ver'), async (req, res) => {
  const depId = req.query.departamento_id ? Number(req.query.departamento_id) : null;
  let sql = `SELECT b.id, b.nombre, b.departamento_id, d.nombre AS departamento_nombre
             FROM public.barrios b
             LEFT JOIN public.departamentos d ON d.id = b.departamento_id`;
  const params = [];
  if (depId) {
    sql += ` WHERE b.departamento_id = $1`;
    params.push(depId);
  }
  sql += ` ORDER BY b.nombre ASC`;
  const result = await query(sql, params);
  return res.json(result.rows);
});

ubicacionesRouter.post('/barrios', requirePermission('clientes', 'editar'), async (req, res) => {
  const { nombre, departamento_id = null } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();
  const safeDepId = departamento_id ? Number(departamento_id) : null;

  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const result = await query(
      `INSERT INTO public.barrios (nombre, departamento_id) VALUES ($1, $2)
       RETURNING id, nombre, departamento_id`,
      [safeNombre, safeDepId]
    );
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['barrio', result.rows[0].id, 'crear', `Ciudad/Barrio creado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear la ciudad');
  }
});

ubicacionesRouter.put('/barrios/:id', requirePermission('clientes', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, departamento_id = null } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();
  const safeDepId = departamento_id ? Number(departamento_id) : null;

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });
  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const result = await query(
      `UPDATE public.barrios SET nombre = $1, departamento_id = $2 WHERE id = $3
       RETURNING id, nombre, departamento_id`,
      [safeNombre, safeDepId, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Ciudad no encontrada' });
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['barrio', id, 'editar', `Ciudad/Barrio editado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar la ciudad');
  }
});

ubicacionesRouter.delete('/barrios/:id', requirePermission('clientes', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });

  const inUse = await query(
    `SELECT 1 FROM public.clientes WHERE barrio_id = $1 LIMIT 1`,
    [id]
  );
  if (inUse.rowCount) {
    return res.status(400).json({ error: 'No se puede eliminar una ciudad con clientes asignados' });
  }

  const prev = await query(`SELECT nombre FROM public.barrios WHERE id = $1`, [id]);
  const result = await query(`DELETE FROM public.barrios WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Ciudad no encontrada' });

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    ['barrio', id, 'eliminar', `Ciudad/Barrio eliminado: ${prev.rows[0]?.nombre || id}`, authUser?.id || null, actorName(authUser)]
  );
  return res.status(204).send();
});
