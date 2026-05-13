import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requirePermission } from '../auth.js';

export const auditoriaRouter = Router();
auditoriaRouter.use(requireAuth);

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

function parseStockSeriesRange(req, res) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toIsoDate(today);

  const desdeRaw = req.query.desde ? String(req.query.desde) : '';
  const hastaRaw = req.query.hasta ? String(req.query.hasta) : '';
  const hasta = hastaRaw
    ? (hastaRaw > todayIso ? todayIso : hastaRaw)
    : todayIso;

  const defaultDesde = new Date(today);
  defaultDesde.setDate(defaultDesde.getDate() - 29);
  const desde = desdeRaw || toIsoDate(defaultDesde);

  if (!dateRegex.test(desde)) {
    res.status(400).json({ error: 'Formato de fecha inválido en "desde". Usa YYYY-MM-DD' });
    return null;
  }
  if (!dateRegex.test(hasta)) {
    res.status(400).json({ error: 'Formato de fecha inválido en "hasta". Usa YYYY-MM-DD' });
    return null;
  }
  if (desde > hasta) {
    res.status(400).json({ error: '"desde" no puede ser mayor que "hasta"' });
    return null;
  }

  const desdeDate = new Date(`${desde}T00:00:00`);
  const hastaDate = new Date(`${hasta}T00:00:00`);
  const diffMs = hastaDate.getTime() - desdeDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000) + 1;
  if (diffDays > 730) {
    res.status(400).json({ error: 'El rango máximo permitido es de 730 días' });
    return null;
  }

  return { desde, hasta, todayIso };
}

auditoriaRouter.get('/eventos', requirePermission('auditoria', 'ver'), async (req, res) => {
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

auditoriaRouter.get('/stock-costo-serie', requirePermission('auditoria', 'ver'), async (req, res) => {
  const range = parseStockSeriesRange(req, res);
  if (!range) return;
  const { desde, hasta, todayIso } = range;

  const productosResult = await query(
    `SELECT id, COALESCE(stock, 0)::numeric AS stock, ROUND(COALESCE(costo, 0))::int AS costo
     FROM public.productos`
  );

  const costoPorProducto = new Map();
  const stockPorProducto = new Map();
  let totalCostoActual = 0;

  for (const p of productosResult.rows) {
    const id = Number(p.id);
    const costo = Number(p.costo || 0);
    const stock = Number(p.stock || 0);
    costoPorProducto.set(id, costo);
    stockPorProducto.set(id, stock);
    totalCostoActual += stock * costo;
  }

  const movimientosResult = await query(
    `SELECT producto_id, DATE(created_at)::text AS fecha,
            SUM(COALESCE(stock_nuevo, 0) - COALESCE(stock_anterior, 0))::numeric AS delta
     FROM public.movimientos_stock
     WHERE DATE(created_at) > $1::date
       AND DATE(created_at) <= $2::date
     GROUP BY producto_id, DATE(created_at)`,
    [desde, todayIso]
  );

  const deltasPorDia = new Map();
  for (const row of movimientosResult.rows) {
    const fecha = String(row.fecha).slice(0, 10);
    const productoId = Number(row.producto_id);
    const delta = Number(row.delta || 0);
    const list = deltasPorDia.get(fecha) || [];
    list.push({ productoId, delta });
    deltasPorDia.set(fecha, list);
  }

  const totalPorDia = new Map();
  let total = totalCostoActual;
  const today = new Date(`${todayIso}T00:00:00`);
  const desdeDate = new Date(`${desde}T00:00:00`);
  totalPorDia.set(todayIso, Math.round(total));

  for (let cursor = new Date(today); cursor.getTime() > desdeDate.getTime();) {
    const diaKey = toIsoDate(cursor);
    const deltasDia = deltasPorDia.get(diaKey) || [];
    for (const d of deltasDia) {
      const costo = Number(costoPorProducto.get(d.productoId) || 0);
      const stockActual = Number(stockPorProducto.get(d.productoId) || 0);
      stockPorProducto.set(d.productoId, stockActual - d.delta);
      total -= d.delta * costo;
    }
    cursor.setDate(cursor.getDate() - 1);
    totalPorDia.set(toIsoDate(cursor), Math.round(total));
  }

  const hastaDate = new Date(`${hasta}T00:00:00`);
  const serie = [];
  for (let cursor = new Date(desdeDate); cursor.getTime() <= hastaDate.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const fecha = toIsoDate(cursor);
    serie.push({
      fecha,
      total_costo: Math.round(Number(totalPorDia.get(fecha) || 0)),
    });
  }

  return res.json({ desde, hasta, serie });
});

auditoriaRouter.get('/movimientos-stock', requirePermission('auditoria', 'ver'), async (req, res) => {
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
