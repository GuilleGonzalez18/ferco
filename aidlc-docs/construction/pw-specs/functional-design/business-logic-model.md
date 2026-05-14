# Functional Design — pw-specs

## Escenarios por archivo

### `auth.spec.js`

| Test | Precondición | Pasos | Aserción |
|------|-------------|-------|----------|
| login exitoso | Backend corriendo, usuario seed existe | `goto()` → `login(valid)` | `.ventas-main` visible |
| login fallido | Backend corriendo | `goto()` → `login(invalid_pass)` | `.error` visible |
| campos vacíos | — | `goto()` → click Entrar sin rellenar | URL sigue siendo `/` o `.error` visible |

---

### `ventas.spec.js`

| Test | Precondición | Pasos | Aserción |
|------|-------------|-------|----------|
| happy path venta | Login, al menos 1 producto con stock > 0 | buscar → agregar → siguiente → efectivo → confirmar | `.venta-final-modal` visible |
| múltiples productos | Login, ≥2 productos con stock | agregar 2 productos → carrito | 2 items en carrito visible |
| carrito vacío | Login | click "Siguiente" sin productos | No avanza (botón disabled o permanece en paso 1) |

---

### `productos.spec.js`

| Test | Precondición | Pasos | Aserción |
|------|-------------|-------|----------|
| listar productos | Login, seed con productos | goto() | Tabla tiene ≥1 fila |
| crear producto | Login | abrir form → llenar → guardar | Nombre aparece en tabla |
| editar producto | Login, ≥1 producto en lista | buscar → expandir → editar → cambiar nombre → guardar | Nuevo nombre en tabla |
| guardar sin nombre | Login | abrir form → guardar vacío | `.input-error` visible |

## Estrategia de aislamiento
- Tests de productos: usar nombre único con `Date.now()` para evitar colisiones
- Tests de ventas: el seed garantiza ≥1 producto disponible
- `beforeEach`: hacer login antes de cada test del suite de ventas y productos
- `auth.spec.js`: no requiere login previo (testea el login mismo)
