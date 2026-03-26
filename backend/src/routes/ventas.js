import { Router } from 'express';
import { pool } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const ventasRouter = Router();
const ESTADOS_ENTREGA = new Set(['pendiente', 'en_camino', 'entregado']);

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

ventasRouter.get('/', async (req, res) => {
  const { fecha } = req.query;

  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Usa YYYY-MM-DD' });
  }

  const result = await pool.query(
    `SELECT v.id, v.usuario_id, v.cliente_id, v.fecha, v.fecha_entrega, v.observacion,
            v.subtotal, v.descuento_total_tipo, v.descuento_total_valor, v.total, v.entregado, v.estado_entrega,
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

ventasRouter.get('/:id', async (req, res) => {
  const ventaId = Number(req.params.id);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }

  const ventaResult = await pool.query(
    `SELECT v.id, v.usuario_id, v.cliente_id, v.fecha, v.fecha_entrega, v.observacion,
            v.subtotal, v.descuento_total_tipo, v.descuento_total_valor, v.total, v.entregado, v.estado_entrega,
            c.nombre AS cliente_nombre,
            u.nombre AS usuario_nombre
     FROM public.ventas v
     LEFT JOIN public.clientes c ON c.id = v.cliente_id
     LEFT JOIN public.usuarios u ON u.id = v.usuario_id
     WHERE v.id = $1`,
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

  return res.json({
    ...ventaResult.rows[0],
    detalle: detalleResult.rows,
  });
});

ventasRouter.post('/', async (req, res) => {
  const {
    usuario_id = null,
    cliente_id = null,
    fecha_entrega = null,
    entregado = false,
    estado_entrega = 'pendiente',
    observacion = null,
    descuento_total_tipo = 'ninguno',
    descuento_total_valor = 0,
    detalle = [],
  } = req.body;

  const client = await pool.connect();
  const authUser = getAuthUserFromRequest(req);

  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const movimientosPendientes = [];

    for (const item of detalle) {
      const productoId = Number(item.producto_id);
      const cantidad = Math.floor(toNumber(item.cantidad));
      const precioUnitario = toNumber(item.precio_unitario);

      if (cantidad <= 0) throw new Error('Cantidad inválida en detalle');

      const prodResult = await client.query(
        `SELECT id, nombre, stock FROM public.productos WHERE id = $1 FOR UPDATE`,
        [productoId]
      );
      if (!prodResult.rowCount) throw new Error(`Producto ${productoId} no existe`);

      const stockActual = Number(prodResult.rows[0].stock);
      const productoNombre = prodResult.rows[0].nombre || null;
      if (cantidad > stockActual) throw new Error(`Stock insuficiente para producto ${productoId}`);

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

    let descuentoGlobal = 0;
    const descuentoValor = toNumber(descuento_total_valor);
    if (descuento_total_tipo === 'porcentaje') {
      const pct = Math.max(0, Math.min(100, descuentoValor));
      descuentoGlobal = (subtotal * pct) / 100;
    } else if (descuento_total_tipo === 'fijo') {
      descuentoGlobal = Math.max(0, Math.min(subtotal, descuentoValor));
    }
    const total = Math.max(0, subtotal - descuentoGlobal);
    const estadoNormalizado = ESTADOS_ENTREGA.has(String(estado_entrega))
      ? String(estado_entrega)
      : (Boolean(entregado) ? 'entregado' : 'pendiente');
    const entregadoFinal = estadoNormalizado === 'entregado' ? true : Boolean(entregado);

    const ventaResult = await client.query(
      `INSERT INTO public.ventas
        (usuario_id, cliente_id, fecha_entrega, entregado, estado_entrega, observacion, subtotal, descuento_total_tipo, descuento_total_valor, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [usuario_id, cliente_id, fecha_entrega, entregadoFinal, estadoNormalizado, observacion, subtotal, descuento_total_tipo, descuentoValor, total]
    );

    const ventaId = ventaResult.rows[0].id;

    for (const item of detalle) {
      await client.query(
        `INSERT INTO public.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1,$2,$3,$4)`,
        [ventaId, Number(item.producto_id), Math.floor(toNumber(item.cantidad)), toNumber(item.precio_unitario)]
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

    await client.query('COMMIT');
    return res.status(201).json(ventaResult.rows[0]);
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
     WHERE id = $2
     RETURNING id, entregado, estado_entrega`,
    [entregado, ventaId]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Venta no encontrada' });
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
  const ventaId = Number(req.params.id);
  const { estado_entrega } = req.body || {};
  const estado = String(estado_entrega || '').trim();
  const authUser = getAuthUserFromRequest(req);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'Id de venta inválido' });
  }
  if (!ESTADOS_ENTREGA.has(estado)) {
    return res.status(400).json({ error: 'Estado de entrega inválido' });
  }

  const result = await pool.query(
    `UPDATE public.ventas
     SET estado_entrega = $1,
         entregado = CASE WHEN $1 = 'entregado' THEN true ELSE false END
     WHERE id = $2
     RETURNING id, estado_entrega, entregado`,
    [estado, ventaId]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Venta no encontrada' });
  }
  await pool.query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'venta',
      ventaId,
      'actualizar_estado_entrega',
      `Estado de entrega cambiado a ${result.rows[0].estado_entrega}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  return res.json(result.rows[0]);
});
