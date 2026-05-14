# Functional Design — pw-pages

## Page Objects — Estructura y Métodos

### LoginPage (`e2e/pages/LoginPage.js`)

**Selectores clave:**
- Email input: `#login-email`
- Password input: `#login-password`
- Submit button: `button:has-text("Entrar")`
- Error message: `.error`
- Dashboard indicator: `.ventas-main` (primer elemento visible post-login)

**Métodos:**
| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `goto()` | — | Navega a `baseURL` |
| `login(email, password)` | string, string | Rellena y envía el form |
| `expectDashboard()` | — | Verifica que el dashboard es visible |
| `expectError(text?)` | string opcional | Verifica `.error` visible |

---

### VentasPage (`e2e/pages/VentasPage.js`)

**Selectores clave:**
- Botón pantalla ventas: navegar vía App (botón sidebar o URL si aplica)
- Buscador productos: `#nueva-venta-productos-busqueda`
- Botón agregar (dinámico): `#nueva-venta-producto-{id}-agregar`
- Botón siguiente: `#nueva-venta-paso-productos-siguiente`
- Botón confirmar venta: `#nueva-venta-venta-confirmar`
- Modal confirmación: `.venta-final-modal`
- Botón nueva venta (post-confirmación): `#nueva-venta-venta-final-nueva-venta`

**Métodos:**
| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `goto()` | — | Login si necesario + navega a pantalla ventas |
| `buscarProducto(query)` | string | Escribe en el buscador |
| `agregarPrimerResultado()` | — | Agrega el primer producto del resultado |
| `avanzarAPago()` | — | Click en "Siguiente" |
| `seleccionarEfectivo(monto)` | number | Activa efectivo y pone el monto |
| `confirmarVenta()` | — | Click en "Confirmar venta" |
| `expectModalConfirmacion()` | — | Verifica `.venta-final-modal` visible |

---

### ProductosPage (`e2e/pages/ProductosPage.js`)

**Selectores clave:**
- Toolbar agregar: `button[title="Agregar producto"]`
- Buscador: `.table-search-field`
- Form nombre: `input[name="nombre"]`
- Form stock: `input[name="stock"]`
- Form venta: `input[name="venta"]`
- Select empaque: `select[name="empaqueId"]`
- Select IVA: `select[name="ivaId"]`
- Botón guardar: `button[type="submit"]`
- Error input: `.input-error`
- Cerrar panel: `.side-panel-close`
- Tabla rows: `.producto-row`

**Métodos:**
| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `goto()` | — | Navega a productos (requiere login previo) |
| `abrirFormNuevo()` | — | Click en toolbar "Agregar producto" |
| `llenarFormulario(data)` | `{nombre, stock, venta}` | Rellena campos mínimos |
| `guardar()` | — | Submit del form |
| `expectEnLista(nombre)` | string | Verifica que el producto aparece en tabla |
| `abrirEditar(nombre)` | string | Busca y expande row, click Editar |
| `expectError()` | — | Verifica `.input-error` visible |

---

## Fixtures

### `e2e/fixtures/users.js`
```js
export const adminUser = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@test.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'password123',
};
```

### `e2e/fixtures/productos.js`
```js
export const productoNuevo = {
  nombre: `Test Producto ${Date.now()}`,
  stock: '10',
  venta: '100',
};
```
> Nombre con timestamp para evitar colisiones entre runs.
