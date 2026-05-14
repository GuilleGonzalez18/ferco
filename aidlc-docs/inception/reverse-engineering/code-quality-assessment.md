# Code Quality Assessment

## Test Coverage
- **Overall**: Poor
- **Unit Tests**: No se detectaron suites dedicadas.
- **Integration Tests**: No se detectaron suites automatizadas; existen scripts de seed y validacion manual.

## Code Quality Indicators
- **Linting**: Configurado en frontend con ESLint; backend solo valida sintaxis en CI.
- **Code Style**: Moderadamente consistente por dominio, aunque con mezcla de patrones manuales en rutas y UI.
- **Documentation**: Good a nivel operativo; la arquitectura estaba documentada de forma parcial en `CLAUDE.md` y guias de setup.

## Technical Debt
- Navegacion custom en frontend sin router, dependiente de estado y eventos globales.
- Manejo de errores del cliente relativamente generico en `frontend/src/core/api.js`.
- Backend con mucha logica SQL inline y validaciones distribuidas entre rutas.
- Fallback inseguro de `JWT_SECRET` de desarrollo en backend.
- Poca cobertura automatizada para flujos criticos de ventas e inventario.

## Patterns and Anti-patterns

### Good Patterns
- Wrapper central para API frontend.
- Separacion del backend por dominios de rutas.
- Uso de SQL parametrizado y transacciones en ventas.
- CI automatizado para lint, build y chequeo de sintaxis.

### Anti-patterns
- **Custom navigation without router** - `frontend/src/App.jsx`, `frontend/src/features/dashboard/Dashboard.jsx`.
- **Global events and localStorage coupling** - sincronizacion `ferco:*` en frontend.
- **Ad hoc auth checks** - algunas rutas backend usan `getAuthUserFromRequest` en lugar de middleware consistente.
- **Startup side effects** - migraciones al iniciar el servidor.
- **No automated test suite** - ausencia de tests unitarios o integracion mantenidos.
