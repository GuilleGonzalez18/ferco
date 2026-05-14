# Functional Design — pw-ci (Infrastructure Design)

## Arquitectura del workflow CI

### Flujo de ejecución

```
push/PR to main|develop
      │
      ▼
job: e2e
  ├── setup-node (Node 20)
  ├── PostgreSQL service (postgres:15)
  ├── npm ci (root + backend + frontend)
  ├── install playwright browsers (chromium)
  ├── backend: run db:setup + db:seed:test
  ├── backend: start express en background (port 3001)
  ├── frontend: build + preview en background (port 5173)
  ├── wait-on http://localhost:5173 + http://localhost:3001/api/health
  ├── npx playwright test
  └── upload-artifact (playwright-report/)
```

### Variables de entorno necesarias en CI

| Variable | Fuente | Descripción |
|----------|--------|-------------|
| `PGHOST` | hardcoded `localhost` | Postgres service en el job |
| `PGPORT` | hardcoded `5432` | Puerto default |
| `PGDATABASE` | secret o hardcoded | Nombre de la DB de test |
| `PGUSER` | secret o hardcoded `postgres` | Usuario Postgres |
| `PGPASSWORD` | secret `POSTGRES_PASSWORD` | Password del service |
| `JWT_SECRET` | secret `JWT_SECRET` | Para el backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Hardcoded para CI |
| `E2E_ADMIN_EMAIL` | secret | Credenciales del usuario seed |
| `E2E_ADMIN_PASSWORD` | secret | Password del usuario seed |
| `VITE_API_URL` | `http://localhost:3001` | Para el build del frontend |

### Artifact de reporte
- **Path**: `playwright-report/`
- **Retención**: 30 días
- **Condición**: `if: always()` — se sube aunque fallen los tests
