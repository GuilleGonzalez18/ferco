# API Documentation

## REST APIs

### Health
- **Method**: GET
- **Path**: `/api/health`
- **Purpose**: verificar disponibilidad basica del backend y conectividad a base de datos.
- **Request**: sin body.
- **Response**: estado general con chequeo `SELECT 1`.

### Usuarios
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/usuarios`
- **Purpose**: login, perfil, administracion de usuarios y reseteo de password.
- **Request**:
  - `POST /login` con credenciales.
  - `GET /me` con JWT.
  - `POST /forgot-password` y `POST /reset-password` para recuperacion.
- **Response**: token JWT, datos de usuario y resultados CRUD.

### Productos
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/productos`
- **Purpose**: catalogo de productos, stock y alta/baja logica.
- **Request**: payloads JSON de producto, ajustes de stock y filtros.
- **Response**: listado, detalle y confirmaciones de actualizacion.

### Ventas
- **Methods**: GET, POST, PUT
- **Path**: `/api/ventas`
- **Purpose**: registrar ventas, consultar dashboard, historial, entregas, cancelaciones, correo y CFE.
- **Request**:
  - `POST /` crea venta transaccional.
  - `GET /dashboard/resumen` y widgets para metricas.
  - `PUT /:id/estado-entrega`, `POST /:id/enviar-email`, `POST /:id/cancelar`, `GET /:id/cfe`.
- **Response**: resumentes, ventas persistidas y resultados de acciones asociadas.

### Clientes
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/clientes`
- **Purpose**: mantenimiento de clientes y validaciones asociadas.
- **Request**: datos de cliente, contacto y ubicacion.
- **Response**: entidad cliente y operaciones CRUD.

### Auditoria
- **Methods**: GET
- **Path**: `/api/auditoria`
- **Purpose**: consulta de eventos, movimientos de stock y series de costo.
- **Request**: filtros por fecha, usuario o tipo de evento.
- **Response**: listas de eventos y movimientos historicos.

### Configuracion
- **Methods**: GET, PUT
- **Path**: `/api/configuracion`
- **Purpose**: datos de empresa, modulos habilitados y parametros de ganancias.
- **Request**: configuracion JSON.
- **Response**: snapshot de configuracion del negocio.

### Permisos
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/permisos`
- **Purpose**: administrar roles y permisos.
- **Request**: definicion de rol y permisos por modulo/accion.
- **Response**: listado de roles y matrices de autorizacion.

### Ubicaciones
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/ubicaciones`
- **Purpose**: mantener catalogos de departamentos y barrios.
- **Request**: datos maestros de ubicacion.
- **Response**: listas y actualizaciones de catalogos.

### Tipos IVA
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/tipos-iva`
- **Purpose**: mantener tipos de IVA configurables.
- **Request**: definicion del tipo fiscal.
- **Response**: catalogo actualizado.

### Empaques
- **Methods**: GET, POST, PUT, DELETE
- **Path**: `/api/empaques`
- **Purpose**: mantener empaques y presentaciones comerciales.
- **Request**: definicion del empaque.
- **Response**: catalogo actualizado.

## Internal APIs

### frontend/src/core/api.js
- **Methods**: funciones exportadas por dominio (`login`, `getProductos`, `crearVenta`, `getEventosAuditoria`, `getConfiguracionEmpresa`, entre otras).
- **Parameters**: objetos JSON para bodies y filtros simples.
- **Return Types**: promesas con JSON parseado o texto plano para respuestas especiales de CFE.

### backend/src/auth.js
- **Methods**: `signToken`, `requireAuth`, `requirePropietario`, `getAuthUserFromRequest`.
- **Parameters**: payload JWT y objetos `req/res/next`.
- **Return Types**: token firmado o middleware Express.

### backend/src/mailer.js
- **Methods**: helpers de envio de mail.
- **Parameters**: destinatarios, asunto, HTML/texto y configuracion de transporte.
- **Return Types**: resultado de envio o error propagado.

### backend/src/cfeBuilder.js
- **Methods**: `buildCFE`, `buildCFEAnnotated`.
- **Parameters**: datos de venta, cliente y configuracion.
- **Return Types**: payload estructurado listo para serializar o enviar.

## Data Models

### Usuario
- **Fields**: identificacion, nombre, rol, password hash, flags de cambio/reset.
- **Relationships**: se vincula con auditoria y permisos.
- **Validation**: credenciales validas y JWT para rutas protegidas.

### Producto
- **Fields**: nombre, precio, costo, stock, activo, referencias fiscales y empaques.
- **Relationships**: ventas, movimientos de stock, tipos de IVA y empaques.
- **Validation**: stock y datos comerciales requeridos.

### Cliente
- **Fields**: nombre, contacto, documento, direccion, barrio/departamento y datos fiscales.
- **Relationships**: ventas y CFE.
- **Validation**: reglas de horario/contacto y consistencia fiscal.

### Venta
- **Fields**: cabecera de venta, lineas, totales, estado de entrega, email, referencias CFE.
- **Relationships**: cliente, usuario, productos y movimientos de stock.
- **Validation**: transaccion SQL, disponibilidad de stock y calculos monetarios.

### Configuracion empresa
- **Fields**: datos de empresa, branding, modulos habilitados y parametros de ganancia.
- **Relationships**: afecta UI frontend, CFE y calculos comerciales.
- **Validation**: persistencia y carga global via `ConfigContext`.
