# Visual Refresh Requirements

## Intent Analysis Summary
- **User request**: mejorar visualmente el aplicativo, incorporando animación y movimiento, revisando primero la propuesta antes de tocar código.
- **Request type**: enhancement de frontend brownfield existente.
- **Scope estimate**: multiple components, con visión completa de toda la app y primera implementación concentrada en áreas de alto impacto.
- **Complexity estimate**: moderate, por combinar sistema visual compartido, movimiento, branding dinámico y varias pantallas clave.

## Requirement Summary
- La mejora debe sentirse **más premium y moderna**.
- El cambio debe ser **visiblemente mejorado**, pero sin romper la identidad general del producto.
- La **paleta base no puede fijarse en código** porque depende de configuración de base de datos.
- La primera implementación debe diseñar una visión global, pero ejecutar primero **login + dashboard + ventas + componentes compartidos**.
- El movimiento puede ser **notorio**, privilegiando impacto visual.

## Functional Requirements

### FR-01: Refresh visual premium
La aplicación debe elevar su percepción visual mediante mejores superficies, profundidad, espaciado, jerarquía y terminaciones visuales, sin exigir un rebrand completo.

### FR-02: Respeto de branding dinámico
La mejora visual debe conservar el esquema de colores configurable desde la base de datos. Los cambios deben apoyarse en composición, transparencias, sombras, bordes, brillo y derivados del color actual, no en fijar una paleta nueva rígida.

### FR-03: Primera tanda enfocada
La primera implementación debe cubrir:
- login
- dashboard principal
- ventas
- componentes compartidos reutilizables (botones, campos, tablas, modales y superficies base)

### FR-04: Visión global consistente
Aunque la primera tanda sea parcial, el diseño debe establecer una dirección reutilizable para que el resto de módulos pueda alinearse después sin rehacer el lenguaje visual.

### FR-05: Movimiento y microinteracciones
La UI debe incorporar animaciones visibles en:
- entradas de pantallas y bloques
- hover/focus/active states
- botones y acciones primarias
- tarjetas, widgets y paneles
- drawers, overlays y modales
- feedback de navegación y acciones de venta

### FR-06: Preservación flexible del layout
Se debe preservar la identidad general y los colores, pero se permite evolucionar el layout interno para mejorar presencia visual y experiencia.

## Non-Functional Requirements

### NFR-01: Compatibilidad con la arquitectura actual
La propuesta debe apoyarse en la estructura existente del frontend (`App.jsx`, `Dashboard`, `Login`, `Ventas`, `AppButton`, `AppTable`, `AppField`, `AppDialogHost`) sin requerir un rediseño de arquitectura.

### NFR-02: Consistencia reutilizable
Los cambios deben priorizar tokens, clases y patrones compartidos para que el refresh sea uniforme y no una suma de estilos aislados por pantalla.

### NFR-03: Performance razonable
Las animaciones deben implementarse principalmente con propiedades visuales eficientes (`transform`, `opacity`, `filter`, `box-shadow`) y evitar efectos costosos o invasivos.

### NFR-04: Impacto visual alto sin dependencia de nueva paleta
La mejora debe percibirse claramente aun manteniendo la paleta configurable actual.

### NFR-05: Brownfield-safe
La implementación posterior debe ser incremental, permitiendo revisar resultados por lote sin mezclar el refresh visual con cambios funcionales grandes.

## Proposed Visual Direction

### 1. Sistema visual base
- Aumentar sensación premium con superficies semitransparentes, capas, blur selectivo, sombras más profundas y bordes más limpios.
- Refinar escala de radios, espaciado y densidad visual para que toda la app respire mejor.
- Crear estados visuales más ricos para botones, inputs, chips, toggles, cards y tablas.

### 2. Dashboard
- Sidebar más rica visualmente, con mejor profundidad, resaltado activo más elegante y transiciones más fluidas.
- Topbar más pulida, con acciones más vivas y jerarquía más clara.
- Widgets KPI con más presencia, mejor entrada animada y estados hover/edit más refinados.
- Landing del dashboard con mayor impacto visual y mejor composición.

### 3. Login
- Pantalla con look más premium, mayor dramatismo visual y mejor uso del branding configurado.
- Card de acceso más cuidada, con mejor jerarquía, profundidad y entrada animada.
- Modal/flujo de recuperación más alineado con el nuevo lenguaje visual.

### 4. Ventas
- Catálogo de productos y carrito con más sensación de producto moderno.
- Cards de producto, drawer de cliente, carrito y pasos con más feedback visual y transición.
- Más énfasis en acciones principales y confirmaciones visuales.

### 5. Shared components
- `AppButton`: elevar personalidad, profundidad, hover, active y posibles variantes visuales premium.
- `AppField`: inputs más modernos y expresivos.
- `AppTable`: cabeceras, hover, expansión de filas y estados vacíos más refinados.
- `AppDialogHost`: overlays y modales con mejor entrada, backdrop y presencia.

## Explicit Non-Goals For This Stage
- No redefinir una paleta fija global desconectada de configuración.
- No rehacer toda la app en una única tanda de implementación.
- No mezclar este refresh con cambios de seguridad, backend o lógica de negocio.

## Recommended Implementation Sequence
1. Shared visual foundation
2. Login
3. Dashboard shell and widgets
4. Ventas
5. Rollout del lenguaje visual al resto de módulos
