# Referencia de Variables de Entorno

Todas las variables de entorno del proyecto Mercatus, agrupadas por componente.

---

## Backend (`backend/.env`)

Copiar `backend/.env.example` a `backend/.env` y completar los valores.

### Base de datos (PostgreSQL)

| Variable      | Requerida | Default       | Descripción |
|---------------|-----------|---------------|-------------|
| `PGHOST`      | ✅        | `localhost`   | Host del servidor PostgreSQL. Para Supabase en producción usar el Transaction Pooler. |
| `PGPORT`      | ✅        | `5432`        | Puerto PostgreSQL. En Supabase serverless usar `6543` (Transaction Pooler). |
| `PGDATABASE`  | ✅        | `mercatus_db` | Nombre de la base de datos. |
| `PGUSER`      | ✅        | `postgres`    | Usuario de PostgreSQL. |
| `PGPASSWORD`  | ✅        | —             | Contraseña de PostgreSQL. |

> **Nota Supabase**: Para deploy serverless (Vercel), usar el **Transaction Pooler** de Supabase (puerto 6543) para evitar agotamiento de conexiones. El host del Transaction Pooler se encuentra en el dashboard de Supabase → Settings → Database → Connection string (Transaction pooler).

### Variables legacy de DB (compatibilidad)

Estas variables son alias de las `PG*`. Algunos scripts viejos las usan.

| Variable     | Descripción |
|--------------|-------------|
| `DB_HOST`    | Igual que `PGHOST` |
| `DB_PORT`    | Igual que `PGPORT` |
| `DB_NAME`    | Igual que `PGDATABASE` |
| `DB_USER`    | Igual que `PGUSER` |
| `DB_PASSWORD`| Igual que `PGPASSWORD` |

### Servidor HTTP

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `PORT`   | ❌        | `3001`  | Puerto en el que escucha el backend. |

### Autenticación JWT

| Variable         | Requerida | Default | Descripción |
|------------------|-----------|---------|-------------|
| `JWT_SECRET`     | ✅        | —       | Clave secreta para firmar tokens JWT. Debe ser larga, aleatoria y confidencial. Nunca dejar vacía ni usar valores de ejemplo. |
| `JWT_EXPIRES_IN` | ❌        | `7d`    | Duración del token JWT. Formatos aceptados: `30d`, `24h`, `60m`. |

### CORS

| Variable      | Requerida | Default                   | Descripción |
|---------------|-----------|---------------------------|-------------|
| `CORS_ORIGIN` | ✅        | `http://localhost:5173`   | Orígenes permitidos para el frontend. Separar múltiples valores con coma. Ejemplo: `https://mercatus.vercel.app,http://localhost:5173`. Si queda vacío, el backend bloquea requests cross-origin del navegador. |

### Email (SMTP / Brevo)

Requerido para el reset de contraseña por código y otras notificaciones.

| Variable      | Requerida | Default                 | Descripción |
|---------------|-----------|-------------------------|-------------|
| `SMTP_HOST`   | ❌        | —                       | Host SMTP. Para Brevo: `smtp-relay.brevo.com`. |
| `SMTP_PORT`   | ❌        | `587`                   | Puerto SMTP. `587` para TLS/STARTTLS, `465` para SSL directo. |
| `SMTP_USER`   | ❌        | —                       | Usuario o login SMTP. |
| `SMTP_PASS`   | ❌        | —                       | Contraseña o API key SMTP. |
| `SMTP_SECURE` | ❌        | `false`                 | `true` para SSL directo (puerto 465), `false` para STARTTLS (puerto 587). |
| `SMTP_FROM`   | ❌        | —                       | Remitente visible. Ejemplo: `Mercatus <no-reply@mercatus.uy>`. |
| `BREVO_API_KEY`| ❌       | —                       | API Key de Brevo para envío HTTP (recomendado en producción, evita problemas de puertos bloqueados). Si está definida, se usa en lugar de SMTP. |

### Reset de contraseña

| Variable                | Requerida | Default | Descripción |
|-------------------------|-----------|---------|-------------|
| `RESET_CODE_TTL_MINUTES`| ❌        | `10`    | Minutos de validez del código de recuperación de contraseña enviado por correo. |

### CFE — Facturación Electrónica DGI

El sistema soporta tres ambientes de emisión de CFE (Comprobante Fiscal Electrónico) via la API Módulo de Dynamica.

| Variable              | Requerida | Default  | Descripción |
|-----------------------|-----------|----------|-------------|
| `CFE_HABILITADO`      | ❌        | `false`  | Master switch de CFE. `true` para habilitar el envío real. En producción, modificar solo desde el servidor/Vercel. El botón de "Emitir CFE" en la UI se habilita/deshabilita según esta variable. |
| `CFE_TIMEOUT_MS`      | ❌        | `20000`  | Timeout en milisegundos para las llamadas a la API de CFE. Por defecto 20 segundos. |
| `CFE_API_URL`         | ❌        | —        | URL del endpoint para el ambiente **LOCAL** (genera JSON sin enviar a DGI). |
| `CFE_API_TOKEN`       | ❌        | —        | Token de autorización para el ambiente LOCAL. |
| `CFE_PRUEBAS_URL`     | ❌        | —        | URL del endpoint para el ambiente **PRUEBAS** de la API Módulo Dynamica. |
| `CFE_PRUEBAS_TOKEN`   | ❌        | —        | Token de autorización para el ambiente PRUEBAS. |
| `CFE_PRODUCCION_URL`  | ❌        | —        | URL del endpoint para el ambiente **PRODUCCIÓN** de la API Módulo Dynamica. |
| `CFE_PRODUCCION_TOKEN`| ❌        | —        | Token de autorización para el ambiente PRODUCCIÓN. |

> **Importante**: El ambiente activo se selecciona desde la pantalla de Configuración en la UI (campo `cfe_ambiente` en `config_empresa`). Los valores posibles son `local`, `pruebas` y `produccion`.

> **Advertencia**: Activar el ambiente `produccion` registra todas las transacciones ante la DGI. Solo hacerlo después de completar el proceso de Testing y Homologación.

### Scripts de dump/import

| Variable       | Requerida | Default        | Descripción |
|----------------|-----------|----------------|-------------|
| `DUMP_FILE`    | ❌        | `db-export.sql`| Ruta del archivo SQL para `db:export` y `db:import`. |
| `PG_DUMP_BIN`  | ❌        | `pg_dump`      | Ruta al binario `pg_dump`. Si ya está en PATH, no es necesario. |
| `PSQL_BIN`     | ❌        | `psql`         | Ruta al binario `psql`. Si ya está en PATH, no es necesario. |

### Seeds de datos de prueba

| Variable         | Requerida | Default | Descripción |
|------------------|-----------|---------|-------------|
| `SEED_PRODUCTOS` | ❌        | `45`    | Cantidad de productos a generar con `db:seed:test`. |
| `SEED_CLIENTES`  | ❌        | `80`    | Cantidad de clientes a generar con `db:seed:test`. |
| `SEED_VENTAS`    | ❌        | `320`   | Cantidad de ventas a generar con `db:seed:test`. |

---

## Frontend (`frontend/.env`)

Copiar `frontend/.env.example` a `frontend/.env` y completar los valores.

Las variables del frontend deben tener el prefijo `VITE_` para ser accesibles desde el código cliente.

| Variable          | Requerida | Default                        | Descripción |
|-------------------|-----------|--------------------------------|-------------|
| `VITE_API_URL`    | ✅        | `http://localhost:3001/api`    | URL base del backend incluyendo `/api`. En producción: `https://tu-backend.vercel.app/api`. |
| `VITE_AVISOS_URL` | ❌        | `https://rpg-avisos.onrender.com` | URL del microservicio de avisos RPG (notificaciones globales del sistema). |

---

## Tests E2E (`.env.test` en la raíz)

Requerido para correr los tests de Playwright.

| Variable            | Requerida | Descripción |
|---------------------|-----------|-------------|
| `E2E_ADMIN_EMAIL`   | ✅        | Email del usuario administrador/propietario para los tests. Debe existir en la DB de test. |
| `E2E_ADMIN_PASSWORD`| ✅        | Contraseña del usuario administrador para los tests. |

> **Nota**: Este archivo `.env.test` va en la raíz del proyecto (donde está `playwright.config.js`). No confundir con `backend/.env` ni `frontend/.env`.

---

## Resumen rápido por entorno

### Mínimo para desarrollo local

```env
# backend/.env
PGHOST=localhost
PGPORT=5432
PGDATABASE=mercatus_db
PGUSER=postgres
PGPASSWORD=tu_password
JWT_SECRET=secreto_muy_largo_y_aleatorio
CORS_ORIGIN=http://localhost:5173

# frontend/.env
VITE_API_URL=http://localhost:3001/api
```

### Para producción (Vercel)

Configurar en el dashboard de Vercel (Settings → Environment Variables):

```
PGHOST          → host del Transaction Pooler de Supabase
PGPORT          → 6543
PGDATABASE      → nombre de la DB
PGUSER          → usuario de Supabase
PGPASSWORD      → contraseña de Supabase
JWT_SECRET      → valor secreto generado aleatoriamente
CORS_ORIGIN     → https://tu-frontend.vercel.app
CFE_HABILITADO  → true (solo cuando esté listo para producción)
BREVO_API_KEY   → clave de Brevo (para emails)
```
