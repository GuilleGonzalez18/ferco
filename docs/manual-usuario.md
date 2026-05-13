# Manual de Usuario — Mercatus

Guía de uso del sistema de gestión de stock y ventas Mercatus para empresas de importación y distribución.

---

## Índice

- [Acceso al sistema](#acceso-al-sistema)
- [Dashboard](#dashboard)
- [Nueva Venta](#nueva-venta)
- [Historial de Ventas](#historial-de-ventas)
- [Productos](#productos)
- [Clientes](#clientes)
- [Stock](#stock)
- [Estadísticas](#estadísticas)
- [Auditoría](#auditoría)
- [Usuarios](#usuarios)
- [Configuración](#configuración)
- [Roles y permisos](#roles-y-permisos)
- [Facturación Electrónica (CFE)](#facturación-electrónica-cfe)

---

## Acceso al sistema

1. Ingresar a la URL del sistema en el navegador.
2. Ingresar el **correo electrónico** y **contraseña**.
3. Hacer clic en **Iniciar sesión**.

Si olvidó la contraseña, usar el enlace **"¿Olvidé mi contraseña?"** para recibir un código de recuperación por correo.

> **Primer ingreso:** Si es la primera vez que accede al sistema, se le pedirá que cambie su contraseña antes de continuar. Esta acción no puede ser omitida.

---

## Dashboard

La pantalla de inicio muestra un resumen del desempeño del negocio.

### Widgets

Los widgets son tarjetas configurables que muestran métricas clave. Cada usuario puede personalizar qué widgets ver y en qué orden.

**Métricas disponibles:**
- Ventas del día / mes (monto total)
- Cantidad de ventas del día / mes
- Promedio por venta
- Clientes nuevos del mes
- Productos agregados
- Ganancia del día (solo propietario)

**Rangos de tiempo:** Hoy, esta semana, este mes, este año, todo el tiempo.

**Comparaciones:** Se puede ver la variación porcentual respecto al día anterior, la semana anterior, el mes anterior o el año anterior.

### Personalizar widgets

- Usar el botón **"Configurar"** (ícono de ajustes) para abrir el editor de widgets.
- Agregar, eliminar y reordenar los widgets.
- Los cambios se guardan automáticamente.

---

## Nueva Venta

El módulo de punto de venta para registrar transacciones.

### Paso 1: Buscar y agregar productos

- Ingresar el nombre o código del producto en la barra de búsqueda.
- Hacer clic en el producto para agregarlo al carrito.
- Si el producto tiene empaque configurado, se puede elegir entre:
  - **Unidades sueltas** — se ingresa la cantidad de unidades
  - **Empaques** — se ingresa la cantidad de cajas/fundas/etc.
  - **Mixto** — combinación de empaques + unidades sueltas

### Paso 2: Aplicar descuentos (opcional)

- En el carrito, cada ítem puede tener un descuento:
  - **Por porcentaje** (ej: 10%)
  - **Monto fijo** (ej: $50)

### Paso 3: Seleccionar cliente (opcional)

- Usar el campo de búsqueda de clientes.
- Si la venta es a **consumidor final**, dejar el campo vacío.
- Para emitir eFactura (en lugar de eTicket), el cliente debe tener **RUT** cargado.

### Paso 4: Seleccionar medio de pago

Los medios de pago disponibles son:
- Efectivo
- Tarjeta de débito
- Tarjeta de crédito
- Transferencia bancaria

Se pueden combinar múltiples medios de pago en una misma venta. El sistema calcula el vuelto automáticamente para pagos en efectivo.

### Paso 5: Confirmar la venta

- Revisar el resumen: productos, subtotal, total.
- Hacer clic en **"Confirmar venta"**.
- El sistema descuenta el stock automáticamente.

### Paso 6: Imprimir o emitir CFE

Después de confirmar:
- **Imprimir ticket/factura** — genera un PDF con los datos de la venta.
- **Emitir CFE** — envía el comprobante fiscal electrónico a la DGI (ver [Facturación Electrónica](#facturación-electrónica-cfe)).

> Si el CFE está deshabilitado en el sistema, el botón de emisión no aparecerá.

---

## Historial de Ventas

Listado completo de todas las ventas realizadas.

### Filtros disponibles

- Rango de fechas (desde / hasta)
- Cliente
- Estado de entrega (pendiente / entregado / cancelado)
- Vendedor (solo propietario)

### Acciones sobre una venta

| Acción | Descripción | Permiso requerido |
|--------|-------------|-------------------|
| Ver detalle | Muestra todos los ítems, pagos y datos de la venta | Cualquier usuario |
| Reimprimir | Genera el PDF de la venta nuevamente | Cualquier usuario |
| Ver CFE | Muestra el JSON del CFE generado | Cualquier usuario |
| Cambiar estado entrega | Actualiza entre pendiente / entregado / cancelado | Vendedor propio / Propietario |
| Cancelar venta | Cancela la venta y restaura el stock | Solo propietario |
| Eliminar venta | Elimina la venta del historial (soft delete) | Solo propietario |

---

## Productos

Gestión del catálogo de productos.

### Agregar un producto

1. Ir a **Productos** → botón **"Nuevo producto"**.
2. Completar los campos:
   - **Nombre** (obligatorio)
   - **Precio de venta** (obligatorio)
   - **Costo** (opcional, para cálculo de ganancias)
   - **Stock inicial**
   - **Unidad** (ej: unidad, kg, metro)
   - **IVA** — tipo de IVA aplicable (Básico 22%, Mínimo 10%, Exento, No Grava)
   - **Empaque** — tipo de empaque disponible (caja, funda, etc.)
   - **Cantidad por empaque** y **precio de empaque**
   - **Código EAN/barras** (opcional)
   - **Imagen** (opcional, se puede tomar foto o subir archivo)

### Editar un producto

- Hacer clic en el ícono de edición en la fila del producto.
- Modificar los campos necesarios y guardar.

### Archivar un producto

Los productos se **archivan** en lugar de eliminarse permanentemente. Un producto archivado no aparece en la búsqueda de ventas pero su historial se conserva.

### Stock bajo

En el dashboard y en la lista de productos se resaltan en rojo los productos con stock por debajo del mínimo configurado.

---

## Clientes

ABM (Alta, Baja, Modificación) de clientes.

### Datos del cliente

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre o razón social |
| RUT | RUT de la empresa (para facturación) |
| Tipo de documento | RUT, CI, Pasaporte, DNI, Otro |
| Número de documento | Número según el tipo seleccionado |
| Dirección | Dirección física |
| Teléfono | Número de contacto |
| Correo | Email del cliente |
| Departamento | Departamento del Uruguay |
| Horarios | Apertura, cierre y reapertura (para gestión de visitas) |

> **Importante para CFE:** Para emitir una **eFactura** (CFE tipo 111) el cliente debe tener cargado su RUT y tipo de documento.

---

## Stock

Módulo para gestionar ajustes manuales de inventario.

### Registrar un movimiento de stock

1. Ir a **Stock** → **"Nuevo movimiento"**.
2. Buscar el producto.
3. Seleccionar el tipo:
   - **Entrada** — suma stock (reposición, devolución)
   - **Salida** — resta stock (merma, uso interno)
   - **Ajuste** — corrección directa del stock
4. Ingresar la cantidad y opcionalmente el costo y el motivo.
5. Confirmar.

Todos los movimientos quedan registrados en el historial de auditoría.

---

## Estadísticas

Vista de análisis de ventas y rendimiento del negocio.

### Métricas disponibles (propietario)

- Total de ventas por período
- Ganancia por período
- Mejor cliente (mayor volumen de compra)
- Artículo más vendido
- Mayor venta individual
- Serie temporal de ventas (gráfico de barras)
- Comparativa de períodos actuales vs anteriores
- Mejor día de la semana y mejor horario de ventas

### Métricas para vendedores

Los vendedores solo ven sus propias estadísticas (sin acceso a datos de otros vendedores ni a la ganancia global).

### Filtros

- Desde / hasta (fechas)
- Vendedor (solo propietario)

---

## Auditoría

Registro completo de todas las acciones realizadas en el sistema.

### ¿Qué se registra?

- Creación, modificación y eliminación de ventas, productos y clientes
- Ajustes de stock
- Cambios de configuración
- Accesos al sistema

### Historial de movimientos de stock

Ver el detalle de cada entrada, salida o ajuste de stock con:
- Fecha y hora
- Usuario que realizó el movimiento
- Stock anterior y nuevo
- Motivo registrado

---

## Usuarios

Gestión de los usuarios del sistema. Solo accesible para el propietario.

### Crear un usuario

1. Ir a **Configuración** → **Usuarios** → **"Nuevo usuario"**.
2. Completar: nombre, apellido, correo, usuario y contraseña.
3. Asignar el rol: **Propietario** o **Vendedor**.
4. El usuario nuevo tendrá una alerta para cambiar su contraseña en el primer ingreso.

### Permisos de vendedor

Los vendedores tienen permisos configurables por módulo y acción. El propietario puede habilitar/deshabilitar cada permiso individualmente desde la sección de permisos.

### Forzar cambio de contraseña

El propietario puede obligar a cualquier usuario a cambiar su contraseña en el próximo login usando el botón **"Forzar cambio de contraseña"** en la lista de usuarios.

---

## Configuración

Panel de configuración del sistema. Solo accesible para el propietario.

### Pestaña Empresa

Datos de la empresa que aparecen en facturas, PDFs y en la pantalla de login:

- **Nombre y razón social**
- **RUT** de la empresa
- **Giro** (actividad comercial)
- **Ciudad y departamento** — obligatorios para emitir CFE
- Dirección, teléfono, correo, website
- **Logo** — imagen que aparece en el encabezado y en los documentos impresos
- **Colores** — personalización de la paleta de colores del sistema

### Pestaña Módulos

Habilitar o deshabilitar secciones del menú para todos los usuarios. Útil para ocultar módulos que no se usan o que están en proceso de configuración.

### Pestaña Ganancias

Seleccionar el método de cálculo de la ganancia:

| Método | Descripción |
|--------|-------------|
| **Margen de venta** | Ganancia = (precio_venta − costo) × cantidad por cada ítem vendido |
| **Flujo de caja** | Ganancia = ventas totales − costo de las entradas de stock |

También se puede configurar la tasa de IVA y la comisión de vendedor.

### Pestaña CFE

> Solo visible cuando CFE está habilitado.

Configurar el ambiente de emisión del CFE:

| Ambiente | Descripción |
|----------|-------------|
| **Local** | Genera el JSON del CFE sin enviarlo a la DGI |
| **Pruebas** | Envía al servidor de testing de Dynamica |
| **Producción** | Envía a la DGI (registros oficiales ante el fisco) |

> ⚠️ **Advertencia:** Al seleccionar el ambiente **Producción**, el sistema muestra un aviso indicando que todas las transacciones quedarán registradas ante la DGI. Solo activar después de completar el proceso de Testing y Homologación con RPG Software.

---

## Roles y Permisos

### Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Propietario** | Acceso total al sistema. Puede gestionar usuarios, configuración, y ver todas las ventas y estadísticas. |
| **Vendedor** | Acceso limitado según permisos configurados. Solo ve sus propias ventas y estadísticas. |

### Permisos configurables para vendedores

Los permisos se configuran en **Configuración → Permisos** y se aplican al rol Vendedor:

| Módulo | Acciones configurables |
|--------|------------------------|
| Productos | Ver, agregar, editar, ajustar stock |
| Ventas | Ver (propias), crear |
| Clientes | Ver, agregar, editar |
| Estadísticas | Ver (propias), ver empresa |
| Auditoría | Ver |

---

## Facturación Electrónica (CFE)

El sistema permite emitir Comprobantes Fiscales Electrónicos (CFE) a través de la API Módulo de Dynamica, integrada con la DGI de Uruguay.

### Requisitos previos

Antes de poder emitir CFE, verificar que esté configurado:

1. **CFE habilitado** — la variable `CFE_HABILITADO=true` debe estar activa en el servidor.
2. **Datos de la empresa** — ciudad y departamento son obligatorios.
3. **IVA en productos** — cada producto debe tener un tipo de IVA asignado.
4. **URLs y tokens** — las variables `CFE_PRUEBAS_URL`, `CFE_PRUEBAS_TOKEN`, etc., deben estar configuradas.

### Tipos de CFE

| Tipo | Código DGI | Cuándo se emite |
|------|------------|-----------------|
| eTicket | 101 | Cliente sin RUT (consumidor final) |
| eFactura | 111 | Cliente con RUT (empresa o persona jurídica) |

### Proceso de emisión

1. Confirmar la venta normalmente.
2. En el resumen de la venta, hacer clic en **"Emitir CFE"**.
3. El sistema genera el JSON con todos los datos fiscales.
4. Según el ambiente configurado, el CFE se envía al servidor correspondiente.
5. Si hay error de comunicación, se mostrará un mensaje indicando que reintente y, si persiste, que contacte a RPG Software.

### Ambientes de trabajo

Para comenzar a usar CFE se recomienda el siguiente proceso:

1. **Ambiente Local** — verificar que el JSON generado tenga la estructura correcta.
2. **Ambiente Pruebas** — realizar transacciones de prueba con el servidor de testing de Dynamica para validar la comunicación.
3. **Ambiente Producción** — una vez homologado el sistema con DGI, activar este ambiente para las operaciones reales.

### Reimprimir un CFE

Desde el **Historial de Ventas**, en la venta correspondiente:
- Botón **"Ver CFE"** — muestra el JSON del CFE.
- Botón **"Imprimir"** — genera el PDF del comprobante.
