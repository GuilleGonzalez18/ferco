# Requisitos — Testing E2E con Playwright

## Intent Analysis

- **User Request**: Implementar testing automático E2E usando Playwright
- **Request Type**: New Feature — nueva capa de testing (E2E)
- **Scope Estimate**: Multiple Components (frontend + backend + CI pipeline)
- **Complexity Estimate**: Moderate

---

## Functional Requirements

### FR-1: Instalación y Configuración
- Playwright se instala en el root del monorepo (`package.json` raíz)
- Solo browser **Chromium** habilitado
- Configuración en `playwright.config.js` en el root
- `baseURL` apunta al frontend local (Vite dev server: `http://localhost:5173`)
- El backend debe estar corriendo en `http://localhost:3001` durante los tests

### FR-2: Flujos a Cubrir (Fase 1)
Los tests E2E deben cubrir tres áreas principales:

#### Auth (`auth.spec.js`)
- **Happy path**: login exitoso con credenciales válidas → redirección al dashboard
- **Error**: login con credenciales inválidas → mensaje de error visible
- **Error**: login con campo vacío → validación client-side

#### Ventas (`ventas.spec.js`)
- **Happy path**: abrir Nueva Venta → buscar producto → agregar al carrito → finalizar venta → confirmar modal → confetti visible
- **Happy path**: venta con múltiples productos y cantidades distintas
- **Error**: intentar finalizar venta con carrito vacío → no debe proceder

#### Productos (`productos.spec.js`)
- **Happy path**: ver listado de productos
- **Happy path**: agregar nuevo producto → aparece en la lista
- **Happy path**: editar producto existente → cambios reflejados
- **Error**: guardar producto sin nombre → validación

### FR-3: Estrategia de Base de Datos
- Tests usan la **base de datos local existente con datos de seed**
- El script `npm run db:seed:test` en backend prepara datos base (clientes + ventas)
- No hay aislamiento entre runs — los tests deben ser idempotentes o restaurar estado

### FR-4: Page Object Model (POM)
- Patrón POM completo: una clase por pantalla con métodos y selectores encapsulados
- Ubicación: `e2e/pages/` (ej: `LoginPage.js`, `VentasPage.js`, `ProductosPage.js`)
- Cada clase expone métodos de alto nivel: `login(user, pass)`, `agregarProducto(id)`, `finalizarVenta()`

### FR-5: Organización de Tests
```
e2e/
  pages/           # Page Objects
    LoginPage.js
    VentasPage.js
    ProductosPage.js
  tests/           # Specs
    auth.spec.js
    ventas.spec.js
    productos.spec.js
  fixtures/        # Datos de prueba reutilizables
    users.js
    productos.js
```

### FR-6: CI con GitHub Actions
- Nuevo workflow `.github/workflows/e2e.yml`
- Se ejecuta en push/PR a `main` y `develop`
- El workflow debe:
  1. Levantar PostgreSQL como service
  2. Correr migraciones y seed
  3. Iniciar el backend Express
  4. Iniciar el frontend Vite (build + preview, o dev server)
  5. Ejecutar `npx playwright test`
  6. Subir el reporte HTML de Playwright como artifact

---

## Non-Functional Requirements

### NFR-1: Velocidad
- Los tests de Chromium deben terminar en < 3 minutos en CI para no bloquear el pipeline
- Usar `--workers=1` en CI para evitar flakiness por paralelismo

### NFR-2: Mantenibilidad
- POM evita que cambios de UI rompan múltiples tests — solo se actualiza la clase POM
- Los selectores deben usar `data-testid` donde sea posible (no XPath ni selectores CSS frágiles)

### NFR-3: Confiabilidad
- No usar `page.waitForTimeout()` — usar `expect(locator).toBeVisible()` y auto-waiting de Playwright
- Tests idempotentes: no depender de orden de ejecución

### NFR-4: Reportes
- Generar reporte HTML con `reporter: 'html'` en `playwright.config.js`
- En CI: subir el reporte como artifact de GitHub Actions (retención: 30 días)

### NFR-5: Seguridad
- Las credenciales de test no deben estar hardcodeadas en el código
- Usar variables de entorno o un archivo `.env.test` (gitignoreado)

---

## Decisiones Técnicas

| Decisión | Elección | Razón |
|---|---|---|
| Framework E2E | Playwright | Seleccionado por el usuario |
| Browser | Chromium | Rápido, suficiente para uso interno |
| DB strategy | Seed local | Sin overhead de setup/teardown |
| POM | Completo | Mantenibilidad a largo plazo |
| CI | GitHub Actions | Ya lo usa el proyecto |
| Ubicación | Root monorepo | Acceso a frontend y backend |

---

## Out of Scope (Fase 1)

- Firefox y WebKit
- Tests de clientes, usuarios y configuración (fase 2)
- DB aislada por test
- Visual regression testing
- Performance testing
