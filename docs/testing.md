# Testing — Mercatus

## Comandos principales (todos desde la raíz)

| Comando | Qué hace | Necesita servicios levantados |
|---|---|---|
| `npm test` | Unit tests | ❌ Nada |
| `npm run test:integration` | Integration tests | ❌ Levanta y baja el backend solo |
| `npm run test:e2e` | E2E con Playwright | ❌ Levanta y baja backend + frontend solos |
| `npm run test:e2e:ui` | E2E en modo visual interactivo | ❌ Igual que arriba |
| `npm run test:e2e:report` | Abre el reporte HTML del último E2E | ❌ Nada |

> Si ya tenés el backend o el frontend corriendo (modo dev), los tests de integración y E2E los **reutilizan** sin reiniciarlos.

---

## Unit tests — `npm test`

### `auth.test.js`
| Test | Qué verifica |
|---|---|
| `normalizeTipo` | "propietario", "admin", "PROPIETARIO" → "propietario"; "vendedor", mixto → "vendedor"; string vacío/null/undefined/desconocido → "vendedor" |
| `isPropietario` | `{ rol_nombre: "propietario" }` y `{ tipo: "admin" }` → true; vendedor/null/undefined/objeto vacío → false |
| `getAuthUserFromRequest` | Sin header → null; token malformado/expirado/firma incorrecta/sub inválido → null; token válido → retorna user con todos los campos del payload |

### `validate.test.js`
| Test | Qué verifica |
|---|---|
| `validateRequired` | Pasa con string no vacío y "0"; falla con vacío, solo espacios, null, undefined; incluye nombre del campo en el error |
| `validateMaxLength` | Pasa en el límite exacto y por debajo; falla si excede; null/undefined pasan (campo opcional) |
| `validateMinLength` | Pasa en el mínimo y por encima; falla si es más corto o null |
| `validatePositiveInt` | Pasa con 1, 100, string "5" (coerce); falla con 0, negativo, float, string no numérico |
| `validateNumber` | Pasa en rango, con 0, con null sin required; falla con null requerido, NaN, Infinity, fuera de rango |
| `validateEnum` | Pasa con valor permitido, null sin required; falla con valor no permitido y null requerido; incluye los valores en el error |
| `validateBoolean` | Pasa con `true`/`false`; falla con string "true", número 1, null, undefined |
| `validateHexColor` | Pasa `#FFF`, `#FFFFFF`, `#abc`, null/vacío (opcional); falla sin `#`, con caracteres inválidos, longitud incorrecta |
| `validateIdentifier` | Pasa letras+números, guión, underscore, null (opcional); falla con espacio, `@`, `.`, `/` |
| `validateDateFormat` | Pasa fecha YYYY-MM-DD válida, null/vacío (opcional); falla con string inválido |
| `validateBase64Size` | Pasa null/vacío (opcional) y base64 pequeño; falla si supera el límite; incluye tamaño en MB |
| `validateArray` | Pasa con array no vacío y dentro de límites; falla con vacío, sobre el máximo (500), null, objeto plano; respeta min/max custom |
| `firstError` | Retorna null si todos son null; retorna el primer error no-null; ignora nulls intermedios |
| `respondIfInvalid` | Envía 400 y retorna true con error; no envía nada y retorna false sin error |

### `cfeHelpers.test.js`
| Test | Qué verifica |
|---|---|
| `round2` | Redondea a 2 decimales; enteros sin cambios; null/undefined → 0; coerce strings; precisión en 1.005 |
| `round4` | Redondea a 4 decimales; enteros sin cambios; null → 0; coerce strings |
| `formatDate` | null/vacío/inválido → null; fecha válida → string de 10 chars con año y mes correctos |
| `formatDateTime` | null/inválido → null; fecha válida → formato `YYYY-MM-DD HH:mm:ss` sin la letra T |
| `getIteIndFact` | Código 2 → IVA mínimo; 3 → IVA básico; 1 → No Grava; 4/null/undefined → fallback 1; string "3" hace coerce |
| `getFmaPago` | "credito"/"CREDITO" → "2"; "efectivo"/"debito"/null/vacío → "1" |
| `getGlosaMP` | "credito" → "CRÉDITO"; "debito" → "DÉBITO"; "transferencia" → "TRANSFERENCIA"; "efectivo"/null/desconocido → "EFECTIVO" |
| `getCodMP` | "efectivo" → "1"; "credito" → "2"; "debito" → "3"; "transferencia" → "4"; null/vacío → "1" |
| `getRcpTipoDoc` | "RUT" → 2; "CI" → 3; "PASAPORTE" → 5; "DNI" → 6; desconocido → 4; vacío/null/undefined → null |
| `getCFETipo` | Cliente con RUT y número de documento → eFactura "111"; sin número/CI/null/undefined/objeto vacío → eTicket "101" |
| `validateRut` | 12 y 9 dígitos → válido; con guiones → válido; 8/13 dígitos/null/vacío → inválido |
| `getUniMed` | null/vacío → "UNID"; minúsculas → mayúsculas; "CAJA" → "CAJA"; "kg" → "KG"; strings largos → truncados a 4 chars |
| `getCodiTpoCod` | null/vacío → "INT1"; EAN-13 → "GTIN13"; EAN-12 → "GTIN12"; EAN-8 → "GTIN8"; 4 dígitos → "INT1"; EAN con guiones → detecta correctamente |

### `cfeSender.test.js`
| Test | Qué verifica |
|---|---|
| `buildCfeConfig` | Sin `CFE_HABILITADO` → null; con "false"/"0" → null; habilitado sin URL/token → null; con URL pero sin token → null; con token pero sin URL → null; con URL y token → config válida; timeout default 20000ms; timeout personalizado; timeout mínimo 1000ms; string no numérico en timeout → usa default; empresa null/{}/vacío/minúsculas → LOCAL por defecto |

### `cfeDescuentos.test.js`
| Test | Qué verifica |
|---|---|
| `calcDescuentoGlobal` | tipo null/undefined/"ninguno" → 0; porcentaje 10%/0%/100%/>100% (clamp)/negativo/sobre base 0/15%; fijo 50/0/mayor que base (clamp)/negativo/igual a base |
| `distributeGlobalDiscount` | arreglo vacío → []; descuento 0 → todos ceros; una línea → recibe todo; suma exacta igual al descuento total; distribución 50/50; proporcional 2/3 y 1/3; ningún valor negativo; base cero → todo al último; mantiene longitud; tres líneas con proporciones irregulares |

### `pbt.test.js` — Property-based tests (datos aleatorios)
| Invariante | Qué garantiza |
|---|---|
| `round2` idempotente | `round2(round2(x)) === round2(x)` para cualquier número |
| `round2` finito | Siempre produce número finito para input finito |
| `round2` no negativo | Para inputs ≥ 0, resultado ≥ 0 |
| `round2` asociatividad | `round2(a+b)` difiere de `round2(a)+round2(b)` en máximo 0.015 |
| `round4` idempotente | `round4(round4(x)) === round4(x)` |
| `round4` precisión | `|round4(x) - x| ≤ 0.00005` |
| `getIteIndFact` | Siempre retorna 1, 2 o 3 |
| `getFmaPago` | Siempre retorna "1" o "2" |
| `getCodMP` | Siempre retorna uno de "1","2","3","4" |
| `getGlosaMP` | Siempre retorna string no vacío |
| `getCFETipo` | Siempre retorna "101" o "111" |
| `getUniMed` | Resultado siempre 1-4 chars, uppercase, no vacío |
| `getCodiTpoCod` | Siempre retorna uno de los tipos conocidos |
| `getRcpTipoDoc` | Siempre retorna entero positivo o null |
| `validateNumber` rango | Valor en [min,max] siempre pasa; fuera del rango siempre falla |
| Stock no negativo | `round2(stock * precio) ≥ 0` para stock y precio ≥ 0 |
| Descuento acotado | Descuento aplicado ≤ monto bruto cuando descuento_pct en [0,100] |
| Invariante contable | `TotMntTotal = sum(componentes)` con error máx 0.01 |
| `calcDescuentoGlobal` acotado | Resultado siempre ≥ 0 y ≤ base neta; tipo "ninguno" siempre → 0; porcentaje 100 → exactamente la base |
| `distributeGlobalDiscount` suma | `sum(resultado) === descGlobalAmount` exactamente; cada elemento ≥ 0; longitud igual a las líneas; descuento 0 → todos ceros |
| `firstError` | Si todos son null → null; siempre retorna el primer no-null |
| `validateArray` límites | Tamaño en [min,max] siempre pasa; fuera → siempre falla |

---

## Integration tests — `npm run test:integration`

| Archivo | Tests |
|---|---|
| `ventas.integration.test.js` | `POST /ventas` crea la venta y descuenta stock del producto · `GET /ventas` lista ventas con 200 · `PUT /ventas/:id/cancelar` restaura el stock al estado original · 401 sin token en todos los endpoints |
| `stock.integration.test.js` | `PATCH /productos/:id/stock` ajusta la cantidad · verifica que el movimiento queda registrado en `movimientos_stock` · 401 sin token |
| `cfe.integration.test.js` | `GET /ventas/:id/cfe` retorna 200 con JSON DGI (campos `Master`, `Emisor`, `Totales`, `Detalle`) · `CFETipoCFE` es 101 o 111 · `TotMntTotal` es numérico > 0 · cada ítem tiene campos obligatorios · Emisor tiene ciudad y departamento · ID inexistente → 404 · sin token → 401 |

---

## E2E Playwright — `npm run test:e2e`

| Archivo | Tests |
|---|---|
| `ventas.spec.js` | Flujo completo de nueva venta desde el navegador |
| `productos.spec.js` | CRUD de productos |
| `historial.spec.js` | Listar ventas · expandir fila muestra panel de detalle · panel contiene botón reimprimir · segundo click colapsa el panel |
| `stock.spec.js` | Listar productos · expandir fila muestra panel con los 3 botones · agregar stock incrementa la cantidad · quitar stock decrementa la cantidad · fijar stock establece el valor exacto · buscar por nombre filtra la lista |
| `clientes.spec.js` | Listar clientes · abrir formulario con botón Agregar · crear cliente con nombre y RUT · buscar por nombre filtra la lista · expandir fila muestra panel de acciones |
| `cfe.spec.js` | Botón "Emitir CFE" visible cuando CFE está habilitado (se saltea si está deshabilitado) · "Ver CFE" muestra JSON con campo `Master` · botón en nueva venta visible/oculto según configuración |

---

## Correr un test específico

```bash
# Un archivo de unit test (desde backend/)
node --test src/__tests__/cfeSender.test.js

# Por nombre (regex)
node --test --test-name-pattern "buildCfeConfig" src/__tests__/cfeSender.test.js

# E2E un archivo específico
npx playwright test e2e/tests/stock.spec.js

# E2E por nombre
npx playwright test --grep "agregar stock"
```


