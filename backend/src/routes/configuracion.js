import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requirePropietario } from '../auth.js';

export const configuracionRouter = Router();

// ── EMPRESA ──────────────────────────────────────────────────────────────────

configuracionRouter.get('/empresa', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public.config_empresa LIMIT 1');
    res.json(result.rows[0] ?? {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

configuracionRouter.put('/empresa', requireAuth, requirePropietario, async (req, res) => {
  const {
    nombre, razon_social, rut, direccion, telefono, correo, website,
    logo_base64, fondo_base64,
    color_primary, color_primary_strong, color_primary_soft,
    color_menu_bg, color_menu_active,
    color_text, color_text_muted, color_menu_text,
    configurado,
  } = req.body;

  try {
    const existing = await query('SELECT id FROM public.config_empresa LIMIT 1');
    if (existing.rows.length === 0) {
      await query('INSERT INTO public.config_empresa (nombre) VALUES ($1)', [nombre ?? 'Mi Empresa']);
    }

    const result = await query(
      `UPDATE public.config_empresa SET
        nombre               = COALESCE($1, nombre),
        razon_social         = $2,
        rut                  = $3,
        direccion            = $4,
        telefono             = $5,
        correo               = $6,
        website              = $7,
        logo_base64          = CASE WHEN $8::text IS NULL THEN logo_base64 WHEN $8::text = '' THEN NULL ELSE $8::text END,
        color_primary        = COALESCE($9::varchar,  color_primary),
        color_primary_strong = COALESCE($10::varchar, color_primary_strong),
        color_primary_soft   = COALESCE($11::varchar, color_primary_soft),
        color_menu_bg        = COALESCE($12::varchar, color_menu_bg),
        color_menu_active    = COALESCE($13::varchar, color_menu_active),
        color_text           = COALESCE($14::varchar, color_text),
        color_text_muted     = COALESCE($15::varchar, color_text_muted),
        color_menu_text      = COALESCE($16::varchar, color_menu_text),
        fondo_base64         = CASE WHEN $17::text IS NULL THEN fondo_base64 WHEN $17::text = '' THEN '__none__' ELSE $17::text END,
        configurado          = CASE WHEN $18::boolean IS TRUE THEN true ELSE configurado END,
        updated_at           = now()
      WHERE id = (SELECT id FROM public.config_empresa LIMIT 1)
      RETURNING *`,
      [nombre, razon_social, rut, direccion, telefono, correo, website,
       logo_base64 ?? null,
       color_primary, color_primary_strong, color_primary_soft,
       color_menu_bg, color_menu_active,
       color_text, color_text_muted, color_menu_text,
       fondo_base64 === undefined ? null : (fondo_base64 === '' ? '' : (fondo_base64 ?? null)),
       configurado ?? null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MÓDULOS ───────────────────────────────────────────────────────────────────

configuracionRouter.get('/modulos', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM public.config_modulos ORDER BY orden ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

configuracionRouter.put('/modulos/:codigo', requireAuth, requirePropietario, async (req, res) => {
  const { codigo } = req.params;
  const { habilitado } = req.body;
  if (typeof habilitado !== 'boolean') {
    return res.status(400).json({ error: 'habilitado debe ser boolean' });
  }
  try {
    const result = await query(
      'UPDATE public.config_modulos SET habilitado = $1 WHERE codigo = $2 RETURNING *',
      [habilitado, codigo]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Módulo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GANANCIAS ─────────────────────────────────────────────────────────────────

configuracionRouter.get('/ganancias', requireAuth, async (req, res) => {
  try {
    const metodosRes = await query(
      'SELECT * FROM public.config_ganancias_metodos WHERE activo = true ORDER BY id'
    );
    const configRes = await query(`
      SELECT cg.id, cg.metodo_id, cg.updated_at, m.codigo AS metodo_codigo, m.label AS metodo_label
      FROM public.config_ganancias cg
      JOIN public.config_ganancias_metodos m ON m.id = cg.metodo_id
      LIMIT 1
    `);
    res.json({
      metodos: metodosRes.rows,
      config: configRes.rows[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

configuracionRouter.put('/ganancias', requireAuth, requirePropietario, async (req, res) => {
  const { metodo_id } = req.body;
  if (!metodo_id) return res.status(400).json({ error: 'metodo_id es requerido' });
  try {
    const metodoCheck = await query(
      'SELECT id FROM public.config_ganancias_metodos WHERE id = $1 AND activo = true',
      [metodo_id]
    );
    if (metodoCheck.rows.length === 0) return res.status(400).json({ error: 'Método no válido' });

    const existing = await query('SELECT id FROM public.config_ganancias LIMIT 1');
    let result;
    if (existing.rows.length === 0) {
      result = await query(
        'INSERT INTO public.config_ganancias (metodo_id) VALUES ($1) RETURNING *',
        [metodo_id]
      );
    } else {
      result = await query(
        'UPDATE public.config_ganancias SET metodo_id = $1, updated_at = now() WHERE id = (SELECT id FROM public.config_ganancias LIMIT 1) RETURNING *',
        [metodo_id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
