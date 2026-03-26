import { Router } from 'express';
import { pool } from '../db.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const ventasRouter = Router();

ventasRouter.get('/', async (req, res) => {
  const { fecha } = req.query;

  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD' });
  }

  const result = await pool.query(
    `SELECT v.id, v.usuario_id, v.cliente_id, v.fecha, v.fecha_entrega, v.observacion,
            v.subtotal, v.descuento_total_tipo, v.descuento_total_valor, v.total,
            c.nombre AS cliente_nombre,
            u.nombre AS usuario_nombre
     FROM public.ventas v
     LEFT JOIN public.clientes c ON c.id = v.cliente_id
     LEFT JOIN public.usuarios u ON u.id = v.usuario_id
     WHERE DATE(v.fecha) = COALESCE($1::date, CURRENT_DATE)
     ORDER BY v.fecha DESC, v.id DESC`,
    [fecha || null]
  );
  return res.json(result.rows);
});

ventasRouter.post('/', async (req, res) => {
  const {
    usuario_id = null,
    cliente_id = null,
    fecha_entrega = null,
    observacion = null,
    descuento_total_tipo = 'ninguno',
    descuento_total_valor = 0,
    detalle = [],
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let subtotal = 0;

    for (const item of detalle) {
      const productoId = Number(item.producto_id);
      const cantidad = Math.floor(toNumber(item.cantidad));
      const precioUnitario = toNumber(item.precio_unitario);

      if (cantidad <= 0) throw new Error('Cantidad inválida en detalle');

      const prodResult = await client.query(
        `SELECT id, stock FROM public.productos WHERE id = $1 FOR UPDATE`,
        [productoId]
      );
      if (!prodResult.rowCount) throw new Error(`Producto ${productoId} no existe`);

      const stockActual = Number(prodResult.rows[0].stock);
      if (cantidad > stockActual) throw new Error(`Stock insuficiente para producto ${productoId}`);

      await client.query(
        `UPDATE public.productos SET stock = stock - $1 WHERE id = $2`,
        [cantidad, productoId]
      );

      subtotal += cantidad * precioUnitario;
    }

    let descuentoGlobal = 0;
    const descuentoValor = toNumber(descuento_total_valor);
    if (descuento_total_tipo === 'porcentaje') {
      const pct = Math.max(0, Math.min(100, descuentoValor));
      descuentoGlobal = (subtotal * pct) / 100;
    } else if (descuento_total_tipo === 'fijo') {
      descuentoGlobal = Math.max(0, Math.min(subtotal, descuentoValor));
    }
    const total = Math.max(0, subtotal - descuentoGlobal);

    const ventaResult = await client.query(
      `INSERT INTO public.ventas
        (usuario_id, cliente_id, fecha_entrega, observacion, subtotal, descuento_total_tipo, descuento_total_valor, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [usuario_id, cliente_id, fecha_entrega, observacion, subtotal, descuento_total_tipo, descuentoValor, total]
    );

    const ventaId = ventaResult.rows[0].id;

    for (const item of detalle) {
      await client.query(
        `INSERT INTO public.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1,$2,$3,$4)`,
        [ventaId, Number(item.producto_id), Math.floor(toNumber(item.cantidad)), toNumber(item.precio_unitario)]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json(ventaResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});
