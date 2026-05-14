# Informe de validacion del proyecto

## Resumen ejecutivo

La validacion encontro **hallazgos criticos y altos** en backend, frontend y tooling. El problema mas grave es que el backend expone multiples endpoints de negocio sin autenticacion o autorizacion efectiva, lo que permite leer o modificar ventas, stock, clientes, configuracion y auditoria sin token.

Ademas, el proyecto tiene debilidades importantes en manejo de sesion, configuracion de secretos, CORS, exposicion de errores, cobertura de testing y controles de supply chain en CI/CD.

## Resultado de validaciones existentes

### Frontend
- `npm run lint` -> **FAIL**
  - Resultado: **44 problemas** (`33 errors`, `11 warnings`)
  - Mucho ruido proviene de archivos generados en `frontend\dev-dist\sw.js` y `frontend\dev-dist\workbox-5a5d9309.js`
  - Tambien hay errores accionables en codigo fuente:
    - `frontend\src\features\dashboard\Dashboard.jsx` - `react-hooks/set-state-in-effect`
    - `frontend\src\shared\lib\filterPanel.jsx` - `react-refresh/only-export-components`
- `npm run build` -> **OK**
  - Observacion: bundle principal grande (`dist/assets/index-DjLAW2YD.js` ~909 kB) con warning de chunk size

### Backend
- `node --check src/index.js` -> **OK**

## Hallazgos priorizados

### 1. Critico - Endpoints backend sin autenticacion/autorizacion efectiva
- **Categoria**: Seguridad
- **Impacto**: acceso no autorizado a datos y operaciones criticas del negocio
- **Por que importa**: un cliente puede consultar o modificar productos, clientes, ventas, configuracion y auditoria sin token valido.
- **Evidencia**:
  - `backend\src\routes\clientes.js:74-277`
  - `backend\src\routes\productos.js:33-388`
  - `backend\src\routes\empaques.js:13-147`
  - `backend\src\routes\ubicaciones.js:15-195`
  - `backend\src\routes\configuracion.js:9-18,95-104,126-144`
  - `backend\src\routes\auditoria.js:68-187`
  - `backend\src\routes\ventas.js:1168-1781`
- **Reglas**: `SECURITY-08`

### 2. Alto - `JWT_SECRET` con fallback inseguro
- **Categoria**: Seguridad
- **Impacto**: falsificacion potencial de tokens si falta configuracion
- **Por que importa**: si `JWT_SECRET` no esta definido, el backend usa `dev_secret_change_me`.
- **Evidencia**:
  - `backend\src\auth.js:3`
  - `backend\src\routes\usuarios.js:11-12`
- **Reglas**: `SECURITY-12`, `SECURITY-09`

### 3. Alto - CORS permisivo por defecto
- **Categoria**: Seguridad
- **Impacto**: cualquier sitio puede invocar la API desde navegador si no se define `CORS_ORIGIN`
- **Por que importa**: combinado con rutas sin auth, amplifica el riesgo de abuso cross-origin.
- **Evidencia**:
  - `backend\src\index.js:21,35-52`
- **Reglas**: `SECURITY-08`

### 4. Alto - Exposicion de errores internos a clientes
- **Categoria**: Seguridad
- **Impacto**: filtrado de detalles internos, esquema de base, restricciones y comportamiento interno
- **Por que importa**: facilita enumeracion, probing y abuso.
- **Evidencia**:
  - `backend\src\index.js:55-61`
  - `backend\src\dbErrors.js:29-35`
  - `backend\src\routes\configuracion.js:15-17,88-90,101-103,119-121,141-143,170-172`
  - `backend\src\routes\permisos.js:12-14,40-42,61-63,76-78,103-105`
  - `backend\src\routes\ventas.js:1496-1499,1701-1707,1771-1777,1803-1805`
- **Reglas**: `SECURITY-09`, `SECURITY-15`

### 5. Alto - Gating de permisos en frontend solo cosmetico
- **Categoria**: Seguridad / Bug
- **Impacto**: navegacion a vistas sensibles por estado/eventos aunque el menu no las muestre
- **Por que importa**: ocultar opciones no reemplaza validacion real; un evento `ferco:navigate` o cambio de `pantalla` puede abrir vistas sensibles del cliente.
- **Evidencia**:
  - `frontend\src\features\dashboard\Dashboard.jsx:563-579`
  - `frontend\src\features\dashboard\Dashboard.jsx:617-673`
- **Reglas**: `SECURITY-08`

### 6. Alto - Token en `localStorage` y restauracion de sesion confiando en cache
- **Categoria**: Seguridad
- **Impacto**: exfiltracion de token ante XSS y exposicion temporal de identidad/permisos incorrectos
- **Por que importa**: cualquier script inyectado puede leer el token; ademas la app usa `ferco_user` antes de validar `/me`.
- **Evidencia**:
  - `frontend\src\core\api.js:1-13,51-54`
  - `frontend\src\App.jsx:82-100,123-131,146-156`
  - `frontend\src\core\PermisosContext.jsx:35-59`
- **Reglas**: `SECURITY-12`, `SECURITY-11`

### 7. Medio - Validacion insuficiente de inputs en endpoints criticos
- **Categoria**: Bug / Seguridad
- **Impacto**: datos inconsistentes, coerciones inesperadas, stock o precios invalidos
- **Por que importa**: varios endpoints aceptan cuerpos sin type-checking robusto y dependen de coercion o fallos posteriores.
- **Evidencia**:
  - `backend\src\routes\clientes.js:91-163,165-255`
  - `backend\src\routes\productos.js:51-143,146-258,321-367`
  - `backend\src\routes\ventas.js:1297-1499`
- **Reglas**: `SECURITY-05`

### 8. Medio - Enumeracion de cuentas en recuperacion de password
- **Categoria**: Seguridad
- **Impacto**: permite confirmar si un email existe
- **Por que importa**: facilita ataques de enumeracion y phishing dirigido.
- **Evidencia**:
  - `backend\src\routes\usuarios.js:354-370`
- **Reglas**: `SECURITY-12`

### 9. Medio - Acoplamiento por eventos globales en frontend
- **Categoria**: Bug / Calidad
- **Impacto**: integridad de estado fragil y navegacion dificil de razonar
- **Por que importa**: `ferco:user-updated`, `ferco:stock-refresh` y `ferco:navigate` pueden ser disparados por cualquier script en pagina.
- **Evidencia**:
  - `frontend\src\App.jsx:108-120`
  - `frontend\src\features\dashboard\Dashboard.jsx:616-633`
- **Reglas**: `SECURITY-11`, `SECURITY-15`

### 10. Alto - Ausencia de tests automatizados reales
- **Categoria**: Calidad
- **Impacto**: regresiones silenciosas en auth, permisos, ventas y stock
- **Por que importa**: no se detectaron suites unitarias, integracion, e2e ni property-based tests.
- **Evidencia**:
  - `package.json:6-15`
  - `frontend\package.json:6-30`
  - `backend\package.json:6-15`
  - `.github\workflows\ci.yml:13-62`
- **Reglas**: `PBT-09`, `PBT-10`

### 11. Medio - CI del backend casi sin cobertura funcional
- **Categoria**: Calidad
- **Impacto**: cambios backend pueden pasar CI sin cargar rutas, DB ni arranque real
- **Por que importa**: el pipeline solo hace `node --check src/index.js`.
- **Evidencia**:
  - `.github\workflows\ci.yml:40-62`

### 12. Medio - Sin escaneo de dependencias ni acciones fijadas por SHA
- **Categoria**: Seguridad / Supply chain
- **Impacto**: paquetes vulnerables o compromiso de actions pueden pasar desapercibidos
- **Por que importa**: no hay `npm audit`, CodeQL, Dependabot ni equivalente; los workflows usan `actions/*@v4`.
- **Evidencia**:
  - `.github\workflows\ci.yml:21-25,47-51`
  - `.github\workflows\release.yml:15-22`
- **Reglas**: `SECURITY-10`, `SECURITY-13`

### 13. Bajo - Release automatizado sin gate visible dentro del workflow
- **Categoria**: Calidad / CI
- **Impacto**: riesgo de liberar codigo sin validaciones suficientes en la misma pipeline de release
- **Por que importa**: el workflow de release no ejecuta checks propios antes de publicar.
- **Evidencia**:
  - `.github\workflows\release.yml:1-31`

## Cumplimiento de extensiones

### Security Compliance
| Rule | Status | Notes |
|---|---|---|
| SECURITY-03 | Non-compliant | Logging y centralizacion no quedan demostrados; hay fuerte exposicion de errores a clientes. |
| SECURITY-04 | Non-compliant | No se detecto evidencia de headers de seguridad HTTP obligatorios. |
| SECURITY-05 | Non-compliant | Falta validacion robusta de inputs en endpoints criticos. |
| SECURITY-08 | Non-compliant | Authz rota o ausente en backend; gating cliente insuficiente. |
| SECURITY-09 | Non-compliant | Secret fallback inseguro y error handling con fuga de detalles. |
| SECURITY-10 | Non-compliant | No hay scanning de dependencias en CI. |
| SECURITY-11 | Non-compliant | Diseño debil en authz y abuso de eventos/estado. |
| SECURITY-12 | Non-compliant | Manejo de credenciales/sesion debil, sin MFA visible ni proteccion de fuerza bruta demostrada. |
| SECURITY-13 | Non-compliant | Integridad de supply chain floja por actions no fijadas y controles limitados. |
| SECURITY-14 | Non-compliant | No hay evidencia de alerting de eventos de seguridad. |
| SECURITY-15 | Non-compliant | Error handling inseguro y sin evidencia de manejador global robusto. |
| SECURITY-01 | N/A | No se valido infraestructura desplegada. |
| SECURITY-02 | N/A | No se validaron intermediarios de red externos. |
| SECURITY-06 | N/A | No hay IAM/IaC de nube en el repo para evaluar. |
| SECURITY-07 | N/A | No hay configuracion de red/IaC en el repo para evaluar. |

### PBT Compliance
| Rule | Status | Notes |
|---|---|---|
| PBT-01 | Non-compliant | No hay identificacion formal de propiedades en logica critica. |
| PBT-02 | Non-compliant | No se detectaron tests round-trip para serializacion o transformaciones relevantes. |
| PBT-03 | Non-compliant | No se detectaron tests de invariantes para ventas, stock o permisos. |
| PBT-04 | N/A | No se reviso implementacion de operaciones explicitamente idempotentes con harness PBT. |
| PBT-05 | N/A | No se detecto oracle/model-based testing. |
| PBT-06 | N/A | No se detecto stateful property testing. |
| PBT-07 | Non-compliant | No hay generadores de dominio porque no hay PBT visible. |
| PBT-08 | Non-compliant | No hay seed logging ni shrinking porque no hay PBT visible. |
| PBT-09 | Non-compliant | No hay framework PBT configurado en dependencias o CI. |
| PBT-10 | Non-compliant | Tampoco hay suite example-based robusta para caminos criticos. |

## Recomendacion de priorizacion
1. Cerrar de inmediato los endpoints backend sin authz y remover defaults inseguros de JWT/CORS.
2. Corregir manejo de errores y validar inputs en endpoints de negocio.
3. Endurecer manejo de sesion/token en frontend y revisar gating de permisos.
4. Fortalecer CI con tests backend/frontend, scanning de dependencias y controles de release.
5. Diseñar cobertura automatizada minima para auth, permisos, ventas y stock; luego evaluar PBT para invariantes de negocio.
