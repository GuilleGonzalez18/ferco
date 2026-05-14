# Unit Test Execution — Playwright E2E

## Estructura de tests

```
e2e/
  pages/           # Page Objects (LoginPage, VentasPage, ProductosPage)
  tests/           # Specs
    auth.spec.js       # 3 tests — autenticación
    ventas.spec.js     # 3 tests — flujo de ventas
    productos.spec.js  # 3 tests — gestión de productos
  fixtures/        # Datos de prueba (users.js, productos.js)
```

## Correr todos los tests

### Prerequisito: servicios corriendo
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — Tests
npm run test:e2e
```

### Solo un spec
```bash
npm run test:e2e -- e2e/tests/auth.spec.js
```

### Modo UI (debugging visual)
```bash
npm run test:e2e:ui
```

### Ver reporte HTML de última ejecución
```bash
npm run test:e2e:report
```

## Resultados esperados
- **Total**: 9 tests (3 auth + 3 ventas + 3 productos)
- **Browser**: Chromium
- **Tiempo estimado**: < 2 minutos en local
- **Reporte**: `playwright-report/index.html`

## Resolver tests fallidos
1. Abrir el reporte HTML: `npm run test:e2e:report`
2. Revisar screenshots y traces en `playwright-report/`
3. Para debug interactivo: `npm run test:e2e:ui`
4. Los Page Objects están en `e2e/pages/` — actualizar selectores si la UI cambió
