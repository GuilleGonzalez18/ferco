# Build Instructions — Playwright E2E

## Prerequisites
- **Node.js**: v18+ (LTS recomendado)
- **Playwright**: `@playwright/test` ^1.59 (instalado en root)
- **Backend corriendo**: `http://localhost:3001`
- **Frontend corriendo**: `http://localhost:5173`
- **PostgreSQL**: instancia local con DB `ferco_db` y datos seed

## Variables de entorno requeridas

### Backend (`backend/.env`)
```
PGHOST=localhost
PGPORT=5432
PGDATABASE=ferco_db
PGUSER=postgres
PGPASSWORD=<tu_password>
JWT_SECRET=<valor_secreto>
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:3001/api
```

### E2E (raíz `.env.test` o variables de entorno del shell)
```
E2E_ADMIN_EMAIL=admin@ferco.com
E2E_ADMIN_PASSWORD=<password_del_usuario_admin>
```

## Pasos de build

### 1. Instalar dependencias
```bash
# Raíz (incluye @playwright/test y wait-on)
npm ci

# Backend
cd backend && npm ci && cd ..

# Frontend
cd frontend && npm ci && cd ..
```

### 2. Instalar browsers de Playwright
```bash
npx playwright install chromium
```

### 3. Setup de base de datos
```bash
cd backend
npm run db:schema    # Crear tablas (idempotente)
npm run db:migrate   # Migraciones aditivas
npm run db:seed:test # Poblar datos de prueba
cd ..
```

### 4. Build del frontend (solo si usas preview)
```bash
cd frontend && npm run build && cd ..
```

## Verificar build exitoso
- `npx playwright --version` imprime la versión sin errores
- `npx playwright install chromium --dry-run` confirma browser disponible
- Backend: `curl http://localhost:3001/api/health` responde 200
- Frontend: `http://localhost:5173` carga la app de login
