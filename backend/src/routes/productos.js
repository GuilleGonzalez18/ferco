import { Router } from 'express';
import { query } from '../db.js';
import { getAuthUserFromRequest, hasPermission, requireAuth, requirePermission } from '../auth.js';
import { sendDbError } from '../dbErrors.js';
import {
  firstError, respondIfInvalid,
  validateRequired, validateMaxLength, validateNumber,
} from '../middleware/validate.js';

export const productosRouter = Router();
productosRouter.use(requireAuth);

function toMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function actorName(authUser) {
  const full = `${authUser?.nombre || ''} ${authUser?.apellido || ''}`.trim();
  return full || authUser?.username || authUser?.correo || null;
}

async function getProductoRowById(id) {
  const result = await query(
    `SELECT p.id, p.nombre, ROUND(COALESCE(p.costo, 0), 2)::numeric AS costo, ROUND(COALESCE(p.precio, 0), 2)::numeric AS precio,
            p.stock, p.unidad, p.imagen, p.ean, p.cantidad_empaque, p.empaque_id, p.iva_id, p.activo,
            e.nombre AS empaque_nombre,
            ROUND(COALESCE(p.precio_empaque, 0), 2)::numeric AS precio_empaque,
            ti.nombre AS iva_nombre, ti.porcentaje AS iva_porcentaje, ti.codigo AS iva_codigo
     FROM public.productos p
     LEFT JOIN public.empaques e ON e.id = p.empaque_id
     LEFT JOIN public.tipos_iva ti ON ti.id = p.iva_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

productosRouter.get('/', requirePermission('productos', 'ver'), async (req, res) => {
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
  const authUser = req.authUser ?? getAuthUserFromRequest(req);
  if (includeArchived && !(await hasPermission(authUser, 'productos', 'ver_archivados'))) {
    return res.status(403).json({ error: 'Sin permiso para ver productos archivados' });
  }
  const result = await query(
    `SELECT p.id, p.nombre, ROUND(COALESCE(p.costo, 0), 2)::numeric AS costo, ROUND(COALESCE(p.precio, 0), 2)::numeric AS precio,
            p.stock, p.unidad, p.imagen, p.ean, p.cantidad_empaque, p.empaque_id, p.iva_id, p.activo,
            e.nombre AS empaque_nombre,
            ROUND(COALESCE(p.precio_empaque, 0), 2)::numeric AS precio_empaque,
            ti.nombre AS iva_nombre, ti.porcentaje AS iva_porcentaje, ti.codigo AS iva_codigo
       FROM public.productos p
       LEFT JOIN public.empaques e ON e.id = p.empaque_id
       LEFT JOIN public.tipos_iva ti ON ti.id = p.iva_id
      WHERE ($1::boolean = true OR p.activo = true)
       ORDER BY p.activo DESC, p.id DESC`,
    [includeArchived]
  );
  res.json(result.rows);
});

productosRouter.post('/', requirePermission('productos', 'agregar'), async (req, res) => {
  const {
    nombre,
    costo = 0,
    precio,
    stock,
    unidad = null,
    imagen = null,
    ean,
    cantidad_empaque = null,
    empaque_id = null,
    precio_empaque = 0,
    iva_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);

  const validationErr = firstError(
    validateRequired(nombre, 'Nombre'),
    validateMaxLength(nombre, 255, 'Nombre'),
    validateMaxLength(unidad, 20, 'Unidad'),
    validateMaxLength(ean, 100, 'EAN'),
    validateNumber(precio, 'Precio', { required: true, min: 0 }),
    validateNumber(costo, 'Costo', { min: 0 }),
    validateNumber(precio_empaque, 'Precio de empaque', { min: 0 }),
  );
  if (respondIfInvalid(res, validationErr)) return;

  const costoInt = toMoney(costo);
  const precioInt = toMoney(precio);
  const precioEmpaqueInt = toMoney(precio_empaque);

  const empaqueIdSafe = empaque_id == null || empaque_id === '' ? null : Number(empaque_id);
  if (empaqueIdSafe !== null && (!Number.isInteger(empaqueIdSafe) || empaqueIdSafe <= 0)) {
    return res.status(400).json({ error: 'Empaque inválido' });
  }
  if (empaqueIdSafe !== null) {
    const empaqueQ = await query(
      `SELECT id
       FROM public.empaques
       WHERE id = $1 AND activo = true`,
      [empaqueIdSafe]
    );
    if (!empaqueQ.rowCount) {
      return res.status(400).json({ error: 'Empaque no encontrado o inactivo' });
    }
  }

  const ivaIdSafe = iva_id == null || iva_id === '' ? null : Number(iva_id);
  if (ivaIdSafe !== null && (!Number.isInteger(ivaIdSafe) || ivaIdSafe <= 0)) {
    return res.status(400).json({ error: 'Tipo de IVA inválido' });
  }
  if (ivaIdSafe !== null) {
    const ivaQ = await query(
      `SELECT id FROM public.tipos_iva WHERE id = $1 AND activo = true`,
      [ivaIdSafe]
    );
    if (!ivaQ.rowCount) {
      return res.status(400).json({ error: 'Tipo de IVA no encontrado o inactivo' });
    }
  }

  try {
    const result = await query(
      `INSERT INTO public.productos
        (nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque_id, precio_empaque, iva_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [nombre, costoInt, precioInt, stock, unidad, imagen, ean, cantidad_empaque, empaqueIdSafe, precioEmpaqueInt, ivaIdSafe]
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
    const createdRow = await getProductoRowById(result.rows[0].id);
    return res.status(201).json(createdRow || result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo crear el producto');
  }
});

productosRouter.put('/:id', requirePermission('productos', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de producto inválido' });

  const {
    nombre,
    costo = 0,
    precio,
    stock,
    unidad = null,
    imagen = null,
    ean,
    cantidad_empaque = null,
    empaque_id = null,
    precio_empaque = 0,
    iva_id = null,
  } = req.body;
  const authUser = getAuthUserFromRequest(req);

  const validationErr = firstError(
    validateRequired(nombre, 'Nombre'),
    validateMaxLength(nombre, 255, 'Nombre'),
    validateMaxLength(unidad, 20, 'Unidad'),
    validateMaxLength(ean, 100, 'EAN'),
    validateNumber(precio, 'Precio', { required: true, min: 0 }),
    validateNumber(costo, 'Costo', { min: 0 }),
    validateNumber(precio_empaque, 'Precio de empaque', { min: 0 }),
  );
  if (respondIfInvalid(res, validationErr)) return;

  const costoInt = toMoney(costo);
  const precioInt = toMoney(precio);
  const precioEmpaqueInt = toMoney(precio_empaque);
  const empaqueIdSafe = empaque_id == null || empaque_id === '' ? null : Number(empaque_id);
  if (empaqueIdSafe !== null && (!Number.isInteger(empaqueIdSafe) || empaqueIdSafe <= 0)) {
    return res.status(400).json({ error: 'Empaque inválido' });
  }
  if (empaqueIdSafe !== null) {
    const empaqueQ = await query(
      `SELECT id
       FROM public.empaques
       WHERE id = $1 AND activo = true`,
      [empaqueIdSafe]
    );
    if (!empaqueQ.rowCount) {
      return res.status(400).json({ error: 'Empaque no encontrado o inactivo' });
    }
  }

  const ivaIdSafe = iva_id == null || iva_id === '' ? null : Number(iva_id);
  if (ivaIdSafe !== null && (!Number.isInteger(ivaIdSafe) || ivaIdSafe <= 0)) {
    return res.status(400).json({ error: 'Tipo de IVA inválido' });
  }
  if (ivaIdSafe !== null) {
    const ivaQ = await query(
      `SELECT id FROM public.tipos_iva WHERE id = $1 AND activo = true`,
      [ivaIdSafe]
    );
    if (!ivaQ.rowCount) {
      return res.status(400).json({ error: 'Tipo de IVA no encontrado o inactivo' });
    }
  }

  const prevResult = await query(`SELECT id, nombre, stock FROM public.productos WHERE id = $1 AND activo = true`, [id]);
  if (!prevResult.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  const prev = prevResult.rows[0];

  try {
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
           empaque_id = $9,
           precio_empaque = $10,
           iva_id = $11
       WHERE id = $12
       RETURNING *`,
      [nombre, costoInt, precioInt, stock, unidad, imagen, ean, cantidad_empaque, empaqueIdSafe, precioEmpaqueInt, ivaIdSafe, id]
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
    const updatedRow = await getProductoRowById(id);
    return res.json(updatedRow || result.rows[0]);
  } catch (error) {
    return sendDbError(res, error, 'No se pudo actualizar el producto');
  }
});

productosRouter.delete('/:id', requirePermission('productos', 'eliminar'), async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  const prevResult = await query(`SELECT id, nombre FROM public.productos WHERE id = $1 AND activo = true`, [id]);
  const result = await query(
    `UPDATE public.productos
     SET activo = false
     WHERE id = $1 AND activo = true`,
    [id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  const nombre = prevResult.rows[0]?.nombre || `#${id}`;
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'producto',
        id,
        'archivar',
        `Producto archivado: ${nombre}`,
        authUser?.id || null,
        actorName(authUser),
      ]
  );
  return res.status(204).send();
});

productosRouter.patch('/:id/restaurar', requirePermission('productos', 'eliminar'), async (req, res) => {
  const id = Number(req.params.id);
  const authUser = getAuthUserFromRequest(req);
  const prevResult = await query(`SELECT id, nombre FROM public.productos WHERE id = $1 AND activo = false`, [id]);
  if (!prevResult.rowCount) return res.status(404).json({ error: 'Producto archivado no encontrado' });

  const result = await query(
    `UPDATE public.productos
     SET activo = true
     WHERE id = $1 AND activo = false
     RETURNING id`,
    [id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Producto archivado no encontrado' });

  const nombre = prevResult.rows[0]?.nombre || `#${id}`;
  await query(
    `INSERT INTO public.auditoria_eventos (entidad, entidad_id, accion, detalle, usuario_id, usuario_nombre)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      'producto',
      id,
      'restaurar',
      `Producto restaurado: ${nombre}`,
      authUser?.id || null,
      actorName(authUser),
    ]
  );

  const restoredRow = await getProductoRowById(id);
  return res.json(restoredRow);
});

productosRouter.patch('/:id/stock', requirePermission('stock', 'editar'), async (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body;
  const authUser = getAuthUserFromRequest(req);
  const prev = await query(`SELECT id, nombre, stock FROM public.productos WHERE id = $1 AND activo = true`, [id]);
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

productosRouter.get('/:id/movimientos', requirePermission('stock', 'ver'), async (req, res) => {
  const id = Number(req.params.id);
  const limitRaw = Number(req.query.limit || 10);
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  const result = await query(
    `SELECT id, producto_id, producto_nombre, tipo, origen, cantidad,
            stock_anterior, stock_nuevo, referencia_tipo, referencia_id, detalle, usuario_id, usuario_nombre, created_at
     FROM public.movimientos_stock
     WHERE producto_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [id, limit]
  );
  return res.json(result.rows);
});
