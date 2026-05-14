# Component Inventory

## Application Packages
- `frontend` - SPA React/Vite para operacion del negocio.
- `backend` - API Express/PostgreSQL con logica transaccional.
- `root release workspace` - automatizacion de releases y scripts de soporte.

## Infrastructure Packages
- No se detectaron paquetes de infraestructura dedicados (CDK, Terraform o CloudFormation).

## Shared Packages
- `frontend/src/core` - contexto de configuracion, permisos y cliente API.
- `frontend/src/shared` - componentes UI reutilizables y utilidades visuales.
- `backend/src/scripts` - utilidades operativas para esquema, migracion y dumps.
- `backend support modules` - `auth.js`, `db.js`, `mailer.js`, `cfeBuilder.js`, `gananciaCalculator.js`, `dbErrors.js`.

## Test Packages
- No se detectaron paquetes de pruebas automatizadas dedicados.

## Total Count
- **Total Packages**: 8
- **Application**: 3
- **Infrastructure**: 0
- **Shared**: 4
- **Test**: 0

## Domain Components
- **Auth** - login, recuperacion y proteccion de rutas.
- **Productos** - catalogo, stock y empaques relacionados.
- **Ventas** - transacciones, dashboard, entregas y CFE.
- **Clientes** - mantenimiento de clientes y datos fiscales.
- **Configuracion** - branding, empresa, modulos y ganancias.
- **Permisos** - matriz de autorizacion por rol.
- **Auditoria** - eventos y movimientos historicos.
- **Catalogos auxiliares** - ubicaciones y tipos de IVA.
