import { query } from '../db.js';

const statements = [
  `
  ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS cliente_id integer,
    ADD COLUMN IF NOT EXISTS fecha_entrega timestamp without time zone,
    ADD COLUMN IF NOT EXISTS medio_pago varchar(20) DEFAULT 'efectivo',
    ADD COLUMN IF NOT EXISTS cancelada boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS entregado boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS estado_entrega varchar(20) DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS observacion text,
    ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS descuento_total_tipo varchar(20) DEFAULT 'ninguno',
    ADD COLUMN IF NOT EXISTS descuento_total_valor numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
  `,
  `
  ALTER TABLE public.clientes
    ADD COLUMN IF NOT EXISTS horario_apertura varchar(5),
    ADD COLUMN IF NOT EXISTS horario_cierre varchar(5);
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

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'ventas_usuario_id_fkey'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
    END IF;
  END$$;
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_fecha_entrega ON public.ventas (fecha_entrega);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_entregado ON public.ventas (entregado);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_estado_entrega ON public.ventas (estado_entrega);
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ventas'
        AND constraint_name = 'ventas_estado_entrega_check'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_estado_entrega_check
      CHECK (estado_entrega IN ('pendiente', 'entregado'));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ventas'
        AND constraint_name = 'ventas_medio_pago_check'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_medio_pago_check
      CHECK (medio_pago IN ('efectivo', 'debito', 'credito', 'transferencia'));
    END IF;
  END $$;
  `,
  `
  UPDATE public.ventas
  SET estado_entrega = CASE
    WHEN entregado IS TRUE THEN 'entregado'
    ELSE COALESCE(NULLIF(estado_entrega, ''), 'pendiente')
  END
  WHERE estado_entrega IS NULL OR estado_entrega = '' OR entregado IS TRUE;
  `,
  `
  CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
    id bigserial PRIMARY KEY,
    entidad varchar(30) NOT NULL,
    entidad_id integer NULL,
    accion varchar(40) NOT NULL,
    detalle text NULL,
    usuario_id integer NULL,
    usuario_nombre varchar(120) NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS public.movimientos_stock (
    id bigserial PRIMARY KEY,
    producto_id integer NOT NULL,
    producto_nombre varchar(180) NULL,
    tipo varchar(20) NOT NULL,
    origen varchar(30) NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    stock_anterior numeric(12,2) NULL,
    stock_nuevo numeric(12,2) NULL,
    referencia_tipo varchar(30) NULL,
    referencia_id integer NULL,
    detalle text NULL,
    usuario_id integer NULL,
    usuario_nombre varchar(120) NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS public.pagos (
    id bigserial PRIMARY KEY,
    venta_id integer NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    medio_pago varchar(20) NOT NULL,
    monto numeric(12,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_pagos_created_at ON public.pagos (created_at DESC);
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'pagos'
        AND constraint_name = 'pagos_medio_pago_check'
    ) THEN
      ALTER TABLE public.pagos
      ADD CONSTRAINT pagos_medio_pago_check
      CHECK (medio_pago IN ('efectivo', 'debito', 'credito', 'transferencia'));
    END IF;
  END $$;
  `,
  `
  UPDATE public.productos
  SET
    costo = ROUND(COALESCE(costo, 0)),
    precio = ROUND(COALESCE(precio, 0)),
    precio_empaque = ROUND(COALESCE(precio_empaque, 0))
  WHERE
    costo <> ROUND(COALESCE(costo, 0))
    OR precio <> ROUND(COALESCE(precio, 0))
    OR precio_empaque <> ROUND(COALESCE(precio_empaque, 0));
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
