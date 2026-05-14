# Units of Work — Playwright E2E Testing

## Unit 1: Setup Base y Configuración
**ID**: `pw-setup`  
**Tipo**: Infrastructure / Configuration  
**Responsabilidad**: Instalar Playwright, configurar el runner y establecer la estructura base de carpetas `e2e/`.

### Entregables
- `package.json` (root) modificado con `@playwright/test` y script `test:e2e`
- `playwright.config.js` en root del monorepo
- Estructura de carpetas: `e2e/pages/`, `e2e/tests/`, `e2e/fixtures/`

### Criterios de completitud
- `npx playwright test` ejecuta sin errores de configuración
- Chromium está disponible como browser
- `baseURL` apunta correctamente al frontend

---

## Unit 2: Page Objects (POM)
**ID**: `pw-pages`  
**Tipo**: Test Infrastructure  
**Responsabilidad**: Encapsular selectores y acciones de cada pantalla en clases POM reutilizables.

### Entregables
- `e2e/pages/LoginPage.js`
- `e2e/pages/VentasPage.js`
- `e2e/pages/ProductosPage.js`
- `e2e/fixtures/users.js`
- `e2e/fixtures/productos.js`

### Criterios de completitud
- Cada Page Object importa correctamente desde `@playwright/test`
- Métodos de alto nivel cubren todos los flujos definidos en specs
- Sin lógica de aserciones en los Page Objects (solo acciones y navegación)

---

## Unit 3: Test Specs
**ID**: `pw-specs`  
**Tipo**: Test Cases  
**Responsabilidad**: Implementar los casos de prueba usando los Page Objects.

### Entregables
- `e2e/tests/auth.spec.js` — 3 tests (login ok, login fallido, campo vacío)
- `e2e/tests/ventas.spec.js` — 3 tests (happy path, múltiples productos, carrito vacío)
- `e2e/tests/productos.spec.js` — 4 tests (listar, crear, editar, validación)

### Criterios de completitud
- Todos los tests usan los Page Objects de Unit 2
- No hay `waitForTimeout()` hardcodeados
- Los tests pasan localmente con backend + frontend corriendo

---

## Unit 4: CI/CD GitHub Actions
**ID**: `pw-ci`  
**Tipo**: Infrastructure / CI  
**Responsabilidad**: Workflow de GitHub Actions que ejecuta los tests E2E automáticamente en push/PR.

### Entregables
- `.github/workflows/e2e.yml`

### Criterios de completitud
- Workflow ejecuta en push/PR a `main` y `develop`
- PostgreSQL service configurado
- Backend y frontend arrancan correctamente antes de los tests
- Reporte HTML subido como artifact de GitHub Actions
