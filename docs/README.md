# Mercatus — Documentación Técnica

Sistema de gestión de stock y ventas para empresas de importación y distribución. Frontend en React + Vite, backend en Express + PostgreSQL, base de datos en Supabase.

---

## Índice

- [Tecnologías](#tecnologías)
- [Requisitos previos](#requisitos-previos)
- [Instalación y setup](#instalación-y-setup)
- [Comandos de desarrollo](#comandos-de-desarrollo)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Base de datos](#base-de-datos)
- [Módulos del sistema](#módulos-del-sistema)
- [Deploy](#deploy)
- [Testing](#testing)
- [Convenciones de código](#convenciones-de-código)

---

## Tecnologías

| Capa        | Tecnología            | Versión |
|-------------|-----------------------|---------|
| Frontend    | React + Vite          | 18 / 5  |
| Backend     | Express (ESM)         | 4       |
| Base de datos | PostgreSQL (Supabase)| 15+     |
| Auth        | JWT (jsonwebtoken)    | 9       |
| Hash        | bcryptjs              | 2       |
| Email       | Nodemailer / Brevo    | —       |
| Tests E2E   | Playwright            | —       |
| Tests unit. | Node built-in test    | —       |
| CI/CD       | GitHub Actions        | —       |
| Deploy front | Vercel               | —       |
| Deploy back | Vercel (serverless)   | —       |

---

## Requisitos previos

- **Node.js** 20 o superior
- **PostgreSQL** 14+ (o acceso a Supabase)
- **npm** 9+

---

## Instalación y setup

### 1. Clonar el repositorio

```bash
git clone https://github.com/GuilleGonzalez18/ferco.git
cd ferco-posta
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 4. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con los valores reales

# Frontend
cp frontend/.env.example frontend/.env
# Editar frontend/.env con la URL del backend
```

Ver [env-reference.md](./env-reference.md) para la descripción detallada de cada variable.

### 5. Crear el schema de base de datos

```bash
cd backend
npm run db:setup
```

Esto ejecuta `bootstrapSchema.js` (crea tablas) y luego `runMigration.js` (aplica columnas adicionales).

### 6. Levantar en modo desarrollo

En dos terminales separadas:

```bash
# Terminal 1 — Backend (puerto 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend
npm run dev
```

Abrir `http://localhost:5173` en el navegador.

---

## Comandos de desarrollo

### Backend (`cd backend`)

| Comando            | Descripción |
|--------------------|-------------|
| `npm run dev`      | Servidor con hot-reload (`node --watch`) en puerto 3001 |
| `npm run start`    | Servidor en modo producción |
| `npm test`         | Corre tests unitarios (validate, auth, cfeHelpers, pbt) |
| `npm run db:setup` | Primer setup: crea schema + ejecuta migraciones |
| `npm run db:schema`| Solo crea tablas (idempotente) |
| `npm run db:migrate`| Solo aplica migraciones de columnas |
| `npm run db:seed:test` | Carga datos de prueba (clientes + ventas) |
| `npm run db:export`| Exporta la DB a un archivo SQL (`db-export.sql`) |
| `npm run db:import`| Restaura la DB desde un archivo SQL |

### Frontend (`cd frontend`)

| Comando              | Descripción |
|----------------------|-------------|
| `npm run dev`        | Servidor de desarrollo Vite en puerto 5173 |
| `npm run build`      | Build de producción en `dist/` |
| `npm run lint`       | ESLint sobre el código fuente |
| `npm run preview`    | Preview del build de producción |

### E2E (desde la raíz)

| Comando                       | Descripción |
|-------------------------------|-------------|
| `npx playwright test`         | Corre todos los tests E2E |
| `npx playwright test --ui`    | Modo interactivo con interfaz visual |
| `npx playwright show-report`  | Abre el último reporte HTML |

---

## Arquitectura del sistema

### Diagrama general

```
Browser
  │
  ▼
React SPA (Vite)
  │  HTTP/JSON (JWT en Authorization header)
  ▼
Express API (/api/*)
  │
  ├── PostgreSQL (Supabase) — datos principales
  ├── Brevo/SMTP — envío de correos
  └── DGI / API Módulo Dynamica — CFE (facturación electrónica)
```

### Frontend — navegación por pantallas

El frontend **no usa React Router**. La navegación se basa en un string `pantalla` en el estado de `App.jsx`. Cada módulo vive en `frontend/src/features/<módulo>/`.

Para agregar una pantalla nueva:
1. Crear `frontend/src/features/<nombre>/` con el componente principal
2. Agregar el caso en el switch de `App.jsx`
3. Agregar el ítem en el menú lateral

### API Layer

Todas las llamadas HTTP van por `frontend/src/core/api.js`. Este módulo wrappea `fetch` con:
- Headers de JWT automáticos
- Manejo de errores centralizado
- Funciones tipadas por endpoint

**Nunca llamar `fetch` directamente desde componentes.** Siempre agregar la función en `api.js`.

### Sistema de modales

Los modales globales se manejan a través de:
- `frontend/src/shared/lib/appDialog.js` — disparador imperativo (`appDialog.open(...)`)
- `frontend/src/shared/components/dialog/AppDialogHost.jsx` — renderer montado en `App.jsx`

### Autenticación

- El JWT se almacena en `localStorage`
- Al cargar la app, `App.jsx` restaura la sesión desde el token
- El middleware `auth.js` del backend verifica el token en cada ruta protegida
- Los roles disponibles son `propietario` y `vendedor`
- Los propietarios tienen acceso a todo; los vendedores tienen permisos granulares

### Backend — estructura de rutas

Todas las rutas se montan en `/api/<recurso>`:

| Ruta                  | Archivo                      | Descripción |
|-----------------------|------------------------------|-------------|
| `/api/productos`      | `routes/productos.js`        | CRUD + ajuste de stock |
| `/api/ventas`         | `routes/ventas.js`           | Ventas, historial, estadísticas, CFE |
| `/api/clientes`       | `routes/clientes.js`         | CRUD de clientes |
| `/api/usuarios`       | `routes/usuarios.js`         | Usuarios, login, reset de contraseña |
| `/api/auditoria`      | `routes/auditoria.js`        | Log de auditoría + movimientos de stock |
| `/api/empaques`       | `routes/empaques.js`         | CRUD de tipos de empaque |
| `/api/tipos-iva`      | `routes/tipos-iva.js`        | CRUD de tipos de IVA |
| `/api/configuracion`  | `routes/configuracion.js`    | Config empresa, módulos, ganancias |
| `/api/permisos`       | `routes/permisos.js`         | Gestión de permisos por rol |
| `/api/ubicaciones`    | `routes/ubicaciones.js`      | Departamentos/ciudades |

---

## Base de datos

### Tablas principales

| Tabla                    | Descripción |
|--------------------------|-------------|
| `usuarios`               | Usuarios del sistema con roles |
| `roles`                  | Roles del sistema (propietario, vendedor) |
| `permisos`               | Permisos granulares por rol y módulo |
| `clientes`               | Clientes de la empresa |
| `productos`              | Catálogo de productos con stock |
| `empaques`               | Tipos de empaque (caja, funda, etc.) |
| `tipos_iva`              | Tipos de IVA (22%, 10%, exento) |
| `ventas`                 | Cabecera de ventas |
| `venta_detalle`          | Líneas de cada venta |
| `venta_pagos`            | Medios de pago de cada venta |
| `movimientos_stock`      | Historial completo de movimientos de stock |
| `auditoria`              | Log de acciones del sistema |
| `config_empresa`         | Configuración de la empresa (nombre, logo, colores, CFE) |
| `config_modulos`         | Qué módulos están habilitados |
| `config_ganancias`       | Método de cálculo de ganancias activo |
| `config_ganancias_metodos` | Catálogo de métodos de cálculo |
| `departamentos`          | Departamentos del Uruguay |
| `ubicaciones`            | Ciudades/localidades |

### Patrones de datos

- **Soft delete**: la mayoría de entidades usa un flag `activo boolean` en lugar de borrar filas
- **Movimientos de stock**: cada cambio de stock se registra en `movimientos_stock` con costo y precio
- **Auditoría**: las acciones del usuario se registran en la tabla `auditoria`

### Agregar columnas

Las columnas nuevas van en `backend/src/scripts/runMigration.js` usando `ADD COLUMN IF NOT EXISTS`. Nunca modificar `bootstrapSchema.js` para agregar columnas (ese archivo solo usa `CREATE TABLE IF NOT EXISTS`).

---

## Módulos del sistema

| Módulo          | Descripción |
|-----------------|-------------|
| **Dashboard**   | Resumen diario: ventas, stock bajo, gráficos |
| **Nueva Venta** | POS: búsqueda de productos, carrito, pagos, emisión de CFE |
| **Historial**   | Listado de ventas con reimpresión y cancelación |
| **Productos**   | ABM de productos con imagen, stock, IVA y empaques |
| **Clientes**    | ABM de clientes con datos DGI (tipo/número documento) |
| **Stock**       | Ajustes manuales de stock con movimientos |
| **Estadísticas**| Gráficos de ventas y rentabilidad por período |
| **Auditoría**   | Log de acciones del sistema |
| **Usuarios**    | ABM de usuarios con roles y permisos |
| **Configuración**| Empresa, módulos, ganancias, colores, CFE |

---

## Deploy

### Frontend (Vercel)

El frontend se deploya automáticamente desde la rama `main` via Vercel. La variable `VITE_API_URL` debe apuntar al backend deployado.

### Backend (Vercel Serverless)

Ver `backend/vercel.json`. El backend exporta la app Express como función serverless.

Variables de entorno a configurar en el dashboard de Vercel:
- Todas las variables del grupo `PG*` (base de datos Supabase)
- `JWT_SECRET`
- `CORS_ORIGIN` (URL del frontend en Vercel)
- Variables de CFE si corresponde

> **Nota sobre la DB**: En modo serverless usar el **Transaction Pooler** de Supabase (puerto 6543, no 5432) para evitar agotamiento de conexiones.

---

## Testing

### Tests unitarios (backend)

```bash
cd backend
npm test
```

Cubre: validaciones de input, lógica de auth JWT, helpers de CFE, property-based tests.

### Tests E2E (Playwright)

Los tests E2E requieren que tanto el frontend como el backend estén corriendo.

```bash
# Configurar en .env.test (raíz del proyecto)
E2E_ADMIN_EMAIL=admin@test.com
E2E_ADMIN_PASSWORD=tu-password

# Correr tests
npx playwright test
```

Ver `playwright.config.js` para la configuración de baseURL y browsers.

---

## Convenciones de código

- **Conventional Commits**: todos los commits usan el formato `feat:`, `fix:`, `chore:`, etc.
- **Semantic Release**: en push a `main` se auto-genera tag y changelog
- **ESLint**: corre en CI sobre el frontend
- **ESM**: el backend usa `"type": "module"` — todos los imports deben tener extensión `.js`
- **SQL parametrizado**: todas las queries usan `$1, $2, ...` — sin interpolación de strings
- **Sin ORM**: acceso directo con el driver `pg`
