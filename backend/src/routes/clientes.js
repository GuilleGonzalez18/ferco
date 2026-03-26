import { Router } from 'express';
import { query } from '../db.js';

export const clientesRouter = Router();

clientesRouter.get('/', async (_req, res) => {
  const result = await query(
    `SELECT id, nombre, rut, direccion, telefono, correo, departamento_id, barrio_id
     FROM public.clientes
     ORDER BY id DESC`
  );
  res.json(result.rows);
});
