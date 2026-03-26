import { Router } from 'express';
import { query } from '../db.js';

export const productosRouter = Router();

productosRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque
     FROM public.productos
     ORDER BY id DESC`
  );
  res.json(result.rows);
});

productosRouter.post('/', async (req, res) => {
  const {
    nombre,
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
      (nombre, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [nombre, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque]
  );
  res.status(201).json(result.rows[0]);
});

productosRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    nombre,
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
         precio = $2,
         stock = $3,
         unidad = $4,
         imagen = $5,
         ean = $6,
         cantidad_empaque = $7,
         empaque = $8,
         precio_empaque = $9
     WHERE id = $10
     RETURNING *`,
    [nombre, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque, id]
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
