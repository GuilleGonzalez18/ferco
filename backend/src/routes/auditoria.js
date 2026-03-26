import { Router } from 'express';
import { query } from '../db.js';

export const auditoriaRouter = Router();

function parseDateRange(req, res) {
  const { desde, hasta } = req.query;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (desde && !dateRegex.test(String(desde))) {
    res.status(400).json({ error: 'Formato de fecha inválido en "desde". Usa YYYY-MM-DD' });
    return null;
  }
  if (hasta && !dateRegex.test(String(hasta))) {
    res.status(400).json({ error: 'Formato de fecha inválido en "hasta". Usa YYYY-MM-DD' });
    return null;
  }
  return { desde: desde || null, hasta: hasta || null };
}

auditoriaRouter.get('/eventos', async (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) return;

  const result = await query(
    `SELECT a.id, a.entidad, a.entidad_id, a.accion, a.detalle, a.usuario_id,
            COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, ''))), ''),
              a.usuario_nombre
            ) AS usuario_nombre,
            a.created_at
     FROM public.auditoria_eventos a
     LEFT JOIN public.usuarios u ON u.id = a.usuario_id
     WHERE ($1::date IS NULL OR DATE(a.created_at) >= $1::date)
       AND ($2::date IS NULL OR DATE(a.created_at) <= $2::date)
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT 1200`,
    [range.desde, range.hasta]
  );
  return res.json(result.rows);
});

auditoriaRouter.get('/movimientos-stock', async (req, res) => {
  const range = parseDateRange(req, res);
  if (!range) return;

  const result = await query(
    `SELECT m.id, m.producto_id, m.producto_nombre, m.tipo, m.origen, m.cantidad,
            m.stock_anterior, m.stock_nuevo, m.referencia_tipo, m.referencia_id,
            m.detalle, m.usuario_id,
            COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, ''))), ''),
              m.usuario_nombre
            ) AS usuario_nombre,
            m.created_at
     FROM public.movimientos_stock m
     LEFT JOIN public.usuarios u ON u.id = m.usuario_id
     WHERE ($1::date IS NULL OR DATE(m.created_at) >= $1::date)
       AND ($2::date IS NULL OR DATE(m.created_at) <= $2::date)
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 2000`,
    [range.desde, range.hasta]
  );
  return res.json(result.rows);
});
