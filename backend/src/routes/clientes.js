import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';

export const clientesRouter = Router();

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

clientesRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id
     FROM public.clientes
     ORDER BY id DESC`
  );
  res.json(result.rows);
});

clientesRouter.post('/', async (req, res) => {
  const {
    nombre,
    rut,
    direccion = null,
    telefono = null,
    correo = null,
    horario_apertura = null,
    horario_cierre = null,
    departamento_id = null,
    barrio_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);

  const result = await query(
    `INSERT INTO public.clientes
      (nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id`,
    [nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id]
  );
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'cliente',
      result.rows[0].id,
      'crear',
      `Cliente creado: ${result.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  res.status(201).json(result.rows[0]);
});

clientesRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    nombre,
    rut,
    direccion = null,
    telefono = null,
    correo = null,
    horario_apertura = null,
    horario_cierre = null,
    departamento_id = null,
    barrio_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);

  const result = await query(
    `UPDATE public.clientes
     SET nombre = $1,
         rut = $2,
         direccion = $3,
         telefono = $4,
         correo = $5,
         horario_apertura = $6,
         horario_cierre = $7,
         departamento_id = $8,
         barrio_id = $9
     WHERE id = $10
     RETURNING id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id`,
    [nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, departamento_id, barrio_id, id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Cliente no encontrado' });
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'cliente',
      id,
      'editar',
      `Cliente editado: ${result.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  return res.json(result.rows[0]);
});

clientesRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  const prev = await query(`SELECT id, nombre FROM public.clientes WHERE id = $1`, [id]);
  const result = await query(`DELETE FROM public.clientes WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Cliente no encontrado' });
  const nombre = prev.rows[0]?.nombre || `#${id}`;
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'cliente',
      id,
      'eliminar',
      `Cliente eliminado: ${nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  return res.status(204).send();
});
