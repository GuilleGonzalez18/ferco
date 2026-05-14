# Preguntas de Requisitos — Implementación Playwright E2E

Por favor completá cada pregunta escribiendo la letra elegida después de `[Answer]:`.

---

## Question 1
¿Qué flujos de negocio querés cubrir con los tests E2E de Playwright?

A) Solo el flujo crítico de ventas (nueva venta, agregar productos, confirmar, imprimir)
B) Ventas + autenticación (login, logout, sesión expirada)
C) Ventas + autenticación + gestión de productos (CRUD)
D) Todos los flujos principales: auth, ventas, productos, clientes, usuarios, configuración
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 2
¿Cómo manejamos la base de datos para los tests E2E?

A) Base de datos de test separada (se crea y destruye por cada run de tests)
B) Base de datos local existente con datos de seed (más rápido, sin aislamiento total)
C) Mock del backend — interceptar requests con Playwright y retornar respuestas fake
D) Tests contra el backend real corriendo localmente (sin mocks, sin DB especial)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 3
¿Dónde vas a correr los tests Playwright en CI?

A) GitHub Actions solamente (en cada push/PR a main y develop)
B) Localmente solamente (por ahora, sin CI)
C) Tanto localmente como en GitHub Actions
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
¿Qué browsers querés incluir?

A) Solo Chromium (más rápido, suficiente para la mayoría de los casos)
B) Chromium + Firefox
C) Chromium + Firefox + WebKit (Safari)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 5
¿Cómo querés organizar los tests?

A) Un archivo por flujo de negocio (ventas.spec.js, auth.spec.js, productos.spec.js)
B) Un archivo por página/pantalla del sistema
C) Tests agrupados por tipo: smoke tests, regression tests, happy path
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6
¿Qué cobertura inicial esperás para esta primera iteración?

A) Solo happy path (flujos exitosos sin errores)
B) Happy path + casos de error principales (login fallido, venta sin productos, etc.)
C) Happy path + casos de error + casos de borde (stock 0, descuentos inválidos, etc.)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 7
¿Querés Page Object Model (POM) para organizar los selectores y acciones?

A) Sí — POM completo (cada pantalla tiene su clase con métodos y selectores)
B) Sí — POM simplificado (solo helpers/fixtures, sin clases formales)
C) No — tests directos sin abstracción de POM (más simple para empezar)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8
¿Dónde se va a instalar Playwright?

A) En el root del monorepo (package.json raíz)
B) En una carpeta separada `e2e/` en el root (monorepo pattern)
C) Dentro de `frontend/` junto a los otros devDependencies del frontend
X) Other (please describe after [Answer]: tag below)

[Answer]: A
