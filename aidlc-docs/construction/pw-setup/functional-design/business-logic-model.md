# Functional Design — pw-setup

## Business Logic Model
Setup puro de herramienta. Sin lógica de negocio.

## Reglas de configuración

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| `baseURL` | `http://localhost:5173` | Vite dev server (o preview) |
| `testDir` | `./e2e/tests` | Specs separados de pages/fixtures |
| `use.browser` | `chromium` | Solo Chromium (velocidad) |
| `reporter` | `['html', 'list']` | HTML para CI artifact, list para terminal |
| `retries` | 0 local, 1 en CI | Evitar falsos negativos en CI |
| `workers` | undefined local, 1 en CI | Evitar flakiness por paralelismo en CI |
| `timeout` | 30000ms | Suficiente para operaciones de DB + render |

## Estructura de carpetas a crear

```
e2e/
  pages/       # Page Object classes
  tests/       # Spec files
  fixtures/    # Shared test data
```

## Script npm a agregar

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```
