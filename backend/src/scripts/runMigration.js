import { query } from '../db.js';

const statements = [
  `
  ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS cliente_id integer,
    ADD COLUMN IF NOT EXISTS fecha_entrega timestamp without time zone,
    ADD COLUMN IF NOT EXISTS observacion text,
    ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS descuento_total_tipo varchar(20) DEFAULT 'ninguno',
    ADD COLUMN IF NOT EXISTS descuento_total_valor numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'ventas_cliente_id_fkey'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
    END IF;
  END$$;
  `,
];

try {
  for (const sql of statements) {
    await query(sql);
  }
  // eslint-disable-next-line no-console
  console.log('Migración aplicada correctamente.');
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Error de migración:', error.message);
  process.exit(1);
}
