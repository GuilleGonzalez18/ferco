import { Router } from 'express';
import { pool } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';
import { sendMail } from '../mailer.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}


function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

export const ventasRouter = Router();
const ESTADOS_ENTREGA = new Set(['pendiente', 'entregado', 'cancelado']);
const MEDIOS_PAGO = new Set(['credito', 'debito', 'efectivo', 'transferencia']);
const ACTIVE_SALES_CONDITION = 'v.cancelada = false AND COALESCE(v.eliminada, false) = false';

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

async function restoreVentaStock(client, ventaId, authUser, origen, detalleMovimiento) {
  const detalleQ = await client.query(
    `SELECT vd.producto_id, vd.cantidad, p.nombre AS producto_nombre, p.stock
     FROM public.venta_detalle vd
     INNER JOIN public.productos p ON p.id = vd.producto_id
     WHERE vd.venta_id = $1
     ORDER BY vd.id ASC
     FOR UPDATE OF p`,
    [ventaId]
  );

  for (const row of detalleQ.rows) {
    const productoId = Number(row.producto_id);
    const cantidad = Math.max(0, Math.floor(toNumber(row.cantidad)));
    if (!cantidad) continue;
    const stockAnterior = Number(row.stock || 0);
    const stockNuevo = stockAnterior + cantidad;

    await client.query(
      `UPDATE public.productos
       SET stock = $1
       WHERE id = $2`,
      [stockNuevo, productoId]
    );

    await client.query(
      `INSERT INTO public.movimientos_stock
        (producto_id, producto_nombre, tipo, origen, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        productoId,
        row.producto_nombre || null,
        'entrada',
        origen,
        cantidad,
        stockAnterior,
        stockNuevo,
        'venta',
        ventaId,
        detalleMovimiento,
        authUser?.id || null,
        actorName(authUser),
      ]
    );
  }
}

function normalizePaymentMethods(pagos = []) {
  const list = Array.isArray(pagos) ? pagos : [];
  if (!list.length) return [];
  return list.map((p) => {
    const medioPago = String(p?.medio_pago || '').trim().toLowerCase();
    const monto = roundMoney(p?.monto);
    if (!MEDIOS_PAGO.has(medioPago)) {
      throw new Error('Medio de pago inválido');
    }
    if (monto <= 0) {
      throw new Error('Monto de pago inválido');
    }
    return { medio_pago: medioPago, monto };
  });
}

function normalizeTipo(tipo) {
  const value = String(tipo || '').trim().toLowerCase();
  if (value === 'admin' || value === 'propietario') return 'propietario';
  return 'vendedor';
}

function calcGrowthPercent(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

function isValidEmail(value) {
  const v = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getDateRangeByPeriod(baseDateInput, period) {
  const safeBase = baseDateInput ? new Date(`${baseDateInput}T00:00:00`) : new Date();
  if (Number.isNaN(safeBase.getTime())) return null;
  safeBase.setHours(0, 0, 0, 0);

  if (period === 'dia') {
    const iso = toIsoDate(safeBase);
    return { desde: iso, hasta: iso };
  }

  if (period === 'manana') {
    const nextDay = new Date(safeBase);
    nextDay.setDate(safeBase.getDate() + 1);
    const iso = toIsoDate(nextDay);
    return { desde: iso, hasta: iso };
  }

  if (period === 'semana') {
    const weekStart = new Date(safeBase);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return { desde: toIsoDate(weekStart), hasta: toIsoDate(weekEnd) };
  }

  if (period === 'mes') {
    const monthStart = new Date(safeBase.getFullYear(), safeBase.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(safeBase.getFullYear(), safeBase.getMonth() + 1, 0);
    monthEnd.setHours(0, 0, 0, 0);
    return { desde: toIsoDate(monthStart), hasta: toIsoDate(monthEnd) };
  }

  return null;
}

ventasRouter.get('/dashboard/resumen', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const esPropietario = normalizeTipo(authUser.tipo) === 'propietario';
  const userClauseVentas = esPropietario ? '' : 'AND v.usuario_id = $1';
  const userParams = esPropietario ? [] : [Number(authUser.id)];

  const ventasHoyQ = await pool.query(
    `SELECT COALESCE(SUM(v.total), 0) AS total,
            COUNT(*) AS cantidad
     FROM public.ventas v
     WHERE ${ACTIVE_SALES_CONDITION}
       AND v.fecha >= CURRENT_DATE
       AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
       ${userClauseVentas}`,
    userParams
  );

  const ventasMesQ = await pool.query(
    `SELECT COALESCE(SUM(v.total), 0) AS total,
            COUNT(*) AS cantidad
     FROM public.ventas v
     WHERE ${ACTIVE_SALES_CONDITION}
       AND v.fecha >= date_trunc('month', CURRENT_DATE)
       AND v.fecha < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
       ${userClauseVentas}`,
    userParams
  );

  const promedioMensualCantidadQ = await pool.query(
    `SELECT COALESCE(AVG(m.cantidad), 0) AS promedio
     FROM (
       SELECT months.mes, COUNT(v.id) AS cantidad
       FROM generate_series(
              date_trunc('month', CURRENT_DATE) - INTERVAL '5 month',
              date_trunc('month', CURRENT_DATE),
              INTERVAL '1 month'
            ) AS months(mes)
        LEFT JOIN public.ventas v
          ON ${ACTIVE_SALES_CONDITION}
         AND date_trunc('month', v.fecha) = months.mes
         ${userClauseVentas}
       GROUP BY months.mes
     ) m`,
    userParams
  );

  const ventasHoy = Number(ventasHoyQ.rows[0]?.total || 0);
  const cantidadVentasHoy = Number(ventasHoyQ.rows[0]?.cantidad || 0);
  const ventasMes = Number(ventasMesQ.rows[0]?.total || 0);
  const cantidadVentasMes = Number(ventasMesQ.rows[0]?.cantidad || 0);
  const promedioVentasMensual = Number(promedioMensualCantidadQ.rows[0]?.promedio || 0);

  if (!esPropietario) {
    return res.json({
      scope: 'vendedor',
      ventasHoy,
      ventasMes,
      cantidadVentasHoy,
      cantidadVentasMes,
      promedioVentasMensual,
    });
  }

  const costoHoyQ = await pool.query(
    `SELECT COALESCE(SUM(vd.cantidad * COALESCE(p.costo, 0)), 0) AS total
     FROM public.venta_detalle vd
     INNER JOIN public.ventas v ON v.id = vd.venta_id
     LEFT JOIN public.productos p ON p.id = vd.producto_id
     WHERE ${ACTIVE_SALES_CONDITION}
       AND v.fecha >= CURRENT_DATE
       AND v.fecha < CURRENT_DATE + INTERVAL '1 day'`
  );
  const ventasTotalEmpresaQ = await pool.query(
     `SELECT COALESCE(SUM(v.total), 0) AS total
      FROM public.ventas v
      WHERE ${ACTIVE_SALES_CONDITION}`
  );
  const costoTotalEmpresaQ = await pool.query(
     `SELECT COALESCE(SUM(vd.cantidad * COALESCE(p.costo, 0)), 0) AS total
      FROM public.venta_detalle vd
      INNER JOIN public.ventas v ON v.id = vd.venta_id
      LEFT JOIN public.productos p ON p.id = vd.producto_id
      WHERE ${ACTIVE_SALES_CONDITION}`
  );

  const costoHoy = Number(costoHoyQ.rows[0]?.total || 0);
  const ventasTotalEmpresa = Number(ventasTotalEmpresaQ.rows[0]?.total || 0);
  const costoTotalEmpresa = Number(costoTotalEmpresaQ.rows[0]?.total || 0);

  return res.json({
    scope: 'propietario',
    ventasHoy,
    ventasMes,
    cantidadVentasHoy,
    cantidadVentasMes,
    promedioVentasMensual,
    gananciaHoy: ventasHoy - costoHoy,
    gananciaTotalEmpresa: ventasTotalEmpresa - costoTotalEmpresa,
  });
});

ventasRouter.get('/estadisticas/resumen', async (req, res) => {
  const { desde, hasta, usuarioId } = req.query;
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const esPropietario = normalizeTipo(authUser.tipo) === 'propietario';
  const targetUsuarioId = esPropietario && usuarioId ? Number(usuarioId) : Number(authUser.id);

  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(String(desde))) {
    return res.status(400).json({ error: 'Formato de fecha "desde" inválido. Usa YYYY-MM-DD' });
  }
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(String(hasta))) {
    return res.status(400).json({ error: 'Formato de fecha "hasta" inválido. Usa YYYY-MM-DD' });
  }
  if (desde && hasta && String(desde) > String(hasta)) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser mayor que "hasta"' });
  }
  if (!Number.isInteger(targetUsuarioId) || targetUsuarioId <= 0) {
    return res.status(400).json({ error: 'usuarioId inválido' });
  }

  if (esPropietario && usuarioId) {
    const vendedorExisteQ = await pool.query(
      `SELECT id
       FROM public.usuarios
       WHERE id = $1
       LIMIT 1`,
      [targetUsuarioId]
    );
    if (!vendedorExisteQ.rowCount) {
      return res.status(404).json({ error: 'Usuario no encontrado para el filtro' });
    }
  }

  const fechaDesde = desde || null;
  const fechaHasta = hasta || null;
  const userParams = [fechaDesde, fechaHasta];
  const personalParams = [fechaDesde, fechaHasta, targetUsuarioId];
  const userClauseVentas = esPropietario ? '' : 'AND v.usuario_id = $3';
  if (!esPropietario) {
    userParams.push(Number(authUser.id));
  }
  const whereVentas = `WHERE ${ACTIVE_SALES_CONDITION}
    AND DATE(v.fecha) BETWEEN COALESCE($1::date, DATE(v.fecha)) AND COALESCE($2::date, DATE(v.fecha))
    ${userClauseVentas}`;
  const wherePersonalVentas = `WHERE ${ACTIVE_SALES_CONDITION}
    AND DATE(v.fecha) BETWEEN COALESCE($1::date, DATE(v.fecha)) AND COALESCE($2::date, DATE(v.fecha))
    AND v.usuario_id = $3`;

  const [mejorClienteQ, mayorVentaQ, promedioVentaQ, articuloMasVendidoQ, serieVentasBaseQ] = await Promise.all([
    pool.query(
      `SELECT
         c.id,
         c.nombre,
         COUNT(v.id) AS cantidad_ventas,
         COALESCE(SUM(v.total), 0) AS total_comprado
       FROM public.ventas v
       LEFT JOIN public.clientes c ON c.id = v.cliente_id
       ${whereVentas}
       GROUP BY c.id, c.nombre
       ORDER BY COALESCE(SUM(v.total), 0) DESC, COUNT(v.id) DESC
       LIMIT 1`,
      userParams
    ),
    pool.query(
      `SELECT
         v.id,
         v.total,
         v.fecha,
         c.nombre AS cliente_nombre,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido)), ''), u.username, u.correo) AS usuario_nombre
       FROM public.ventas v
       LEFT JOIN public.clientes c ON c.id = v.cliente_id
       LEFT JOIN public.usuarios u ON u.id = v.usuario_id
       ${whereVentas}
       ORDER BY v.total DESC, v.fecha DESC
       LIMIT 1`,
      userParams
    ),
    pool.query(
      `SELECT
         COUNT(*) AS cantidad_ventas,
         COALESCE(AVG(v.total), 0) AS promedio_venta,
         COALESCE(SUM(v.total), 0) AS ventas_totales
       FROM public.ventas v
       ${whereVentas}`,
      userParams
    ),
    pool.query(
      `SELECT
         p.id,
         p.nombre,
         COALESCE(SUM(vd.cantidad), 0) AS total_unidades,
         COALESCE(SUM(vd.cantidad * vd.precio_unitario), 0) AS total_facturado
       FROM public.venta_detalle vd
       INNER JOIN public.ventas v ON v.id = vd.venta_id
       LEFT JOIN public.productos p ON p.id = vd.producto_id
       ${whereVentas}
       GROUP BY p.id, p.nombre
        ORDER BY COALESCE(SUM(vd.cantidad), 0) DESC, COALESCE(SUM(vd.cantidad * vd.precio_unitario), 0) DESC
        LIMIT 1`,
      userParams
    ),
    pool.query(
      `SELECT
         DATE(v.fecha) AS fecha,
         COALESCE(SUM(v.total), 0) AS total_ventas
       FROM public.ventas v
       ${whereVentas}
       GROUP BY DATE(v.fecha)
       ORDER BY DATE(v.fecha) ASC`,
      userParams
    ),
  ]);

  const mejorCliente = mejorClienteQ.rows[0]
    ? {
        id: mejorClienteQ.rows[0].id,
        nombre: mejorClienteQ.rows[0].nombre || 'Consumidor final',
        cantidad_ventas: Number(mejorClienteQ.rows[0].cantidad_ventas || 0),
        total_comprado: Number(mejorClienteQ.rows[0].total_comprado || 0),
      }
    : null;

  const mayorVenta = mayorVentaQ.rows[0]
    ? {
        id: mayorVentaQ.rows[0].id,
        total: Number(mayorVentaQ.rows[0].total || 0),
        fecha: mayorVentaQ.rows[0].fecha,
        cliente_nombre: mayorVentaQ.rows[0].cliente_nombre || 'Consumidor final',
        usuario_nombre: mayorVentaQ.rows[0].usuario_nombre || 'Sin usuario',
      }
    : null;

  const promedioVenta = promedioVentaQ.rows[0]
    ? {
        cantidad_ventas: Number(promedioVentaQ.rows[0].cantidad_ventas || 0),
        promedio: Number(promedioVentaQ.rows[0].promedio_venta || 0),
        ventas_totales: Number(promedioVentaQ.rows[0].ventas_totales || 0),
      }
    : { cantidad_ventas: 0, promedio: 0, ventas_totales: 0 };

  const articuloMasVendido = articuloMasVendidoQ.rows[0]
    ? {
        id: articuloMasVendidoQ.rows[0].id,
        nombre: articuloMasVendidoQ.rows[0].nombre || 'Producto sin nombre',
        unidades: Number(articuloMasVendidoQ.rows[0].total_unidades || 0),
        total_facturado: Number(articuloMasVendidoQ.rows[0].total_facturado || 0),
      }
    : null;
  const ventasSerie = serieVentasBaseQ.rows.map((row) => ({
    fecha: row.fecha,
    total: Number(row.total_ventas || 0),
  }));

  const [ultimaVentaQ, mejorDiaSemanaQ, mejorHorarioQ, periodosQ] = await Promise.all([
    pool.query(
       `SELECT MAX(DATE(v.fecha)) AS ultima_fecha
        FROM public.ventas v
       WHERE ${ACTIVE_SALES_CONDITION}
           AND v.usuario_id = $1`,
      [targetUsuarioId]
    ),
    pool.query(
      `SELECT
         EXTRACT(ISODOW FROM v.fecha)::int AS dia_iso,
         COUNT(*) AS cantidad_ventas,
         COALESCE(SUM(v.total), 0) AS total_vendido
        FROM public.ventas v
        ${wherePersonalVentas}
        GROUP BY EXTRACT(ISODOW FROM v.fecha)
        ORDER BY COALESCE(SUM(v.total), 0) DESC, COUNT(*) DESC
        LIMIT 1`,
      personalParams
    ),
    pool.query(
      `SELECT
         EXTRACT(HOUR FROM v.fecha)::int AS hora,
         COUNT(*) AS cantidad_ventas,
         COALESCE(SUM(v.total), 0) AS total_vendido
        FROM public.ventas v
        ${wherePersonalVentas}
        GROUP BY EXTRACT(HOUR FROM v.fecha)
        ORDER BY COALESCE(SUM(v.total), 0) DESC, COUNT(*) DESC
        LIMIT 1`,
      personalParams
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= CURRENT_DATE
             AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
         ), 0) AS ventas_dia_actual,
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= CURRENT_DATE - INTERVAL '1 day'
             AND v.fecha < CURRENT_DATE
         ), 0) AS ventas_dia_anterior,
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= date_trunc('week', CURRENT_DATE)
             AND v.fecha < date_trunc('week', CURRENT_DATE) + INTERVAL '7 day'
         ), 0) AS ventas_semana_actual,
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 day'
             AND v.fecha < date_trunc('week', CURRENT_DATE)
         ), 0) AS ventas_semana_anterior,
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= date_trunc('month', CURRENT_DATE)
             AND v.fecha < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
         ), 0) AS ventas_mes_actual,
         COALESCE(SUM(v.total) FILTER (
           WHERE v.fecha >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
             AND v.fecha < date_trunc('month', CURRENT_DATE)
         ), 0) AS ventas_mes_anterior
        FROM public.ventas v
        WHERE ${ACTIVE_SALES_CONDITION}
           AND v.usuario_id = $1`,
      [targetUsuarioId]
    ),
  ]);

  const ultimaFecha = ultimaVentaQ.rows[0]?.ultima_fecha ? new Date(ultimaVentaQ.rows[0].ultima_fecha) : null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diasSinVender = ultimaFecha
    ? Math.max(0, Math.floor((hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const diaSemanaLabels = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo',
  };
  const mejorDiaSemanaRow = mejorDiaSemanaQ.rows[0];
  const mejorDiaSemana = mejorDiaSemanaRow
    ? {
        dia: diaSemanaLabels[Number(mejorDiaSemanaRow.dia_iso)] || 'N/A',
        total_vendido: Number(mejorDiaSemanaRow.total_vendido || 0),
        cantidad_ventas: Number(mejorDiaSemanaRow.cantidad_ventas || 0),
      }
    : null;

  const mejorHorarioRow = mejorHorarioQ.rows[0];
  const mejorHorario = mejorHorarioRow
    ? {
        hora: Number(mejorHorarioRow.hora || 0),
        rango: `${String(Number(mejorHorarioRow.hora || 0)).padStart(2, '0')}:00 - ${String((Number(mejorHorarioRow.hora || 0) + 1) % 24).padStart(2, '0')}:00`,
        total_vendido: Number(mejorHorarioRow.total_vendido || 0),
        cantidad_ventas: Number(mejorHorarioRow.cantidad_ventas || 0),
      }
    : null;

  const periodos = periodosQ.rows[0] || {};
  const ventasPeriodo = {
    dia: Number(periodos.ventas_dia_actual || 0),
    semana: Number(periodos.ventas_semana_actual || 0),
    mes: Number(periodos.ventas_mes_actual || 0),
  };
  const crecimientoPeriodo = {
    dia: calcGrowthPercent(periodos.ventas_dia_actual, periodos.ventas_dia_anterior),
    semana: calcGrowthPercent(periodos.ventas_semana_actual, periodos.ventas_semana_anterior),
    mes: calcGrowthPercent(periodos.ventas_mes_actual, periodos.ventas_mes_anterior),
  };

  if (!esPropietario) {
    return res.json({
      scope: 'vendedor',
      desde: fechaDesde,
      hasta: fechaHasta,
      mejorCliente,
      mayorVenta,
      promedioVenta,
      articuloMasVendido,
      ventasSerie,
      diasSinVender,
      mejorDiaSemana,
      mejorHorario,
      ventasPeriodo,
      crecimientoPeriodo,
    });
  }

  const [ventasPorUsuarioQ, costoVentasTotalesQ, serieCostoVentasQ, medioPagoMasUsadoQ] = await Promise.all([
    pool.query(
      `SELECT
         u.id AS usuario_id,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido)), ''), u.username, u.correo, 'Sin usuario') AS usuario_nombre,
         COUNT(v.id) AS cantidad_ventas,
         COALESCE(SUM(v.total), 0) AS total_vendido
       FROM public.ventas v
       LEFT JOIN public.usuarios u ON u.id = v.usuario_id
       ${whereVentas}
       GROUP BY u.id, u.nombre, u.apellido, u.username, u.correo
       ORDER BY COALESCE(SUM(v.total), 0) DESC, COUNT(v.id) DESC`,
      userParams
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(vd.cantidad * COALESCE(p.costo, 0)), 0) AS costo_ventas_totales
       FROM public.venta_detalle vd
       INNER JOIN public.ventas v ON v.id = vd.venta_id
       LEFT JOIN public.productos p ON p.id = vd.producto_id
       ${whereVentas}`,
      userParams
    ),
    pool.query(
      `SELECT
         DATE(v.fecha) AS fecha,
         COALESCE(SUM(vd.cantidad * COALESCE(p.costo, 0)), 0) AS total_costo_ventas
       FROM public.venta_detalle vd
       INNER JOIN public.ventas v ON v.id = vd.venta_id
       LEFT JOIN public.productos p ON p.id = vd.producto_id
       ${whereVentas}
       GROUP BY DATE(v.fecha)
       ORDER BY DATE(v.fecha) ASC`,
      userParams
    ),
    pool.query(
      `SELECT
         p.medio_pago,
         COUNT(*) AS cantidad,
         COALESCE(SUM(p.monto), 0) AS total
       FROM public.pagos p
       INNER JOIN public.ventas v ON v.id = p.venta_id
       ${whereVentas}
       GROUP BY p.medio_pago
       ORDER BY COUNT(*) DESC, COALESCE(SUM(p.monto), 0) DESC
       LIMIT 1`,
      userParams
    ),
  ]);

  const ventasPorUsuario = ventasPorUsuarioQ.rows.map((row) => ({
    usuario_id: row.usuario_id,
    usuario_nombre: row.usuario_nombre || 'Sin usuario',
    cantidad_ventas: Number(row.cantidad_ventas || 0),
    total_vendido: Number(row.total_vendido || 0),
  }));

  const costoVentasTotales = Number(costoVentasTotalesQ.rows[0]?.costo_ventas_totales || 0);
  const ganancia = Number(promedioVenta.ventas_totales || 0) - costoVentasTotales;
  const costoVentasSerie = serieCostoVentasQ.rows.map((row) => ({
    fecha: row.fecha,
    total: Number(row.total_costo_ventas || 0),
  }));
  const medioPagoMasUsado = medioPagoMasUsadoQ.rows[0]
    ? {
        medio_pago: medioPagoMasUsadoQ.rows[0].medio_pago,
        cantidad: Number(medioPagoMasUsadoQ.rows[0].cantidad || 0),
        total: Number(medioPagoMasUsadoQ.rows[0].total || 0),
      }
    : null;

  const [personalMejorClienteQ, personalMayorVentaQ, personalPromedioVentaQ, personalArticuloMasVendidoQ, personalSerieVentasQ] = await Promise.all([
    pool.query(
      `SELECT
         c.id,
         c.nombre,
         COUNT(v.id) AS cantidad_ventas,
         COALESCE(SUM(v.total), 0) AS total_comprado
       FROM public.ventas v
       LEFT JOIN public.clientes c ON c.id = v.cliente_id
       ${wherePersonalVentas}
       GROUP BY c.id, c.nombre
       ORDER BY COALESCE(SUM(v.total), 0) DESC, COUNT(v.id) DESC
       LIMIT 1`,
      personalParams
    ),
    pool.query(
      `SELECT
         v.id,
         v.total,
         v.fecha,
         c.nombre AS cliente_nombre,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido)), ''), u.username, u.correo) AS usuario_nombre
       FROM public.ventas v
       LEFT JOIN public.clientes c ON c.id = v.cliente_id
       LEFT JOIN public.usuarios u ON u.id = v.usuario_id
       ${wherePersonalVentas}
       ORDER BY v.total DESC, v.fecha DESC
       LIMIT 1`,
      personalParams
    ),
    pool.query(
      `SELECT
         COUNT(*) AS cantidad_ventas,
         COALESCE(AVG(v.total), 0) AS promedio_venta,
         COALESCE(SUM(v.total), 0) AS ventas_totales
       FROM public.ventas v
       ${wherePersonalVentas}`,
      personalParams
    ),
    pool.query(
      `SELECT
         p.id,
         p.nombre,
         COALESCE(SUM(vd.cantidad), 0) AS total_unidades,
         COALESCE(SUM(vd.cantidad * vd.precio_unitario), 0) AS total_facturado
       FROM public.venta_detalle vd
       INNER JOIN public.ventas v ON v.id = vd.venta_id
       LEFT JOIN public.productos p ON p.id = vd.producto_id
       ${wherePersonalVentas}
       GROUP BY p.id, p.nombre
       ORDER BY COALESCE(SUM(vd.cantidad), 0) DESC, COALESCE(SUM(vd.cantidad * vd.precio_unitario), 0) DESC
       LIMIT 1`,
      personalParams
    ),
    pool.query(
      `SELECT
         DATE(v.fecha) AS fecha,
         COALESCE(SUM(v.total), 0) AS total_ventas
       FROM public.ventas v
       ${wherePersonalVentas}
       GROUP BY DATE(v.fecha)
       ORDER BY DATE(v.fecha) ASC`,
      personalParams
    ),
  ]);

  const personalMejorCliente = personalMejorClienteQ.rows[0]
    ? {
        id: personalMejorClienteQ.rows[0].id,
        nombre: personalMejorClienteQ.rows[0].nombre || 'Consumidor final',
        cantidad_ventas: Number(personalMejorClienteQ.rows[0].cantidad_ventas || 0),
        total_comprado: Number(personalMejorClienteQ.rows[0].total_comprado || 0),
      }
    : null;
  const personalMayorVenta = personalMayorVentaQ.rows[0]
    ? {
        id: personalMayorVentaQ.rows[0].id,
        total: Number(personalMayorVentaQ.rows[0].total || 0),
        fecha: personalMayorVentaQ.rows[0].fecha,
        cliente_nombre: personalMayorVentaQ.rows[0].cliente_nombre || 'Consumidor final',
        usuario_nombre: personalMayorVentaQ.rows[0].usuario_nombre || 'Sin usuario',
      }
    : null;
  const personalPromedioVenta = personalPromedioVentaQ.rows[0]
    ? {
        cantidad_ventas: Number(personalPromedioVentaQ.rows[0].cantidad_ventas || 0),
        promedio: Number(personalPromedioVentaQ.rows[0].promedio_venta || 0),
        ventas_totales: Number(personalPromedioVentaQ.rows[0].ventas_totales || 0),
      }
    : { cantidad_ventas: 0, promedio: 0, ventas_totales: 0 };
  const personalArticuloMasVendido = personalArticuloMasVendidoQ.rows[0]
    ? {
        id: personalArticuloMasVendidoQ.rows[0].id,
        nombre: personalArticuloMasVendidoQ.rows[0].nombre || 'Producto sin nombre',
        unidades: Number(personalArticuloMasVendidoQ.rows[0].total_unidades || 0),
        total_facturado: Number(personalArticuloMasVendidoQ.rows[0].total_facturado || 0),
      }
    : null;
  const personalVentasSerie = personalSerieVentasQ.rows.map((row) => ({
    fecha: row.fecha,
    total: Number(row.total_ventas || 0),
  }));

  return res.json({
    scope: 'propietario',
    desde: fechaDesde,
    hasta: fechaHasta,
    mejorCliente,
    mayorVenta,
    promedioVenta,
    articuloMasVendido,
    ventasPorUsuario,
    costoVentasTotales,
    ganancia,
    ventasSerie,
    costoVentasSerie,
    // Compatibilidad temporal con frontend previo
    comprasTotales: costoVentasTotales,
    comprasSerie: costoVentasSerie,
    medioPagoMasUsado,
    personalStats: {
      usuarioId: targetUsuarioId,
      diasSinVender,
      mejorDiaSemana,
      mejorHorario,
      ventasPeriodo,
      crecimientoPeriodo,
      ventasSerie: personalVentasSerie,
      mejorCliente: personalMejorCliente,
      mayorVenta: personalMayorVenta,
      promedioVenta: personalPromedioVenta,
      articuloMasVendido: personalArticuloMasVendido,
    },
  });
});

ventasRouter.get('/entregas/resumen', async (req, res) => {
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) return res.status(401).json({ error: 'No autorizado' });

  const periodo = String(req.query.periodo || 'dia').toLowerCase();
  const fechaBase = req.query.fechaBase ? String(req.query.fechaBase) : null;
  const desde = req.query.desde ? String(req.query.desde) : null;
  const hasta = req.query.hasta ? String(req.query.hasta) : null;
  if (!['dia', 'manana', 'semana', 'mes'].includes(periodo)) {
    return res.status(400).json({ error: 'Periodo inválido. Usa: dia, manana, semana o mes.' });
  }
  if (fechaBase && !/^\d{4}-\d{2}-\d{2}$/.test(fechaBase)) {
    return res.status(400).json({ error: 'Formato de fechaBase inválido. Usa YYYY-MM-DD' });
  }
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    return res.status(400).json({ error: 'Formato de fecha "desde" inválido. Usa YYYY-MM-DD' });
  }
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return res.status(400).json({ error: 'Formato de fecha "hasta" inválido. Usa YYYY-MM-DD' });
  }
  if ((desde || hasta) && (!desde || !hasta)) {
    return res.status(400).json({ error: 'Para filtrar por rango debes indicar "desde" y "hasta".' });
  }
  if (desde && hasta && desde > hasta) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser mayor que "hasta"' });
  }

  const range = (desde && hasta)
    ? { desde, hasta }
    : getDateRangeByPeriod(fechaBase, periodo);
  if (!range?.desde || !range?.hasta) {
    return res.status(400).json({ error: 'No se pudo calcular el rango de fechas solicitado' });
  }

  const esPropietario = normalizeTipo(authUser.tipo) === 'propietario';
  const params = [range.desde, range.hasta];
  const userFilter = esPropietario ? '' : 'AND v.usuario_id = $3';
  if (!esPropietario) params.push(Number(authUser.id));

  const ventasQ = await pool.query(
    `SELECT
       v.id,
       v.fecha,
       v.fecha_entrega,
       v.total,
       v.estado_entrega,
       v.entregado,
       v.observacion,
       c.nombre AS cliente_nombre,
       c.telefono AS cliente_telefono,
       c.direccion AS cliente_direccion,
       c.horario_apertura AS cliente_horario_apertura,
       c.horario_cierre AS cliente_horario_cierre,
       c.tiene_reapertura AS cliente_tiene_reapertura,
       c.horario_reapertura AS cliente_horario_reapertura,
       c.horario_cierre_reapertura AS cliente_horario_cierre_reapertura,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido)), ''), u.username, u.correo) AS usuario_nombre,
         COALESCE(det.productos, '') AS productos
     FROM public.ventas v
     LEFT JOIN public.clientes c ON c.id = v.cliente_id
     LEFT JOIN public.usuarios u ON u.id = v.usuario_id
      LEFT JOIN (
         SELECT
           vd.venta_id,
           STRING_AGG(
             CONCAT(
               COALESCE(p.nombre, 'Producto'),
               ' x',
               COALESCE(vd.cantidad, 0)::text,
               ' (',
               COALESCE(
                 CASE
                   WHEN COALESCE(p.cantidad_empaque, 0) > 1 THEN
                     CASE
                       WHEN MOD(COALESCE(vd.cantidad, 0), p.cantidad_empaque) = 0 THEN CONCAT((COALESCE(vd.cantidad, 0) / p.cantidad_empaque)::text, ' ', COALESCE(NULLIF(TRIM(p.empaque), ''), 'empaque'))
                       WHEN (COALESCE(vd.cantidad, 0) / p.cantidad_empaque) > 0 THEN CONCAT((COALESCE(vd.cantidad, 0) / p.cantidad_empaque)::text, ' ', COALESCE(NULLIF(TRIM(p.empaque), ''), 'empaque'), ' + ', MOD(COALESCE(vd.cantidad, 0), p.cantidad_empaque)::text, ' unidades')
                       ELSE CONCAT(MOD(COALESCE(vd.cantidad, 0), p.cantidad_empaque)::text, ' unidades')
                     END
                   ELSE CONCAT(COALESCE(vd.cantidad, 0)::text, ' unidades')
                 END,
                 CONCAT(COALESCE(vd.cantidad, 0)::text, ' unidades')
               ),
               ')'
             ),
             E'\n' ORDER BY vd.id
           ) AS productos
        FROM public.venta_detalle vd
       LEFT JOIN public.productos p ON p.id = vd.producto_id
       GROUP BY vd.venta_id
     ) det ON det.venta_id = v.id
      WHERE ${ACTIVE_SALES_CONDITION}
        AND COALESCE(v.estado_entrega, CASE WHEN v.entregado THEN 'entregado' ELSE 'pendiente' END) <> 'entregado'
        AND v.fecha_entrega IS NOT NULL
        AND DATE(v.fecha_entrega) BETWEEN $1::date AND $2::date
       ${userFilter}
      ORDER BY DATE(v.fecha_entrega) ASC, v.fecha ASC, v.id ASC`,
    params
  );

  const ventas = ventasQ.rows.map((row) => ({
    id: Number(row.id),
    fecha: row.fecha,
    fecha_entrega: row.fecha_entrega,
    total: Number(row.total || 0),
    estado_entrega: row.estado_entrega || (row.entregado ? 'entregado' : 'pendiente'),
    entregado: Boolean(row.entregado),
    observacion: row.observacion || '',
    cliente_nombre: row.cliente_nombre || 'Consumidor final',
    cliente_telefono: row.cliente_telefono || '',
    cliente_direccion: row.cliente_direccion || '',
    cliente_horario_apertura: row.cliente_horario_apertura || '',
    cliente_horario_cierre: row.cliente_horario_cierre || '',
    cliente_tiene_reapertura: Boolean(row.cliente_tiene_reapertura),
    cliente_horario_reapertura: row.cliente_horario_reapertura || '',
    cliente_horario_cierre_reapertura: row.cliente_horario_cierre_reapertura || '',
    usuario_nombre: row.usuario_nombre || '-',
    productos: row.productos || '-',
  }));

  const totalMonto = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  return res.json({
    periodo,
    desde: range.desde,
    hasta: range.hasta,
    totalVentas: ventas.length,
    totalMonto,
    ventas,
  });
});

ventasRouter.get('/', async (req, res) => {
  const { fecha, desde, hasta } = req.query;

  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD' });
  }
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(String(desde))) {
    return res.status(400).json({ error: 'Formato de fecha "desde" inválido. Usa YYYY-MM-DD' });
  }
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(String(hasta))) {
    return res.status(400).json({ error: 'Formato de fecha "hasta" inválido. Usa YYYY-MM-DD' });
  }
  if (desde && hasta && String(desde) > String(hasta)) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser mayor que "hasta"' });
  }

  const filterDate = fecha || null;
  const filterDesde = fecha ? null : (desde || null);
  const filterHasta = fecha ? null : (hasta || null);

  const result = await pool.query(
    `SELECT v.id, v.usuario_id, v.cliente_id, v.fecha, v.fecha_entrega, v.observacion,
            v.subtotal, v.descuento_total_tipo, v.descuento_total_valor, v.total, v.medio_pago, v.cancelada, v.entregado, v.estado_entrega,
            COALESCE(v.eliminada, false) AS eliminada,
            c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.correo AS cliente_correo,
            c.direccion AS cliente_direccion,
            c.horario_apertura AS cliente_horario_apertura, c.horario_cierre AS cliente_horario_cierre,
            c.tiene_reapertura AS cliente_tiene_reapertura,
            c.horario_reapertura AS cliente_horario_reapertura, c.horario_cierre_reapertura AS cliente_horario_cierre_reapertura,
            u.nombre AS usuario_nombre
      FROM public.ventas v
      LEFT JOIN public.clientes c ON c.id = v.cliente_id
      LEFT JOIN public.usuarios u ON u.id = v.usuario_id
      WHERE (
        ($1::date IS NOT NULL AND DATE(v.fecha) = $1::date)
        OR
        ($1::date IS NULL AND DATE(v.fecha) BETWEEN COALESCE($2::date, DATE(v.fecha)) AND COALESCE($3::date, DATE(v.fecha)))
      )
      AND COALESCE(v.eliminada, false) = false
      ORDER BY v.fecha DESC, v.id DESC`,
    [filterDate, filterDesde, filterHasta]
  );
  const ventas = result.rows;
  const ventaIds = ventas.map((v) => Number(v.id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!ventaIds.length) return res.json(ventas.map((v) => ({ ...v, pagos: [] })));
  const pagosResult = await pool.query(
    `SELECT id, venta_id, medio_pago, monto, created_at
     FROM public.pagos
     WHERE venta_id = ANY($1::int[])
     ORDER BY id ASC`,
    [ventaIds]
  );
  const pagosByVentaId = pagosResult.rows.reduce((acc, p) => {
    const key = Number(p.venta_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: p.id,
      venta_id: key,
      medio_pago: p.medio_pago,
      monto: Number(p.monto || 0),
      created_at: p.created_at,
    });
    return acc;
  }, {});
  return res.json(ventas.map((v) => ({ ...v, pagos: pagosByVentaId[Number(v.id)] || [] })));
});

ventasRouter.get('/:id', async (req, res) => {
  const ventaId = Number(req.params.id);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }

  const ventaResult = await pool.query(
      `SELECT v.id, v.usuario_id, v.cliente_id, v.fecha, v.fecha_entrega, v.observacion,
              v.subtotal, v.descuento_total_tipo, v.descuento_total_valor, v.total, v.medio_pago, v.cancelada, v.entregado, v.estado_entrega,
              COALESCE(v.eliminada, false) AS eliminada,
              c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.correo AS cliente_correo,
              c.direccion AS cliente_direccion,
              c.horario_apertura AS cliente_horario_apertura, c.horario_cierre AS cliente_horario_cierre,
              c.tiene_reapertura AS cliente_tiene_reapertura,
              c.horario_reapertura AS cliente_horario_reapertura, c.horario_cierre_reapertura AS cliente_horario_cierre_reapertura,
              u.nombre AS usuario_nombre
       FROM public.ventas v
       LEFT JOIN public.clientes c ON c.id = v.cliente_id
       LEFT JOIN public.usuarios u ON u.id = v.usuario_id
       WHERE v.id = $1
         AND COALESCE(v.eliminada, false) = false`,
    [ventaId]
  );

  if (!ventaResult.rowCount) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }

  const detalleResult = await pool.query(
    `SELECT vd.id, vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario,
            p.nombre AS producto_nombre
     FROM public.venta_detalle vd
     LEFT JOIN public.productos p ON p.id = vd.producto_id
     WHERE vd.venta_id = $1
     ORDER BY vd.id ASC`,
    [ventaId]
  );
  const pagosResult = await pool.query(
    `SELECT id, venta_id, medio_pago, monto, created_at
     FROM public.pagos
     WHERE venta_id = $1
     ORDER BY id ASC`,
    [ventaId]
  );

  return res.json({
    ...ventaResult.rows[0],
    detalle: detalleResult.rows,
    pagos: pagosResult.rows.map((p) => ({
      id: p.id,
      venta_id: Number(p.venta_id),
      medio_pago: p.medio_pago,
      monto: Number(p.monto || 0),
      created_at: p.created_at,
    })),
  });
});

ventasRouter.post('/', async (req, res) => {
  const {
    cliente_id = null,
    fecha_entrega = null,
    medio_pago = 'efectivo',
    pagos = [],
    entregado = false,
    estado_entrega = 'pendiente',
    observacion = null,
    descuento_total_tipo = 'ninguno',
    descuento_total_valor = 0,
    detalle = [],
  } = req.body;

  const client = await pool.connect();
  const authUser = getAuthUserFromRequest(req);
  if (!authUser?.id) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const usuarioVentaId = Number(authUser.id);

  try {
    await client.query('BEGIN');

    const pagosNormalizados = normalizePaymentMethods(pagos);

    let subtotal = 0;
    const movimientosPendientes = [];

    for (const item of detalle) {
      const productoId = Number(item.producto_id);
      const cantidad = Math.floor(toNumber(item.cantidad));
      const precioUnitario = toNumber(item.precio_unitario);

      if (cantidad <= 0) throw new Error('Cantidad inválida en detalle');

      const prodResult = await client.query(
        `SELECT id, nombre, stock
         FROM public.productos
         WHERE id = $1 AND activo = true
         FOR UPDATE`,
        [productoId]
      );
      if (!prodResult.rowCount) throw new Error(`Producto ${productoId} no existe o está archivado`);

      const stockActual = Number(prodResult.rows[0].stock);
      const productoNombre = prodResult.rows[0].nombre || null;

      await client.query(
        `UPDATE public.productos SET stock = stock - $1 WHERE id = $2`,
        [cantidad, productoId]
      );
      movimientosPendientes.push({
        productoId,
        productoNombre,
        cantidad,
        stockAnterior: stockActual,
        stockNuevo: stockActual - cantidad,
      });

      subtotal += cantidad * precioUnitario;
    }
    subtotal = roundMoney(subtotal);

    let descuentoGlobal = 0;
    const descuentoValor = toNumber(descuento_total_valor);
    if (descuento_total_tipo === 'porcentaje') {
      const pct = Math.max(0, Math.min(100, descuentoValor));
      descuentoGlobal = (subtotal * pct) / 100;
    } else if (descuento_total_tipo === 'fijo') {
      descuentoGlobal = Math.max(0, Math.min(subtotal, descuentoValor));
    }
    descuentoGlobal = roundMoney(descuentoGlobal);
    const total = roundMoney(Math.max(0, subtotal - descuentoGlobal));
    const estadoSolicitado = String(estado_entrega || '').trim().toLowerCase();
    const estadoNormalizado = estadoSolicitado === 'entregado' ? 'entregado' : 'pendiente';
    const entregadoFinal = estadoNormalizado === 'entregado' ? true : Boolean(entregado);

    const totalPagos = roundMoney(pagosNormalizados.reduce((acc, p) => acc + toNumber(p.monto), 0));
    if (pagosNormalizados.length > 0 && Math.abs(totalPagos - total) > 0.01) {
      throw new Error('La suma de pagos debe coincidir con el total de la venta');
    }
    const medioPagoPrincipal = pagosNormalizados.length
      ? pagosNormalizados[0].medio_pago
      : String(medio_pago || 'efectivo').trim().toLowerCase();
    if (!MEDIOS_PAGO.has(medioPagoPrincipal)) {
      throw new Error('Medio de pago inválido');
    }

    const ventaResult = await client.query(
      `INSERT INTO public.ventas
        (usuario_id, cliente_id, fecha_entrega, medio_pago, cancelada, entregado, estado_entrega, observacion, subtotal, descuento_total_tipo, descuento_total_valor, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [usuarioVentaId, cliente_id, fecha_entrega, medioPagoPrincipal, false, entregadoFinal, estadoNormalizado, observacion, subtotal, descuento_total_tipo, roundMoney(descuentoValor), total]
    );

    const ventaId = ventaResult.rows[0].id;

    for (const item of detalle) {
      await client.query(
        `INSERT INTO public.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1,$2,$3,$4)`,
        [ventaId, Number(item.producto_id), Math.floor(toNumber(item.cantidad)), toNumber(item.precio_unitario)]
      );
    }
    if (pagosNormalizados.length > 0) {
      for (const pago of pagosNormalizados) {
        await client.query(
          `INSERT INTO public.pagos (venta_id, medio_pago, monto)
           VALUES ($1,$2,$3)`,
          [ventaId, pago.medio_pago, pago.monto]
        );
      }
    } else {
      await client.query(
        `INSERT INTO public.pagos (venta_id, medio_pago, monto)
         VALUES ($1,$2,$3)`,
        [ventaId, medioPagoPrincipal, total]
      );
    }

    for (const mov of movimientosPendientes) {
      await client.query(
        `INSERT INTO public.movimientos_stock
          (producto_id, producto_nombre, tipo, origen, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          mov.productoId,
          mov.productoNombre,
          'salida',
          'venta',
          mov.cantidad,
          mov.stockAnterior,
          mov.stockNuevo,
          'venta',
          ventaId,
          'Salida de stock por venta',
          authUser?.id || null,
          actorName(authUser),
        ]
      );
    }

    const totalFmt = Number(total).toFixed(2);
    await client.query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'venta',
        ventaId,
        'crear',
        `Venta creada por total ${totalFmt}`,
        authUser?.id || null,
        actorName(authUser),
      ]
    );

    const pagosResult = await client.query(
      `SELECT id, venta_id, medio_pago, monto, created_at
       FROM public.pagos
       WHERE venta_id = $1
       ORDER BY id ASC`,
      [ventaId]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      ...ventaResult.rows[0],
      pagos: pagosResult.rows.map((p) => ({
        id: p.id,
        venta_id: Number(p.venta_id),
        medio_pago: p.medio_pago,
        monto: Number(p.monto || 0),
        created_at: p.created_at,
      })),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

ventasRouter.put('/:id/entregado', async (req, res) => {
  const ventaId = Number(req.params.id);
  const { entregado } = req.body || {};
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }
  if (typeof entregado !== 'boolean') {
    return res.status(400).json({ error: 'El campo entregado debe ser booleano' });
  }

  const result = await pool.query(
     `UPDATE public.ventas
      SET entregado = $1,
           estado_entrega = CASE WHEN $1 THEN 'entregado' ELSE 'pendiente' END
     WHERE id = $2 AND cancelada = false AND COALESCE(eliminada, false) = false
     RETURNING id, entregado, estado_entrega`,
    [entregado, ventaId]
  );

  if (!result.rowCount) {
    const exists = await pool.query(`SELECT id, cancelada, COALESCE(eliminada, false) AS eliminada FROM public.ventas WHERE id = $1`, [ventaId]);
    if (!exists.rowCount) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    if (exists.rows[0].eliminada) {
      return res.status(400).json({ error: 'No se puede actualizar una venta eliminada' });
    }
    return res.status(400).json({ error: 'No se puede actualizar una venta cancelada' });
  }
  await pool.query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'venta',
      ventaId,
      'actualizar_entrega',
      `Entrega marcada como ${result.rows[0].entregado ? 'entregada' : 'no entregada'}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.json(result.rows[0]);
});

ventasRouter.put('/:id/estado-entrega', async (req, res) => {
  return res.status(405).json({
    error: 'El estado de entrega se actualiza únicamente con el campo entregado',
  });
});

ventasRouter.post('/:id/enviar-email', async (req, res) => {
  const ventaId = Number(req.params.id);
  const { pdfBase64, fileName } = req.body || {};
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }

  const mailFrom = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const hasBrevo = String(process.env.BREVO_API_KEY || '').trim().length > 0;
  const hasSmtp = String(process.env.SMTP_HOST || '').trim()
    && String(process.env.SMTP_USER || '').trim()
    && String(process.env.SMTP_PASS || '').trim();
  if (!mailFrom || (!hasBrevo && !hasSmtp)) {
    return res.status(500).json({ error: 'Email no configurado. Define BREVO_API_KEY o SMTP_* y SMTP_FROM' });
  }

  if (typeof pdfBase64 !== 'string' || !pdfBase64.trim()) {
    return res.status(400).json({ error: 'PDF requerido para enviar por email' });
  }
  const pdfContentBase64 = pdfBase64.includes(',')
    ? pdfBase64.split(',').pop()
    : pdfBase64;
  if (!pdfContentBase64) {
    return res.status(400).json({ error: 'PDF inválido para enviar por email' });
  }

  const ventaQ = await pool.query(
    `SELECT
       v.id,
       v.total,
       v.fecha,
       c.nombre AS cliente_nombre,
       c.correo AS cliente_correo
     FROM public.ventas v
     LEFT JOIN public.clientes c ON c.id = v.cliente_id
     WHERE v.id = $1
       AND COALESCE(v.eliminada, false) = false
     LIMIT 1`,
    [ventaId]
  );
  if (!ventaQ.rowCount) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }

  const venta = ventaQ.rows[0];
  const to = String(venta.cliente_correo || '').trim();
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'El cliente no tiene un correo válido' });
  }

  const safeFileName = String(fileName || `ticket-venta-${ventaId}.pdf`).replace(/[^\w.\-]/g, '_');

  const fechaText = venta.fecha ? new Date(venta.fecha).toLocaleString('es-UY') : '-';
  try {
    await sendMail({
      from: mailFrom,
      to,
      subject: `Factura de venta #${ventaId}`,
      text: `Hola ${venta.cliente_nombre || 'cliente'},\n\nTe compartimos la factura de tu compra #${ventaId}.\nFecha: ${fechaText}\nTotal: $${roundMoney(venta.total).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nSaludos.`,
      attachments: [
        {
          filename: safeFileName,
          content: pdfContentBase64,
        },
      ],
    });
  } catch (_error) {
    return res.status(502).json({ error: 'No se pudo enviar el correo en este momento. Revisa la configuración SMTP.' });
  }

  await pool.query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'venta',
      ventaId,
      'enviar_factura_email',
      `Factura enviada por email a ${to}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.json({ ok: true, to });
});

ventasRouter.put('/:id/cancelar', async (req, res) => {
  const ventaId = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ventaQ = await client.query(
      `SELECT id, cancelada
       FROM public.ventas
       WHERE id = $1
         AND COALESCE(eliminada, false) = false
       FOR UPDATE`,
      [ventaId]
    );
    if (!ventaQ.rowCount) {
      throw new Error('Venta no encontrada');
    }
    if (ventaQ.rows[0].cancelada) {
      throw new Error('La venta ya está cancelada');
    }

    await restoreVentaStock(client, ventaId, authUser, 'cancelacion_venta', 'Reposición de stock por cancelación de venta');

    const result = await client.query(
      `UPDATE public.ventas
       SET cancelada = true,
           entregado = false,
           estado_entrega = 'cancelado'
       WHERE id = $1
       RETURNING id, cancelada, estado_entrega`,
      [ventaId]
    );

    await client.query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'venta',
        ventaId,
        'cancelar',
        'Venta cancelada y stock repuesto',
        authUser?.id || null,
        actorName(authUser),
      ]
    );

    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'Venta no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'La venta ya está cancelada') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

ventasRouter.delete('/:id', async (req, res) => {
  const ventaId = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ventaQ = await client.query(
      `SELECT id, cancelada, COALESCE(eliminada, false) AS eliminada
       FROM public.ventas
       WHERE id = $1
       FOR UPDATE`,
      [ventaId]
    );
    if (!ventaQ.rowCount) {
      throw new Error('Venta no encontrada');
    }
    if (ventaQ.rows[0].eliminada) {
      throw new Error('La venta ya está eliminada');
    }

    if (!ventaQ.rows[0].cancelada) {
      await restoreVentaStock(client, ventaId, authUser, 'eliminacion_venta', 'Reposición de stock por eliminación de venta');
    }

    const result = await client.query(
      `UPDATE public.ventas
       SET eliminada = true,
           cancelada = true,
           entregado = false,
           estado_entrega = 'cancelado'
       WHERE id = $1
       RETURNING id, eliminada, cancelada, estado_entrega`,
      [ventaId]
    );

    await client.query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'venta',
        ventaId,
        'eliminar',
        ventaQ.rows[0].cancelada ? 'Venta eliminada lógicamente' : 'Venta eliminada lógicamente y stock repuesto',
        authUser?.id || null,
        actorName(authUser),
      ]
    );

    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.message === 'Venta no encontrada') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'La venta ya está eliminada') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});
