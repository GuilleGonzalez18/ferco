import { query } from '../db.js';

const statements = [
  `
  CREATE TABLE IF NOT EXISTS public.usuarios (
    id serial PRIMARY KEY,
    username varchar(80) NOT NULL,
    password varchar(255) NOT NULL,
    tipo varchar(30) NOT NULL DEFAULT 'vendedor',
    nombre varchar(120) NULL,
    apellido varchar(120) NULL,
    correo varchar(180) NOT NULL,
    telefono varchar(50) NULL,
    direccion text NULL
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_username ON public.usuarios (username);
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_correo ON public.usuarios (correo);
  `,
  `
  CREATE TABLE IF NOT EXISTS public.departamentos (
    id serial PRIMARY KEY,
    nombre varchar(120) NOT NULL
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS departamentos_nombre_key ON public.departamentos (nombre);
  `,
  `
  CREATE TABLE IF NOT EXISTS public.clientes (
    id serial PRIMARY KEY,
    nombre varchar(180) NOT NULL,
    rut varchar(80) NULL,
    direccion text NULL,
    telefono varchar(50) NULL,
    correo varchar(180) NULL,
    horario_apertura varchar(5) NULL,
    horario_cierre varchar(5) NULL,
    tiene_reapertura boolean NOT NULL DEFAULT false,
    horario_reapertura varchar(5) NULL,
    horario_cierre_reapertura varchar(5) NULL,
    departamento_id integer NULL,
    barrio_id integer NULL
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_clientes_nombre ON public.clientes (nombre);
  `,
  `
  CREATE TABLE IF NOT EXISTS public.barrios (
    id serial PRIMARY KEY,
    nombre varchar(120) NOT NULL,
    departamento_id integer NULL
  );
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'barrios'
        AND constraint_name = 'barrios_departamento_id_fkey'
    ) THEN
      ALTER TABLE public.barrios
      ADD CONSTRAINT barrios_departamento_id_fkey
      FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE CASCADE;
    END IF;
  END $$;
  `,
  `
  CREATE TABLE IF NOT EXISTS public.productos (
    id serial PRIMARY KEY,
    nombre varchar(180) NOT NULL,
    costo numeric(12,2) NOT NULL DEFAULT 0,
    precio numeric(12,2) NOT NULL DEFAULT 0,
    stock numeric(12,2) NOT NULL DEFAULT 0,
    unidad varchar(30) NULL,
    imagen text NULL,
    ean varchar(80) NULL,
    cantidad_empaque integer NULL,
    precio_empaque numeric(12,2) NOT NULL DEFAULT 0,
    empaque_id integer NULL
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_productos_nombre ON public.productos (nombre);
  `,
  `
  ALTER TABLE public.productos
  DROP COLUMN IF EXISTS empaque;
  `,
  `
  CREATE TABLE IF NOT EXISTS public.empaques (
    id serial PRIMARY KEY,
    nombre varchar(120) NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS empaques_nombre_key ON public.empaques (nombre);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_empaques_nombre ON public.empaques (nombre);
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS productos_ean_unique
    ON public.productos (ean)
    WHERE ean IS NOT NULL;
  `,
  `
  CREATE TABLE IF NOT EXISTS public.ventas (
    id serial PRIMARY KEY,
    usuario_id integer NULL,
    cliente_id integer NULL,
    fecha timestamp without time zone NOT NULL DEFAULT now(),
    fecha_entrega timestamp without time zone NULL,
    medio_pago varchar(20) NOT NULL DEFAULT 'efectivo',
    cancelada boolean NOT NULL DEFAULT false,
    entregado boolean NOT NULL DEFAULT false,
    estado_entrega varchar(20) NOT NULL DEFAULT 'pendiente',
    observacion text NULL,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    descuento_total_tipo varchar(20) NOT NULL DEFAULT 'ninguno',
    descuento_total_valor numeric(12,2) NOT NULL DEFAULT 0,
    total numeric(12,2) NOT NULL DEFAULT 0
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_fecha ON public.ventas (fecha);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_cliente ON public.ventas (cliente_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_usuario ON public.ventas (usuario_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_ventas_cancelada ON public.ventas (cancelada);
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
  ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tiene_reapertura boolean NOT NULL DEFAULT false;
  `,
  `
  ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS horario_reapertura varchar(5) NULL;
  `,
  `
  ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS horario_cierre_reapertura varchar(5) NULL;
  `,
  `
  UPDATE public.ventas
  SET
    estado_entrega = CASE
      WHEN entregado IS TRUE THEN 'entregado'
      WHEN COALESCE(NULLIF(TRIM(LOWER(estado_entrega)), ''), 'pendiente') = 'entregado' THEN 'entregado'
      ELSE 'pendiente'
    END,
    medio_pago = CASE
      WHEN COALESCE(NULLIF(TRIM(LOWER(medio_pago)), ''), 'efectivo') IN ('efectivo', 'debito', 'credito', 'transferencia')
        THEN COALESCE(NULLIF(TRIM(LOWER(medio_pago)), ''), 'efectivo')
      ELSE 'efectivo'
    END
  WHERE estado_entrega IS NULL
     OR estado_entrega = ''
     OR LOWER(TRIM(COALESCE(estado_entrega, ''))) NOT IN ('pendiente', 'entregado', 'cancelado')
     OR entregado IS TRUE
     OR medio_pago IS NULL
     OR TRIM(medio_pago) = ''
     OR LOWER(TRIM(medio_pago)) NOT IN ('efectivo', 'debito', 'credito', 'transferencia');
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ventas'
        AND constraint_name = 'ventas_cliente_id_fkey'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ventas'
        AND constraint_name = 'ventas_usuario_id_fkey'
    ) THEN
      ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'clientes'
        AND constraint_name = 'clientes_departamento_id_fkey'
    ) THEN
      ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_departamento_id_fkey
      FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'clientes'
        AND constraint_name = 'clientes_barrio_id_fkey'
    ) THEN
      ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_barrio_id_fkey
      FOREIGN KEY (barrio_id) REFERENCES public.barrios(id) ON DELETE SET NULL;
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'productos'
        AND constraint_name = 'productos_empaque_id_fkey'
    ) THEN
      ALTER TABLE public.productos
      ADD CONSTRAINT productos_empaque_id_fkey
      FOREIGN KEY (empaque_id) REFERENCES public.empaques(id);
    END IF;
  END $$;
  `,
  `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ventas'
        AND constraint_name = 'ventas_estado_entrega_check'
    ) THEN
      ALTER TABLE public.ventas
      DROP CONSTRAINT ventas_estado_entrega_check;
    END IF;

    ALTER TABLE public.ventas
    ADD CONSTRAINT ventas_estado_entrega_check
    CHECK (estado_entrega IN ('pendiente', 'entregado', 'cancelado'));

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
  CREATE TABLE IF NOT EXISTS public.venta_detalle (
    id serial PRIMARY KEY,
    venta_id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_venta_detalle_venta ON public.venta_detalle (venta_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_venta_detalle_producto ON public.venta_detalle (producto_id);
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'venta_detalle'
        AND constraint_name = 'venta_detalle_venta_id_fkey'
    ) THEN
      ALTER TABLE public.venta_detalle
      ADD CONSTRAINT venta_detalle_venta_id_fkey
      FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'venta_detalle'
        AND constraint_name = 'venta_detalle_producto_id_fkey'
    ) THEN
      ALTER TABLE public.venta_detalle
      ADD CONSTRAINT venta_detalle_producto_id_fkey
      FOREIGN KEY (producto_id) REFERENCES public.productos(id);
    END IF;
  END $$;
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
  CREATE INDEX IF NOT EXISTS ix_auditoria_created_at ON public.auditoria_eventos (created_at DESC);
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
  CREATE INDEX IF NOT EXISTS ix_movimientos_stock_created_at ON public.movimientos_stock (created_at DESC);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_movimientos_stock_producto ON public.movimientos_stock (producto_id);
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
  CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id bigserial PRIMARY KEY,
    usuario_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_usuario ON public.password_reset_tokens (usuario_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires ON public.password_reset_tokens (expires_at);
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS ux_password_reset_tokens_hash ON public.password_reset_tokens (token_hash);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_pagos_venta ON public.pagos (venta_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_pagos_created_at ON public.pagos (created_at DESC);
  `,
  `
  UPDATE public.pagos
  SET medio_pago = CASE
    WHEN COALESCE(NULLIF(TRIM(LOWER(medio_pago)), ''), 'efectivo') IN ('efectivo', 'debito', 'credito', 'transferencia')
      THEN COALESCE(NULLIF(TRIM(LOWER(medio_pago)), ''), 'efectivo')
    ELSE 'efectivo'
  END
  WHERE medio_pago IS NULL
     OR TRIM(medio_pago) = ''
     OR LOWER(TRIM(medio_pago)) NOT IN ('efectivo', 'debito', 'credito', 'transferencia');
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
