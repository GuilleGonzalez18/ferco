import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';

export const empaquesRouter = Router();

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
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
  const { nombre } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();

  if (!safeNombre) {
    return res.status(400).json({ error: 'El nombre del empaque es obligatorio' });
  }

  try {
    const result = await query(
      `INSERT INTO public.empaques (nombre, activo)
       VALUES ($1, true)
       RETURNING id, nombre, activo, created_at`,
      [safeNombre]
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
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un empaque con ese nombre' });
    }
    return res.status(400).json({ error: error.message });
  }
});

empaquesRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { nombre } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de empaque inválido' });
  }
  if (!safeNombre) {
    return res.status(400).json({ error: 'El nombre del empaque es obligatorio' });
  }

  try {
    const result = await query(
      `UPDATE public.empaques
       SET nombre = $1
       WHERE id = $2
       RETURNING id, nombre, activo, created_at`,
      [safeNombre, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Empaque no encontrado' });
    }

    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'empaque',
        id,
        'editar',
        `Empaque editado: ${result.rows[0].nombre}`,
        authUser?.id || null,
        actorName(authUser),
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un empaque con ese nombre' });
    }
    return res.status(400).json({ error: error.message });
  }
});

empaquesRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de empaque inválido' });
  }

  const inUse = await query(
    `SELECT 1
     FROM public.productos
     WHERE empaque_id = $1
     LIMIT 1`,
    [id]
  );
  if (inUse.rowCount) {
    return res.status(400).json({ error: 'No se puede eliminar un empaque en uso por productos' });
  }

  const result = await query(
    `UPDATE public.empaques
     SET activo = false
     WHERE id = $1
     RETURNING id, nombre, activo, created_at`,
    [id]
  );
  if (!result.rowCount) {
    return res.status(404).json({ error: 'Empaque no encontrado' });
  }

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'empaque',
      id,
      'eliminar',
      `Empaque desactivado: ${result.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.status(204).send();
});
