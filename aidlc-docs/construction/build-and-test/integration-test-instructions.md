# Integration Test Instructions — Playwright E2E

## Escenarios de integración cubiertos

Los tests E2E de Playwright son **por naturaleza tests de integración** — cada spec prueba la
interacción completa entre:

- **Frontend** (React + Vite en `localhost:5173`)
- **Backend** (Express en `localhost:3001`)
- **Base de datos** (PostgreSQL con datos seed)

### Escenario 1: Auth → Dashboard

- **Spec**: `e2e/tests/auth.spec.js`
- **Flujo**: Login form → POST `/api/usuarios/login` → JWT → carga Dashboard
- **Verificación**: `.dashboard-sidebar` visible tras login exitoso

### Escenario 2: Ventas — Happy Path Completo

- **Spec**: `e2e/tests/ventas.spec.js`
- **Flujo**: Login → Nueva Venta → búsqueda producto (GET `/api/productos`) → agregar carrito → confirmar (POST `/api/ventas`) → modal éxito
- **Verificación**: `.venta-final-modal` visible, venta persistida en DB

### Escenario 3: Productos — CRUD

- **Spec**: `e2e/tests/productos.spec.js`
- **Flujo**: Login → Productos (GET `/api/productos`) → formulario nuevo (POST `/api/productos`) → producto aparece en tabla
- **Verificación**: Nombre del producto aparece en tabla tras creación

## Setup del entorno de integración

```bash
# 1. DB con datos de prueba
cd backend && npm run db:seed:test && cd ..

# 2. Backend (en background)
cd backend && npm run start &

# 3. Frontend preview (en background)
cd frontend && npm run build && npm run preview -- --port 5173 &

# 4. Esperar servicios listos
npx wait-on http://localhost:3001/api/health http://localhost:5173 --timeout 60000

# 5. Correr tests
npm run test:e2e
```

## Limpieza post-test

Los tests usan `db:seed:test` que es idempotente. No hay cleanup automático de datos creados
durante los tests (productos con timestamp, etc.) — se pueden borrar manualmente o re-seedear.
