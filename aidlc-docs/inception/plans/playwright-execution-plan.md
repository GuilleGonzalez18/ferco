# Execution Plan — Playwright E2E Testing

## Detailed Analysis Summary

### Transformation Scope
- **Transformation Type**: Nueva capa de testing (no modifica código existente)
- **Primary Changes**: Agregar Playwright E2E al monorepo, Page Objects, specs, CI workflow
- **Related Components**: Root `package.json`, `.github/workflows/`, backend (para CI), frontend (para CI)

### Change Impact Assessment
- **User-facing changes**: No — testing infrastructure pura
- **Structural changes**: Sí — nueva carpeta `e2e/` en root, nuevo workflow de CI
- **Data model changes**: No
- **API changes**: No
- **NFR impact**: Sí — mejora la calidad y confiabilidad del proyecto (CI/CD con tests E2E)

### Risk Assessment
- **Risk Level**: Low
- **Rollback Complexity**: Easy (solo eliminar carpeta e2e/ y workflow)
- **Testing Complexity**: Moderate (requiere servidor backend + frontend corriendo en CI)

---

## Workflow Visualization

```
INCEPTION PHASE
  [✅] Workspace Detection    — COMPLETED
  [✅] Reverse Engineering    — COMPLETED (artifacts vigentes)
  [✅] Requirements Analysis  — COMPLETED
  [--] User Stories           — SKIP (tooling interno, sin UX ni personas)
  [✅] Workflow Planning      — IN PROGRESS
  [--] Application Design     — SKIP (sin nuevos componentes de negocio)
  [🔄] Units Generation       — EXECUTE (4 unidades de trabajo distintas)

CONSTRUCTION PHASE (por unidad)
  [🔄] Functional Design      — EXECUTE (estructura POM + escenarios por unidad)
  [--] NFR Requirements       — SKIP (NFRs ya definidos en requirements.md)
  [--] NFR Design             — SKIP
  [🔄] Infrastructure Design  — EXECUTE solo para Unidad 4 (CI/CD GitHub Actions)
  [🔄] Code Generation        — EXECUTE (siempre, por unidad)
  [🔄] Build and Test         — EXECUTE (siempre)

OPERATIONS PHASE
  [  ] Operations             — PLACEHOLDER
```

---

## Phases to Execute

### 🔵 INCEPTION PHASE

- [x] Workspace Detection — COMPLETED
- [x] Reverse Engineering — COMPLETED
- [x] Requirements Analysis — COMPLETED
- [ ] User Stories — **SKIP**
  - **Rationale**: Testing infrastructure interna; sin usuarios finales afectados, sin personas, sin criterios de aceptación de negocio
- [x] Workflow Planning — IN PROGRESS (este documento)
- [ ] Application Design — **SKIP**
  - **Rationale**: No se crean nuevos componentes de negocio; Playwright tiene su propia estructura estándar (POM pattern ya definido en requirements)
- [ ] Units Generation — **EXECUTE**
  - **Rationale**: Hay 4 unidades de trabajo paralelas y distinguibles

### 🟢 CONSTRUCTION PHASE

- [ ] Functional Design — **EXECUTE** (por unidad)
  - **Rationale**: Cada unidad necesita definir estructura de archivos, selectores base y escenarios
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: NFRs ya definidos en playwright-requirements.md (velocidad, mantenibilidad, confiabilidad, reportes, seguridad)
- [ ] NFR Design — **SKIP**
  - **Rationale**: No hay patrones de NFR complejos a diseñar; Playwright cubre la mayoría nativamente
- [ ] Infrastructure Design — **EXECUTE** (solo Unidad 4)
  - **Rationale**: El workflow de GitHub Actions requiere diseño de infraestructura CI (servicios PostgreSQL, orden de arranque, artifacts)
- [ ] Code Generation — **EXECUTE** (siempre, por unidad)
- [ ] Build and Test — **EXECUTE** (siempre)

### 🟡 OPERATIONS PHASE

- [ ] Operations — PLACEHOLDER

---

## Units of Work

### Unidad 1: Setup Base y Configuración
**Archivos a crear:**
- `package.json` (root) — agregar `@playwright/test` en devDependencies, script `test:e2e`
- `playwright.config.js` (root) — baseURL, Chromium, reporter HTML, retries, workers
- `e2e/` — estructura de carpetas

**Dependencias**: Ninguna

---

### Unidad 2: Page Objects (POM)
**Archivos a crear:**
- `e2e/pages/LoginPage.js` — métodos: `goto()`, `login(user, pass)`, `expectError(msg)`, `expectDashboard()`
- `e2e/pages/VentasPage.js` — métodos: `goto()`, `abrirNuevaVenta()`, `buscarProducto(q)`, `agregarAlCarrito(idx)`, `finalizarVenta()`, `expectModalConfirmacion()`, `expectConfetti()`
- `e2e/pages/ProductosPage.js` — métodos: `goto()`, `abrirFormNuevo()`, `llenarFormulario(data)`, `guardar()`, `expectEnLista(nombre)`, `editarPrimero()`, `expectError(msg)`
- `e2e/fixtures/users.js` — credenciales de test
- `e2e/fixtures/productos.js` — datos de productos de prueba

**Dependencias**: Unidad 1 (playwright.config.js)

---

### Unidad 3: Test Specs
**Archivos a crear:**
- `e2e/tests/auth.spec.js` — login ok, login fallido, campo vacío
- `e2e/tests/ventas.spec.js` — happy path venta, múltiples productos, carrito vacío
- `e2e/tests/productos.spec.js` — listar, crear, editar, validación sin nombre

**Dependencias**: Unidad 2 (Page Objects)

---

### Unidad 4: CI/CD GitHub Actions
**Archivos a crear/modificar:**
- `.github/workflows/e2e.yml` — job con PostgreSQL service, seed, backend, frontend, `npx playwright test`, upload artifact

**Dependencias**: Unidades 1, 2, 3

---

## Package Change Sequence

```
1. Root package.json         → Agregar Playwright
2. playwright.config.js      → Configuración base
3. e2e/pages/               → Page Objects
4. e2e/tests/               → Specs
5. .github/workflows/e2e.yml → CI
```

---

## Success Criteria

- **Primary Goal**: Tests E2E de Playwright corriendo localmente y en GitHub Actions
- **Key Deliverables**:
  1. `playwright.config.js` configurado
  2. 3 Page Objects (Login, Ventas, Productos)
  3. 3 spec files con ~10 tests totales
  4. GitHub Actions workflow funcional
- **Quality Gates**:
  - `npx playwright test` pasa localmente sin errores
  - CI en GitHub Actions completa sin failures
  - Reporte HTML generado correctamente
