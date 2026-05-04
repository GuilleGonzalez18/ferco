# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ferco is a point-of-sale / inventory management web app for a ferretería (hardware store). It is a Spanish-language SPA with a React frontend and an Express + PostgreSQL backend.

## Development Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # Vite dev server on port 5173
npm run build      # Production build → dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (`cd backend`)
```bash
npm run dev        # node --watch src/index.js (hot-reload)
npm run start      # Production start
```

### Database (`cd backend`)
```bash
npm run db:setup        # First-time: create schema + run migration
npm run db:schema       # Idempotent table creation (bootstrapSchema.js)
npm run db:migrate      # Additive column migrations (runMigration.js)
npm run db:seed:test    # Populate test data (clientes + ventas)
npm run db:export       # pg_dump to SQL file
npm run db:import       # Restore from SQL dump via psql
```

### Environment Setup
Copy `.env.example` to `.env` in both `backend/` and `frontend/` and fill in values.

- **Backend**: PostgreSQL connection (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`), `JWT_SECRET`, `CORS_ORIGIN`, SMTP/Brevo vars, `PASSWORD_RESET_TTL_MINUTES`
- **Frontend**: `VITE_API_URL` (backend base URL, e.g. `http://localhost:3001`)

## Architecture

### Navigation Model
The frontend uses a **custom screen-switching system** — there is no React Router. `App.jsx` holds a `pantalla` state string and renders the matching feature component. To add a new screen, add a case in `App.jsx` and a corresponding feature folder under `frontend/src/features/`.

### API Layer
All HTTP calls go through `frontend/src/core/api.js`, which wraps `fetch` with JWT headers, error handling, and typed endpoint functions. Never call `fetch` directly from components — always add a function to `api.js`.

### Modal System
Global modals are driven by `frontend/src/shared/lib/appDialog.js` (imperative triggers) + `frontend/src/shared/components/dialog/AppDialogHost.jsx` (renderer mounted in `App.jsx`). Use `appDialog.open(...)` to show dialogs from anywhere.

### Auth Flow
JWT is stored in `localStorage`. On load, `App.jsx` restores the session from the token. The backend `auth.js` middleware verifies the token on every protected route.

### Backend Route Structure
Six route modules under `backend/src/routes/`, all mounted at `/api/<resource>`:
- `productos` — product CRUD, stock adjustments
- `ventas` — sales with PostgreSQL transactions
- `clientes` — client CRUD
- `usuarios` — user management + login + password reset (email code)
- `auditoria` — audit log reads + stock movement history
- `empaques` — package/unit types CRUD

Database access uses the raw `pg` driver (`backend/src/db.js` exports a `Pool`). All queries are written as parameterized SQL — no ORM.

### Data Patterns
- **Soft delete**: most entities use an `activo` boolean flag rather than hard deletes.
- **Stock movements**: tracked in a separate `movimientos_stock` table with cost/price.
- **Audit trail**: a dedicated `auditoria` table logs user actions.

## Versioning & CI

Commits must follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.). Semantic-release auto-tags and changelogs on push to `main`. CI runs ESLint + Vite build (frontend) and `node --check` (backend) on every push/PR to `main` or `develop`. Frontend deploys to Vercel on new releases via a deploy hook.
