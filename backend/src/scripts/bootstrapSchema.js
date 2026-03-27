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
  CREATE TABLE IF NOT EXISTS public.clientes (
    id serial PRIMARY KEY,
    nombre varchar(180) NOT NULL,
    rut varchar(80) NULL,
    direccion text NULL,
    telefono varchar(50) NULL,
    correo varchar(180) NULL,
    departamento_id integer NULL,
    barrio_id integer NULL
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_clientes_nombre ON public.clientes (nombre);
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
    empaque varchar(80) NULL,
    precio_empaque numeric(12,2) NOT NULL DEFAULT 0
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_productos_nombre ON public.productos (nombre);
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
    venta_id integer NOT NULL,
    medio_pago varchar(20) NOT NULL,
    monto numeric(12,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS ix_pagos_venta ON public.pagos (venta_id);
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'pagos'
        AND constraint_name = 'pagos_venta_id_fkey'
    ) THEN
      ALTER TABLE public.pagos
      ADD CONSTRAINT pagos_venta_id_fkey
      FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;
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
];

try {
  for (const sql of statements) {
    await query(sql);
  }
  // eslint-disable-next-line no-console
  console.log('Schema bootstrap aplicado correctamente.');
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Error aplicando schema bootstrap:', error.message);
  process.exit(1);
}

