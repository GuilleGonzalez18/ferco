import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';
import { sendDbError } from '../dbErrors.js';

export const clientesRouter = Router();

function normalizeHora(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function toMinutes(hora) {
  if (!hora) return null;
  const [h, m] = String(hora).split(':').map((v) => Number(v));
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return (h * 60) + m;
}

function normalizeHorariosPayload(payload = {}) {
  const horario_apertura = normalizeHora(payload.horario_apertura);
  const horario_cierre = normalizeHora(payload.horario_cierre);
  const tiene_reapertura = Boolean(payload.tiene_reapertura);
  let horario_reapertura = normalizeHora(payload.horario_reapertura);
  let horario_cierre_reapertura = normalizeHora(payload.horario_cierre_reapertura);

  if ((payload.horario_apertura && !horario_apertura) || (payload.horario_cierre && !horario_cierre)) {
    return { error: 'Formato de horario principal inválido. Usa HH:MM' };
  }
  if (horario_apertura && horario_cierre && toMinutes(horario_apertura) >= toMinutes(horario_cierre)) {
    return { error: 'El horario de apertura debe ser menor al horario de cierre' };
  }

  if (!tiene_reapertura) {
    horario_reapertura = null;
    horario_cierre_reapertura = null;
  } else {
    if (!horario_apertura || !horario_cierre) {
      return { error: 'Si el cliente tiene reapertura, también debes completar apertura y cierre principal' };
    }
    if (!horario_reapertura || !horario_cierre_reapertura) {
      return { error: 'Si el cliente tiene reapertura debes completar ambos horarios de reapertura' };
    }
    if (toMinutes(horario_reapertura) >= toMinutes(horario_cierre_reapertura)) {
      return { error: 'El horario de reapertura debe ser menor al cierre de reapertura' };
    }
    if (horario_cierre && toMinutes(horario_reapertura) <= toMinutes(horario_cierre)) {
      return { error: 'La reapertura debe comenzar después del cierre del horario principal' };
    }
  }

  return {
    horario_apertura,
    horario_cierre,
    tiene_reapertura,
    horario_reapertura,
    horario_cierre_reapertura,
  };
}

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

clientesRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre,
            tiene_reapertura, horario_reapertura, horario_cierre_reapertura,
            departamento_id, barrio_id
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
    tiene_reapertura = false,
    horario_reapertura = null,
    horario_cierre_reapertura = null,
    departamento_id = null,
    barrio_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const horarios = normalizeHorariosPayload({
    horario_apertura,
    horario_cierre,
    tiene_reapertura,
    horario_reapertura,
    horario_cierre_reapertura,
  });
  if (horarios?.error) return res.status(400).json({ error: horarios.error });

  try {
    const result = await query(
      `INSERT INTO public.clientes
        (nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre, tiene_reapertura, horario_reapertura, horario_cierre_reapertura, departamento_id, barrio_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre,
                 tiene_reapertura, horario_reapertura, horario_cierre_reapertura,
                 departamento_id, barrio_id`,
      [
        nombre,
        rut,
        direccion,
        telefono,
        correo,
        horarios.horario_apertura,
        horarios.horario_cierre,
        horarios.tiene_reapertura,
        horarios.horario_reapertura,
        horarios.horario_cierre_reapertura,
        departamento_id,
        barrio_id,
      ]
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
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear el cliente');
  }
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
    tiene_reapertura = false,
    horario_reapertura = null,
    horario_cierre_reapertura = null,
    departamento_id = null,
    barrio_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const horarios = normalizeHorariosPayload({
    horario_apertura,
    horario_cierre,
    tiene_reapertura,
    horario_reapertura,
    horario_cierre_reapertura,
  });
  if (horarios?.error) return res.status(400).json({ error: horarios.error });

  try {
    const result = await query(
      `UPDATE public.clientes
       SET nombre = $1,
           rut = $2,
           direccion = $3,
           telefono = $4,
           correo = $5,
           horario_apertura = $6,
           horario_cierre = $7,
           tiene_reapertura = $8,
           horario_reapertura = $9,
           horario_cierre_reapertura = $10,
           departamento_id = $11,
           barrio_id = $12
       WHERE id = $13
       RETURNING id, nombre, rut, direccion, telefono, correo, horario_apertura, horario_cierre,
                 tiene_reapertura, horario_reapertura, horario_cierre_reapertura,
                 departamento_id, barrio_id`,
      [
        nombre,
        rut,
        direccion,
        telefono,
        correo,
        horarios.horario_apertura,
        horarios.horario_cierre,
        horarios.tiene_reapertura,
        horarios.horario_reapertura,
        horarios.horario_cierre_reapertura,
        departamento_id,
        barrio_id,
        id,
      ]
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
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar el cliente');
  }
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
