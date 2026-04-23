import { query } from './db.js';

/**
 * Obtiene el método de cálculo de ganancias activo desde la base de datos.
 * Retorna el código del método (ej: 'margen_venta', 'flujo_caja').
 */
export async function getMetodoGanancias() {
  const res = await query(`
    SELECT m.codigo
    FROM public.config_ganancias cg
    JOIN public.config_ganancias_metodos m ON m.id = cg.metodo_id
    LIMIT 1
  `);
  return res.rows[0]?.codigo ?? 'margen_venta';
}

/**
 * Calcula la ganancia total según el método configurado, para un rango de fechas.
 * @param {string} metodo - 'margen_venta' | 'flujo_caja'
 * @param {Object} filtro - { desde?: string, hasta?: string, usuarioId?: number }
 * @returns {{ ganancia: number }}
 */
export async function calcularGanancia(metodo, filtro = {}) {
  const { desde, hasta, usuarioId } = filtro;

  const params = [];
  const conditions = [`v.cancelada = false`, `COALESCE(v.eliminada, false) = false`];

  if (desde) { params.push(desde); conditions.push(`v.fecha >= $${params.length}`); }
  if (hasta) { params.push(hasta); conditions.push(`v.fecha <= $${params.length}`); }
  if (usuarioId) { params.push(usuarioId); conditions.push(`v.usuario_id = $${params.length}`); }

  const where = conditions.join(' AND ');

  if (metodo === 'flujo_caja') {
    // Ganancia = Σ total_ventas_activas − Σ (costo_unitario × cantidad entradas de stock en el mismo período)
    const ventasRes = await query(
      `SELECT COALESCE(SUM(v.total), 0) AS total_ventas
       FROM public.ventas v
       WHERE ${where}`,
      params
    );

    const stockParams = [];
    const stockConditions = [];
    if (desde) { stockParams.push(desde); stockConditions.push(`ms.created_at >= $${stockParams.length}`); }
    if (hasta) { stockParams.push(hasta); stockConditions.push(`ms.created_at <= $${stockParams.length}`); }
    const stockWhere = stockConditions.length ? `WHERE ms.tipo = 'entrada' AND ${stockConditions.join(' AND ')}` : `WHERE ms.tipo = 'entrada'`;

    const stockRes = await query(
      `SELECT COALESCE(SUM(ms.cantidad * p.costo), 0) AS costo_entradas
       FROM public.movimientos_stock ms
       JOIN public.productos p ON p.id = ms.producto_id
       ${stockWhere}`,
      stockParams
    );

    const totalVentas = parseFloat(ventasRes.rows[0].total_ventas);
    const costoEntradas = parseFloat(stockRes.rows[0].costo_entradas);
    return { ganancia: totalVentas - costoEntradas };
  }

  // margen_venta (default): Σ (precio_unitario_venta − costo_producto) × cantidad
  const res = await query(
    `SELECT COALESCE(SUM((vd.precio_unitario - p.costo) * vd.cantidad), 0) AS ganancia
     FROM public.ventas v
     JOIN public.venta_detalle vd ON vd.venta_id = v.id
     JOIN public.productos p ON p.id = vd.producto_id
     WHERE ${where}`,
    params
  );
  return { ganancia: parseFloat(res.rows[0].ganancia) };
}
