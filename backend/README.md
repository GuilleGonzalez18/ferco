# Backend (PostgreSQL + REST)

## 1) Preparar variables

1. Copiar:

```bash
cp .env.example .env
```

2. Editar `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
3. Si quieres importar el dump, configurar `DUMP_FILE` con ruta absoluta.

## 2) Instalar dependencias

```bash
npm install
```

## 3) Importar tu dump actual (opcional, recomendado)

Requiere `psql` disponible en PATH.

```bash
npm run db:import
```

## 4) Ejecutar migración incremental

Agrega columnas de ventas para soportar cliente/entrega/total/descuentos:

```bash
npm run db:migrate
```

## 5) Levantar API

```bash
npm run dev
```

Health:

```bash
GET http://localhost:3001/api/health
```

## Endpoints iniciales

- `GET /api/productos`
- `POST /api/productos`
- `PATCH /api/productos/:id/stock`
- `GET /api/clientes`
- `GET /api/usuarios`
- `POST /api/usuarios/login`
- `GET /api/ventas`
- `POST /api/ventas`

`POST /api/ventas` descuenta stock y crea venta + detalle dentro de transacción.
