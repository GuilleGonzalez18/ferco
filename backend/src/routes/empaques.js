import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';

export const empaquesRouter = Router();

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

function canManageEmpaques(authUser) {
  const tipo = String(authUser?.tipo || '').toLowerCase();
  return tipo === 'propietario' || tipo === 'vendedor';
}

empaquesRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, activo, created_at
     FROM public.empaques
     WHERE activo = true
     ORDER BY nombre ASC`
  );
  return res.json(result.rows);
});

empaquesRouter.post('/', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!canManageEmpaques(authUser)) {
    return res.status(403).json({ error: 'No autorizado para crear empaques' });
  }

  const nombre = String(req.body?.nombre || '').trim();
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre de empaque requerido' });
  }

  const existing = await query(
    `SELECT id FROM public.empaques WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
    [nombre]
  );
  if (existing.rowCount) {
    return res.status(409).json({ error: 'Ya existe un empaque con ese nombre' });
  }

  const result = await query(
    `INSERT INTO public.empaques (nombre, activo)
     VALUES ($1, true)
     RETURNING id, nombre, activo, created_at`,
    [nombre]
  );

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'empaque',
      result.rows[0].id,
      'crear',
      `Empaque creado: ${result.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.status(201).json(result.rows[0]);
});

empaquesRouter.put('/:id', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!canManageEmpaques(authUser)) {
    return res.status(403).json({ error: 'No autorizado para editar empaques' });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de empaque inválido' });
  }

  const nombre = String(req.body?.nombre || '').trim();
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre de empaque requerido' });
  }

  const current = await query(`SELECT id, nombre FROM public.empaques WHERE id = $1`, [id]);
  if (!current.rowCount) {
    return res.status(404).json({ error: 'Empaque no encontrado' });
  }

  const duplicated = await query(
    `SELECT id FROM public.empaques WHERE LOWER(nombre) = LOWER($1) AND id <> $2 LIMIT 1`,
    [nombre, id]
  );
  if (duplicated.rowCount) {
    return res.status(409).json({ error: 'Ya existe un empaque con ese nombre' });
  }

  const result = await query(
    `UPDATE public.empaques
     SET nombre = $1
     WHERE id = $2
     RETURNING id, nombre, activo, created_at`,
    [nombre, id]
  );

  await query(
    `UPDATE public.productos
     SET empaque = $1
     WHERE empaque_id = $2`,
    [nombre, id]
  );

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'empaque',
      id,
      'editar',
      `Empaque editado: ${current.rows[0].nombre} -> ${nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.json(result.rows[0]);
});

empaquesRouter.delete('/:id', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!canManageEmpaques(authUser)) {
    return res.status(403).json({ error: 'No autorizado para eliminar empaques' });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de empaque inválido' });
  }

  const current = await query(`SELECT id, nombre FROM public.empaques WHERE id = $1`, [id]);
  if (!current.rowCount) {
    return res.status(404).json({ error: 'Empaque no encontrado' });
  }

  const used = await query(
    `SELECT COUNT(*)::int AS count
     FROM public.productos
     WHERE empaque_id = $1`,
    [id]
  );
  if (Number(used.rows[0]?.count || 0) > 0) {
    return res.status(409).json({ error: 'No se puede eliminar: hay productos que usan este empaque' });
  }

  await query(`DELETE FROM public.empaques WHERE id = $1`, [id]);

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'empaque',
      id,
      'eliminar',
      `Empaque eliminado: ${current.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.status(204).send();
});
