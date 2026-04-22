import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requirePropietario } from '../auth.js';

export const permisosRouter = Router();

// ── GET /api/permisos/roles ────────────────────────────────────────────────────
// Lista todos los roles disponibles
permisosRouter.get('/roles', requireAuth, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM public.roles ORDER BY es_sistema DESC, nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/permisos/roles ───────────────────────────────────────────────────
// Crea un nuevo rol (solo propietario)
permisosRouter.post('/roles', requireAuth, requirePropietario, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del rol es requerido' });
  try {
    const result = await query(
      'INSERT INTO public.roles (nombre, es_sistema) VALUES ($1, false) RETURNING *',
      [nombre.trim().toLowerCase()]
    );
    // Clonar permisos del rol 'vendedor' como punto de partida
    await query(`
      INSERT INTO public.permisos_rol (rol, recurso, accion, habilitado)
      SELECT $1, recurso, accion, habilitado
      FROM public.permisos_rol
      WHERE rol = 'vendedor'
      ON CONFLICT (rol, recurso, accion) DO NOTHING
    `, [nombre.trim().toLowerCase()]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/permisos/roles/:nombre ────────────────────────────────────────
// Elimina un rol personalizado (no puede eliminar roles de sistema)
permisosRouter.delete('/roles/:nombre', requireAuth, requirePropietario, async (req, res) => {
  const { nombre } = req.params;
  try {
    const rol = await query('SELECT * FROM public.roles WHERE nombre = $1', [nombre]);
    if (!rol.rows.length) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.rows[0].es_sistema) return res.status(400).json({ error: 'No se puede eliminar un rol del sistema' });
    await query('DELETE FROM public.permisos_rol WHERE rol = $1', [nombre]);
    await query('DELETE FROM public.roles WHERE nombre = $1', [nombre]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/permisos/:rol ─────────────────────────────────────────────────────
// Devuelve todos los permisos de un rol específico
permisosRouter.get('/:rol', requireAuth, async (req, res) => {
  const { rol } = req.params;
  try {
    const result = await query(
      'SELECT recurso, accion, habilitado FROM public.permisos_rol WHERE rol = $1',
      [rol]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/permisos/:rol ─────────────────────────────────────────────────────
// Actualiza múltiples permisos de un rol (solo propietario)
// Body: [{ recurso, accion, habilitado }, ...]
permisosRouter.put('/:rol', requireAuth, requirePropietario, async (req, res) => {
  const { rol } = req.params;
  const permisos = req.body;
  if (!Array.isArray(permisos)) return res.status(400).json({ error: 'Se espera un array de permisos' });
  try {
    for (const { recurso, accion, habilitado } of permisos) {
      await query(`
        INSERT INTO public.permisos_rol (rol, recurso, accion, habilitado)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (rol, recurso, accion) DO UPDATE SET habilitado = EXCLUDED.habilitado
      `, [rol, recurso, accion, habilitado]);
    }
    const result = await query(
      'SELECT recurso, accion, habilitado FROM public.permisos_rol WHERE rol = $1',
      [rol]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
