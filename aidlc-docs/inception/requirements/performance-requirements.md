# Performance & Double-Submit — Requirements Analysis
**Timestamp**: 2026-05-21
**Tipo**: Brownfield — Mejora de performance y corrección de bugs críticos

---

## Problemas Detectados

### P1 — CRÍTICO: Doble-submit en Confirmar Venta
- **Síntoma**: Al hacer click múltiple en "Confirmar venta" con latencia alta, la venta se registra dos veces.
- **Causa raíz**: `confirmarVenta` en `Ventas.jsx` no tenía guard de `submitting`. El botón no se deshabilitaba durante la llamada a la API.
- **Impacto**: Duplicación de ventas en la base de datos, descuento de stock duplicado.
- **Archivo**: `frontend/src/features/ventas/Ventas.jsx`

### P2 — ALTO: Doble-submit en Guardar Producto
- **Síntoma**: Click múltiple en "Guardar" puede crear el producto dos veces.
- **Causa raíz**: `handleSubmit` en `Productos.jsx` no tenía guard de `saving`.
- **Archivo**: `frontend/src/features/productos/Productos.jsx`

### P3 — PERFORMANCE: Sin debounce en búsquedas
- **Síntoma**: Lentitud al escribir en el campo de búsqueda de productos y clientes.
- **Causa raíz**: `productosFiltrados` y `clientesFiltrados` se recalculan sincrónicamente en cada keystroke. Con catálogos grandes, bloquea el hilo principal.
- **Archivo**: `frontend/src/features/ventas/Ventas.jsx`

---

## Correcciones Implementadas

### Fix P1 — Guard submittingVenta
- Nuevo estado `submittingVenta` (boolean).
- `confirmarVenta` retorna inmediatamente si `submittingVenta === true`.
- `setSubmittingVenta(true)` al inicio, `setSubmittingVenta(false)` en bloque `finally`.
- Botón "Confirmar venta": `disabled={submittingVenta}`, texto cambia a "Confirmando..." durante el proceso.

### Fix P2 — Guard saving en Productos
- Nuevo estado `saving` (boolean).
- `handleSubmit` retorna si `saving === true`.
- Botón "Guardar": `disabled={imagenUploading || saving}`, texto cambia a "Guardando...".

### Fix P3 — useDeferredValue para búsquedas
- `useDeferredValue(busqueda)` → `busquedaDeferred`
- `useDeferredValue(busquedaCliente)` → `busquedaClienteDeferred`
- Los `useMemo` de filtrado dependen de los valores diferidos. El input responde al instante; el filtrado se ejecuta en baja prioridad sin bloquear el render.
- React 18 feature, sin dependencias externas.

---

## Áreas Pendientes (no implementadas aún)

| Área | Descripción | Prioridad |
|---|---|---|
| Clientes / Ventas historial | Verificar guards en operaciones CRUD | Media |
| Backend idempotency | Agregar `idempotency key` en `POST /ventas` para protección server-side | Alta (producción) |
| Virtualización de lista | Para catálogos > 500 productos, usar windowing (react-virtual) | Baja |
