import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest } from '../auth.js';

export const productosRouter = Router();

function toMoneyInt(value) {
  return Math.round(Number(value || 0));
}

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

productosRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, ROUND(COALESCE(costo, 0))::int AS costo, ROUND(COALESCE(precio, 0))::int AS precio,
            stock, unidad, imagen, ean, cantidad_empaque, empaque, ROUND(COALESCE(precio_empaque, 0))::int AS precio_empaque
     FROM public.productos
     ORDER BY id DESC`
  );
  res.json(result.rows);
});

productosRouter.post('/', async (req, res) => {
  const {
    nombre,
    costo = 0,
    precio,
    stock,
    unidad = null,
    imagen = null,
    ean,
    cantidad_empaque = null,
    empaque = null,
    precio_empaque = 0,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const costoInt = toMoneyInt(costo);
  const precioInt = toMoneyInt(precio);
  const precioEmpaqueInt = toMoneyInt(precio_empaque);

  const result = await query(
    `INSERT INTO public.productos
      (nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [nombre, costoInt, precioInt, stock, unidad, imagen, ean, cantidad_empaque, empaque, precioEmpaqueInt]
  );
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'producto',
      result.rows[0].id,
      'crear',
      `Producto creado: ${result.rows[0].nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  await query(
    `INSERT INTO public.movimientos_stock
      (producto_id, producto_nombre, tipo, origen, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      result.rows[0].id,
      result.rows[0].nombre,
      'entrada',
      'creacion_producto',
      Number(result.rows[0].stock || 0),
      0,
      Number(result.rows[0].stock || 0),
      'producto',
      result.rows[0].id,
      'Stock inicial al crear producto',
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  res.status(201).json(result.rows[0]);
});

productosRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    nombre,
    costo = 0,
    precio,
    stock,
    unidad = null,
    imagen = null,
    ean,
    cantidad_empaque = null,
    empaque = null,
    precio_empaque = 0,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const costoInt = toMoneyInt(costo);
  const precioInt = toMoneyInt(precio);
  const precioEmpaqueInt = toMoneyInt(precio_empaque);
  const prevResult = await query(`SELECT id, nombre, stock FROM public.productos WHERE id = $1`, [id]);
  if (!prevResult.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  const prev = prevResult.rows[0];

  const result = await query(
    `UPDATE public.productos
     SET nombre = $1,
         costo = $2,
         precio = $3,
         stock = $4,
         unidad = $5,
         imagen = $6,
         ean = $7,
         cantidad_empaque = $8,
         empaque = $9,
         precio_empaque = $10
     WHERE id = $11
     RETURNING *`,
    [nombre, costoInt, precioInt, stock, unidad, imagen, ean, cantidad_empaque, empaque, precioEmpaqueInt, id]
  );
  const actualizado = result.rows[0];
  const stockAnterior = Number(prev.stock || 0);
  const stockNuevo = Number(actualizado.stock || 0);
  const delta = stockNuevo - stockAnterior;
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'producto',
      id,
      'editar',
      `Producto editado: ${actualizado.nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  if (delta !== 0) {
    await query(
      `INSERT INTO public.movimientos_stock
        (producto_id, producto_nombre, tipo, origen, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        actualizado.id,
        actualizado.nombre,
        delta > 0 ? 'entrada' : 'salida',
        'ajuste_manual',
        Math.abs(delta),
        stockAnterior,
        stockNuevo,
        'producto',
        actualizado.id,
        'Ajuste manual de stock en edición de producto',
        authUser?.id || null,
        actorName(authUser),
      ]
    );
  }
  return res.json(result.rows[0]);
});

productosRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  const prevResult = await query(`SELECT id, nombre FROM public.productos WHERE id = $1`, [id]);
  const result = await query(`DELETE FROM public.productos WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  const nombre = prevResult.rows[0]?.nombre || `#${id}`;
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'producto',
      id,
      'eliminar',
      `Producto eliminado: ${nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );
  return res.status(204).send();
});

productosRouter.patch('/:id/stock', async (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const prev = await query(`SELECT id, nombre, stock FROM public.productos WHERE id = $1`, [id]);
  if (!prev.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  const stockAnterior = Number(prev.rows[0].stock || 0);
  const stockNuevo = Number(stock || 0);
  const delta = stockNuevo - stockAnterior;
  const result = await query(
    `UPDATE public.productos SET stock = $1 WHERE id = $2 RETURNING *`,
    [stock, id]
  );
  if (delta !== 0) {
    await query(
      `INSERT INTO public.movimientos_stock
        (producto_id, producto_nombre, tipo, origen, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        prev.rows[0].nombre || null,
        delta > 0 ? 'entrada' : 'salida',
        'ajuste_stock',
        Math.abs(delta),
        stockAnterior,
        stockNuevo,
        'producto',
        id,
        'Ajuste de stock directo',
        authUser?.id || null,
        actorName(authUser),
      ]
    );
    await query(
      `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'stock',
        id,
        'ajustar',
        `Stock de ${prev.rows[0].nombre || `producto #${id}`} ajustado ${stockAnterior} -> ${stockNuevo}`,
        authUser?.id || null,
        actorName(authUser),
      ]
    );
  }
  return res.json(result.rows[0]);
});
