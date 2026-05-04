import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';
import { sendDbError } from '../dbErrors.js';

export const tiposIvaRouter = Router();

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

tiposIvaRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, codigo, nombre, porcentaje, activo
     FROM public.tipos_iva
     WHERE activo = true
     ORDER BY porcentaje ASC, nombre ASC`
  );
  return res.json(result.rows);
});

tiposIvaRouter.post('/', async (req, res) => {
  const { codigo, nombre, porcentaje } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();
  const safeCodigo = Number(codigo);
  const safePorcentaje = Number(porcentaje ?? 0);

  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!Number.isInteger(safeCodigo) || safeCodigo < 1) return res.status(400).json({ error: 'Código IVA inválido' });
  if (isNaN(safePorcentaje) || safePorcentaje < 0) return res.status(400).json({ error: 'Porcentaje inválido' });

  try {
    const result = await query(
      `INSERT INTO public.tipos_iva (codigo, nombre, porcentaje, activo)
       VALUES ($1, $2, $3, true)
       RETURNING id, codigo, nombre, porcentaje, activo`,
      [safeCodigo, safeNombre, safePorcentaje]
    );
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['tipo_iva', result.rows[0].id, 'crear', `Tipo IVA creado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear el tipo de IVA');
  }
});

tiposIvaRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, porcentaje } = req.body || {};
  const authUser = getAuthUserFromRequest(req);
  const safeNombre = String(nombre || '').trim();
  const safePorcentaje = Number(porcentaje ?? 0);

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });
  if (!safeNombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (isNaN(safePorcentaje) || safePorcentaje < 0) return res.status(400).json({ error: 'Porcentaje inválido' });

  try {
    const result = await query(
      `UPDATE public.tipos_iva SET nombre = $1, porcentaje = $2 WHERE id = $3
       RETURNING id, codigo, nombre, porcentaje, activo`,
      [safeNombre, safePorcentaje, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Tipo de IVA no encontrado' });
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      ['tipo_iva', id, 'editar', `Tipo IVA editado: ${safeNombre}`, authUser?.id || null, actorName(authUser)]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar el tipo de IVA');
  }
});

tiposIvaRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Id inválido' });

  const inUse = await query(`SELECT 1 FROM public.productos WHERE iva_id = $1 LIMIT 1`, [id]);
  if (inUse.rowCount) return res.status(400).json({ error: 'No se puede eliminar un tipo de IVA en uso por productos' });

  const result = await query(
    `UPDATE public.tipos_iva SET activo = false WHERE id = $1 RETURNING id, nombre`,
    [id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Tipo de IVA no encontrado' });

  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    ['tipo_iva', id, 'eliminar', `Tipo IVA eliminado: ${result.rows[0].nombre}`, authUser?.id || null, actorName(authUser)]
  );
  return res.status(204).send();
});
