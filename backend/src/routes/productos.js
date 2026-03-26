import { Router } from 'express';
import { query } from '../db.js';

export const productosRouter = Router();

productosRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque
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

  const result = await query(
    `INSERT INTO public.productos
      (nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque]
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
    [nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque, id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(result.rows[0]);
});

productosRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await query(`DELETE FROM public.productos WHERE id = $1`, [id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.status(204).send();
});

productosRouter.patch('/:id/stock', async (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body;
  const result = await query(
    `UPDATE public.productos SET stock = $1 WHERE id = $2 RETURNING *`,
    [stock, id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(result.rows[0]);
});
