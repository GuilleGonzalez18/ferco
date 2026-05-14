# Unit of Work — Story Map

> Nota: Este proyecto de testing no tiene User Stories formales de negocio.
> El mapa usa "escenarios de test" como equivalente funcional.

## Unidad pw-setup
| Escenario | Descripción |
|-----------|-------------|
| SETUP-01 | Playwright instalado y configurado en root |
| SETUP-02 | `npx playwright test --list` lista tests sin errores |
| SETUP-03 | Estructura `e2e/` creada con subcarpetas |

## Unidad pw-pages
| Escenario | Descripción |
|-----------|-------------|
| PAGE-01 | `LoginPage` expone `goto()`, `login()`, `expectError()`, `expectDashboard()` |
| PAGE-02 | `VentasPage` expone `goto()`, `abrirNuevaVenta()`, `buscarProducto()`, `agregarAlCarrito()`, `finalizarVenta()`, `expectModalConfirmacion()` |
| PAGE-03 | `ProductosPage` expone `goto()`, `abrirFormNuevo()`, `llenarFormulario()`, `guardar()`, `expectEnLista()`, `editarPrimero()`, `expectError()` |
| PAGE-04 | `fixtures/users.js` exporta `adminUser` y `empleadoUser` |
| PAGE-05 | `fixtures/productos.js` exporta `productoNuevo` |

## Unidad pw-specs
| Escenario | Descripción |
|-----------|-------------|
| AUTH-01 | Login exitoso → dashboard visible |
| AUTH-02 | Login con contraseña incorrecta → mensaje de error |
| AUTH-03 | Login con campos vacíos → no navega |
| VENTA-01 | Happy path: buscar producto → carrito → confirmar → modal de éxito |
| VENTA-02 | Múltiples productos → total correcto en carrito |
| VENTA-03 | Finalizar con carrito vacío → no procede al paso 2 |
| PROD-01 | Listado de productos visible al cargar |
| PROD-02 | Crear producto nuevo → aparece en listado |
| PROD-03 | Editar producto existente → cambios reflejados |
| PROD-04 | Guardar sin nombre → error de validación visible |

## Unidad pw-ci
| Escenario | Descripción |
|-----------|-------------|
| CI-01 | Workflow se ejecuta en push a `main` y `develop` |
| CI-02 | PostgreSQL service disponible durante el job |
| CI-03 | Backend arranca antes de `playwright test` |
| CI-04 | Frontend (build+preview) arranca antes de `playwright test` |
| CI-05 | Reporte HTML subido como artifact en cada run |
