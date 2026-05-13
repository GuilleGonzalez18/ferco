# Referencia de la API REST

Base URL: `http://localhost:3001/api` (local) o `https://tu-backend.vercel.app/api` (producción).

## Autenticación

La mayoría de los endpoints requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

El token se obtiene en `POST /api/usuarios/login` y se almacena en `localStorage` en el frontend.

**Roles:**
- `propietario` — acceso total a todos los endpoints
- `vendedor` — acceso limitado según los permisos configurados por el propietario

---

## Índice

- [Usuarios y Auth](#usuarios-y-auth)
- [Ventas](#ventas)
- [Productos](#productos)
- [Clientes](#clientes)
- [Configuración](#configuración)
- [Tipos de IVA](#tipos-de-iva)
- [Empaques](#empaques)
- [Auditoría](#auditoría)
- [Permisos](#permisos)
- [Ubicaciones](#ubicaciones)

---

## Usuarios y Auth

### `POST /api/usuarios/login`

Autentica un usuario y devuelve el token JWT.

**Auth requerida:** No

**Body:**
```json
{
  "correo": "admin@empresa.com",
  "password": "contraseña123"
}
```

**Respuesta `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Juan",
    "apellido": "Pérez",
    "correo": "admin@empresa.com",
    "rol_id": 1,
    "rol_nombre": "propietario",
    "debe_cambiar_password": false
  }
}
```

---

### `GET /api/usuarios`

Lista todos los usuarios (propietario) o solo el usuario autenticado (vendedor).

**Auth requerida:** Sí

**Respuesta `200`:** Array de objetos usuario (sin campo `password`).

---

### `POST /api/usuarios`

Crea un nuevo usuario. Solo propietario.

**Auth requerida:** Sí (propietario)

**Body:**
```json
{
  "username": "maria",
  "correo": "maria@empresa.com",
  "password": "password123",
  "nombre": "María",
  "apellido": "García",
  "rol_id": 2
}
```

**Respuesta `201`:** Objeto usuario creado. El usuario nuevo tendrá `debe_cambiar_password: true` automáticamente.

---

### `PUT /api/usuarios/:id`

Actualiza datos de un usuario.

**Auth requerida:** Sí (propietario o el mismo usuario)

**Body (todos opcionales):**
```json
{
  "nombre": "Nuevo nombre",
  "apellido": "Nuevo apellido",
  "telefono": "099123456",
  "password": "nueva_contraseña"
}
```

---

### `DELETE /api/usuarios/:id`

Elimina un usuario. Solo propietario. No puede eliminar su propia cuenta.

**Auth requerida:** Sí (propietario)

---

### `POST /api/usuarios/cambiar-password`

Cambia la contraseña del usuario autenticado. Limpia el flag `debe_cambiar_password`.

**Auth requerida:** Sí

**Body:**
```json
{
  "passwordActual": "contraseña_actual",
  "passwordNueva": "nueva_contraseña_min8chars"
}
```

---

### `POST /api/usuarios/:id/forzar-cambio-password`

Fuerza al usuario indicado a cambiar contraseña en su próximo login. Solo propietario.

**Auth requerida:** Sí (propietario)

---

### `POST /api/usuarios/solicitar-reset`

Solicita el envío de un código de recuperación de contraseña al correo del usuario.

**Auth requerida:** No

**Body:**
```json
{ "correo": "usuario@empresa.com" }
```

---

### `POST /api/usuarios/verificar-reset`

Verifica el código de recuperación y permite cambiar la contraseña.

**Auth requerida:** No

**Body:**
```json
{
  "correo": "usuario@empresa.com",
  "codigo": "123456",
  "passwordNueva": "nueva_contraseña"
}
```

---

## Ventas

### `GET /api/ventas/dashboard`

Resumen del dashboard: ventas del día, del mes, ganancia (solo propietario), etc.

**Auth requerida:** Sí (permiso `estadisticas.ver`)

**Respuesta `200` (propietario):**
```json
{
  "scope": "propietario",
  "ventasHoy": 15000.00,
  "ventasMes": 320000.00,
  "cantidadVentasHoy": 12,
  "cantidadVentasMes": 234,
  "promedioVentasMensual": 39.0,
  "gananciaHoy": 4500.00,
  "gananciaTotalEmpresa": 125000.00
}
```

---

### `GET /api/ventas/dashboard/widget`

Obtiene el valor de un widget de dashboard.

**Auth requerida:** Sí (permiso `estadisticas.ver`)

**Query params:**
| Param | Valores | Descripción |
|-------|---------|-------------|
| `category` | `ventas`, `productos`, `clientes`, `usuarios`, `stock`, `ganancia` | Categoría del widget |
| `type` | `cantidad`, `promedio`, `comparacion` | Tipo de métrica |
| `metric` | `monto`, `count`, `monto_venta`, `diario` | Métrica específica |
| `range` | `today`, `week`, `month`, `year`, `all` | Rango de fechas |
| `comparison_period` | `yesterday`, `last_week`, `last_month`, `last_year` | Para type=comparacion |

---

### `GET /api/ventas/dashboard/widgets`

Obtiene la configuración de widgets del usuario autenticado.

**Auth requerida:** Sí

---

### `PUT /api/ventas/dashboard/widgets`

Guarda la configuración de widgets del usuario.

**Auth requerida:** Sí

**Body:** Array de objetos widget con `posicion`, `categoria`, `tipo`, `metrica`, `rango`, `etiqueta`.

---

### `GET /api/ventas/estadisticas/resumen`

Estadísticas detalladas de ventas (mejor cliente, mejor producto, serie temporal, etc.).

**Auth requerida:** Sí (permiso `estadisticas.ver`)

**Query params:** `desde` (YYYY-MM-DD), `hasta` (YYYY-MM-DD), `usuarioId` (solo propietario).

---

### `GET /api/ventas`

Lista de ventas. Vendedores ven solo sus propias ventas.

**Auth requerida:** Sí (permiso `ventas.ver`)

**Query params:**
- `desde`, `hasta` — filtro por fecha (YYYY-MM-DD)
- `cliente_id` — filtro por cliente
- `estado_entrega` — `pendiente`, `entregado`, `cancelado`
- `page`, `limit` — paginación

---

### `GET /api/ventas/:id`

Detalle completo de una venta con líneas, pagos, cliente, usuario.

**Auth requerida:** Sí

---

### `POST /api/ventas`

Confirma una nueva venta.

**Auth requerida:** Sí (permiso `ventas.crear`)

**Body:**
```json
{
  "cliente_id": 5,
  "items": [
    {
      "producto_id": 12,
      "cantidad": 3,
      "precio_unitario": 150.00,
      "descuento_tipo": "ninguno",
      "descuento_valor": 0
    }
  ],
  "pagos": [
    { "medio_pago": "efectivo", "monto": 450.00 }
  ],
  "nota": "Entrega el viernes"
}
```

**Medios de pago válidos:** `efectivo`, `debito`, `credito`, `transferencia`

**Respuesta `201`:** Objeto venta creada con `id`.

---

### `POST /api/ventas/:id/emitir-cfe`

Emite el CFE (Comprobante Fiscal Electrónico) para una venta ya confirmada.

**Auth requerida:** Sí

**Comportamiento según `cfe_ambiente` en `config_empresa`:**
- `local` — genera JSON sin enviar a DGI
- `pruebas` — envía al servidor de pruebas de Dynamica
- `produccion` — envía a DGI (registro oficial)

**Respuesta `200`:**
```json
{
  "ok": true,
  "cfe": { ... },
  "response": { ... }
}
```

---

### `GET /api/ventas/:id/cfe`

Genera y devuelve el JSON del CFE sin enviarlo.

**Auth requerida:** Sí

---

### `PUT /api/ventas/:id/estado-entrega`

Actualiza el estado de entrega de una venta.

**Auth requerida:** Sí

**Body:** `{ "estado": "entregado" }` — valores: `pendiente`, `entregado`, `cancelado`

---

### `PUT /api/ventas/:id/cancelar`

Cancela una venta y restaura el stock.

**Auth requerida:** Sí (propietario)

---

### `DELETE /api/ventas/:id`

Elimina (soft delete) una venta. Solo propietario.

**Auth requerida:** Sí (propietario)

---

## Productos

### `GET /api/productos`

Lista todos los productos activos.

**Auth requerida:** Sí (permiso `productos.ver`)

**Query params:**
- `includeArchived=true` — incluye productos archivados (permiso `productos.ver_archivados`)

**Respuesta:** Array con `id`, `nombre`, `costo`, `precio`, `stock`, `unidad`, `imagen`, `ean`, `empaque_nombre`, `precio_empaque`, `iva_nombre`, `iva_porcentaje`, `iva_codigo`, `activo`.

---

### `GET /api/productos/:id`

Detalle de un producto.

**Auth requerida:** Sí

---

### `POST /api/productos`

Crea un producto.

**Auth requerida:** Sí (permiso `productos.agregar`)

**Body:**
```json
{
  "nombre": "Tornillo 6mm",
  "costo": 5.00,
  "precio": 10.00,
  "stock": 100,
  "unidad": "u",
  "ean": "7891234567890",
  "empaque_id": 2,
  "cantidad_empaque": 100,
  "precio_empaque": 800.00,
  "iva_id": 1,
  "imagen": "data:image/jpeg;base64,..."
}
```

---

### `PUT /api/productos/:id`

Actualiza un producto.

**Auth requerida:** Sí (permiso `productos.editar`)

---

### `PUT /api/productos/:id/stock`

Ajuste manual de stock con registro de movimiento.

**Auth requerida:** Sí (permiso `productos.ajustar_stock`)

**Body:**
```json
{
  "cantidad": 50,
  "tipo": "entrada",
  "motivo": "Reposición de mercadería",
  "costo": 5.00
}
```

**Tipos:** `entrada`, `salida`, `ajuste`

---

### `PUT /api/productos/:id/archivar`

Archiva (desactiva) un producto.

**Auth requerida:** Sí (propietario)

---

### `DELETE /api/productos/:id`

Elimina un producto permanentemente. Solo propietario.

**Auth requerida:** Sí (propietario)

---

## Clientes

### `GET /api/clientes`

Lista todos los clientes.

**Auth requerida:** Sí (permiso `clientes.ver`)

---

### `GET /api/clientes/:id`

Detalle de un cliente con historial de compras.

**Auth requerida:** Sí

---

### `POST /api/clientes`

Crea un cliente.

**Auth requerida:** Sí (permiso `clientes.agregar`)

**Body:**
```json
{
  "nombre": "Ferretería García",
  "rut": "21234567-0",
  "tipo_documento": "RUT",
  "numero_documento": "212345670",
  "direccion": "Av. 18 de Julio 1234",
  "telefono": "099123456",
  "correo": "garcia@ferreteria.uy",
  "departamento_id": 1,
  "horario_apertura": "09:00",
  "horario_cierre": "18:00",
  "tiene_reapertura": false
}
```

**Tipos de documento válidos:** `RUT`, `CI`, `PASAPORTE`, `DNI`, `OTRO`

---

### `PUT /api/clientes/:id`

Actualiza un cliente.

**Auth requerida:** Sí (permiso `clientes.editar`)

---

### `DELETE /api/clientes/:id`

Elimina un cliente.

**Auth requerida:** Sí (propietario)

---

## Configuración

### `GET /api/configuracion/empresa`

Obtiene la configuración de la empresa.

**Auth requerida:** No (endpoint público para permitir cargar config al inicio)

**Respuesta incluye:** nombre, razon_social, rut, direccion, logo, colores, giro, ciudad, departamento, cfe_ambiente, y `cfe_habilitado` (leído del ENV).

---

### `PUT /api/configuracion/empresa`

Actualiza la configuración de la empresa.

**Auth requerida:** Sí (propietario)

**Campos principales:**
- `nombre`, `razon_social`, `rut`, `giro`, `ciudad`, `departamento`
- `direccion`, `telefono`, `correo`, `website`
- `logo_base64` (máx 10MB en base64)
- `color_primary`, `color_primary_strong`, `color_primary_soft`, `color_menu_bg`, `color_menu_active`
- `color_text`, `color_text_muted`, `color_menu_text`, `color_logout_bg`
- `pdf_factura`, `pdf_remito` — configuración de PDF
- `cfe_ambiente` — `local`, `pruebas`, `produccion`

---

### `GET /api/configuracion/modulos`

Lista todos los módulos del sistema con su estado habilitado/deshabilitado.

**Auth requerida:** Sí (propietario)

---

### `PUT /api/configuracion/modulos/:codigo`

Habilita o deshabilita un módulo.

**Auth requerida:** Sí (propietario)

**Body:** `{ "habilitado": false }`

---

### `GET /api/configuracion/ganancias`

Obtiene la configuración del método de cálculo de ganancias.

**Auth requerida:** Sí (propietario)

---

### `PUT /api/configuracion/ganancias`

Actualiza el método de cálculo de ganancias.

**Auth requerida:** Sí (propietario)

**Body:**
```json
{
  "metodo_id": 1,
  "tasa_iva": 22,
  "comision_vendedor_pct": 0
}
```

**Métodos disponibles:**
- `margen_venta` — Ganancia = precio_venta − costo por unidad vendida
- `flujo_caja` — Ganancia = ventas totales − costo de entradas de stock

---

## Tipos de IVA

### `GET /api/tipos-iva`

Lista todos los tipos de IVA activos.

**Auth requerida:** Sí

**Respuesta:** `id`, `codigo`, `nombre`, `porcentaje`, `activo`

Tipos incluidos por defecto:
| Nombre    | Porcentaje | Código DGI |
|-----------|------------|------------|
| Básico    | 22%        | 3          |
| Mínimo    | 10%        | 4          |
| Exento    | 0%         | 2          |
| No Grava  | 0%         | 1          |

---

### `POST /api/tipos-iva`

Crea un tipo de IVA.

**Auth requerida:** Sí (propietario)

**Body:** `{ "nombre": "Nuevo", "porcentaje": 15, "codigo": "5" }`

---

### `PUT /api/tipos-iva/:id`

Actualiza un tipo de IVA.

**Auth requerida:** Sí (propietario)

---

### `DELETE /api/tipos-iva/:id`

Elimina un tipo de IVA (solo si no está en uso).

**Auth requerida:** Sí (propietario)

---

## Empaques

### `GET /api/empaques`

Lista todos los tipos de empaque activos.

**Auth requerida:** Sí

---

### `POST /api/empaques`

Crea un tipo de empaque.

**Auth requerida:** Sí (propietario)

**Body:** `{ "nombre": "Caja x12", "cantidad": 12 }`

---

### `PUT /api/empaques/:id`

Actualiza un empaque.

**Auth requerida:** Sí (propietario)

---

### `DELETE /api/empaques/:id`

Elimina un empaque (solo si no está en uso).

**Auth requerida:** Sí (propietario)

---

## Auditoría

### `GET /api/auditoria`

Lista el log de auditoría del sistema.

**Auth requerida:** Sí (propietario)

**Query params:** `desde`, `hasta`, `usuario_id`, `accion`, `page`, `limit`

---

### `GET /api/auditoria/movimientos-stock`

Lista el historial de movimientos de stock.

**Auth requerida:** Sí (permiso `auditoria.ver`)

**Query params:** `desde`, `hasta`, `producto_id`, `tipo` (entrada/salida/ajuste), `page`, `limit`

---

## Permisos

### `GET /api/permisos`

Obtiene todos los permisos disponibles y los permisos actuales por rol.

**Auth requerida:** Sí (propietario)

---

### `PUT /api/permisos/:rol_id`

Actualiza los permisos de un rol.

**Auth requerida:** Sí (propietario)

**Body:** Array de objetos `{ "modulo": "ventas", "accion": "crear", "habilitado": true }`

---

## Ubicaciones

### `GET /api/ubicaciones/departamentos`

Lista todos los departamentos del Uruguay.

**Auth requerida:** Sí

---

### `GET /api/ubicaciones/barrios`

Lista barrios/localidades, opcionalmente filtrados por departamento.

**Auth requerida:** Sí

**Query params:** `departamento_id`

---

## Códigos de error comunes

| Código | Significado |
|--------|-------------|
| `400`  | Datos de entrada inválidos |
| `401`  | No autenticado (token ausente o expirado) |
| `403`  | Sin permiso para la acción |
| `404`  | Recurso no encontrado |
| `409`  | Conflicto (ej: nombre/email duplicado) |
| `500`  | Error interno del servidor |

Los errores siempre devuelven:
```json
{ "error": "Descripción del error" }
```
