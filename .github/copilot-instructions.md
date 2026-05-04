# Copilot Instructions - Ferco

Estas instrucciones aplican a todo el repositorio y son obligatorias para cualquier cambio nuevo.

## Principios de Arquitectura

- Aplicar SOLID en toda implementación nueva y refactors.
- Mantener separacion por responsabilidades:
  - `frontend/src/features`: logica y vistas por dominio funcional.
  - `frontend/src/shared/components`: componentes reutilizables y presentacionales.
  - `frontend/src/shared/lib`: utilidades puras y helpers sin UI.
  - `frontend/src/core`: servicios y acceso a API/version.
- Evitar logica de negocio en componentes de UI compartidos.
- Evitar dependencia circular entre features.
- Priorizar composicion de componentes sobre duplicacion.

## Reutilizacion de UI

- No crear `input`, `select` o `textarea` nativos en features.
- Usar siempre componentes compartidos:
  - `AppInput` en `frontend/src/shared/components/fields/AppInput.jsx`
  - `AppSelect` en `frontend/src/shared/components/fields/AppSelect.jsx`
  - `AppTextarea` en `frontend/src/shared/components/fields/AppTextarea.jsx`
  - `AppButton` en `frontend/src/shared/components/button/AppButton.jsx`
- No duplicar componentes equivalentes en features.
- Si una pantalla requiere una variante nueva, extender el componente compartido mediante props antes de crear otro.

## Estilos y Consistencia Visual

- Los estilos base de campos deben mantenerse en:
  - `frontend/src/shared/components/fields/AppField.css`
- Los estilos base de botones deben mantenerse en:
  - `frontend/src/shared/components/button/AppButton.css`
- Los tokens globales de diseno deben mantenerse en:
  - `frontend/src/index.css`
- En features, solo definir estilos de layout local y comportamiento visual especifico.
- No redefinir en features propiedades base de campos (alto, tipografia, foco, borde, radio), salvo excepcion justificada.
- Mantener consistencia de estados: focus, disabled, readonly, hover.

## Componentes Compartidos Existentes

- Tablas: usar `AppTable` y centralizar estilos en `frontend/src/shared/components/table/AppTable.css`.
- Dialogos: usar `AppDialogHost` y helpers de `appDialog`.
- Menus o shells compartidos: centralizar en `frontend/src/shared/components`.

## Criterios de Implementacion

- Cada cambio debe minimizar regresiones y preservar funcionalidades existentes.
- Evitar cambios cosmeticos no solicitados.
- Mantener nombres de props, patrones de estados y APIs publicas estables.
- Preferir utilidades puras reutilizables para transformaciones complejas.

## Performance y Fluidez

- Evitar re-renders innecesarios:
  - usar `useMemo` y `useCallback` cuando aporte valor real.
  - extraer componentes pesados y usar `memo` cuando sea conveniente.
- Evitar crear funciones inline costosas en listas grandes sin necesidad.
- Mantener computos pesados fuera del render directo.
- Priorizar rendering eficiente en tablas/listados grandes.
- Considerar lazy loading y code splitting para modulos pesados cuando aplique.

## Calidad y Verificacion

- Despues de editar, validar:
  - errores de compilacion/lint.
  - build de frontend (`npm run build`).
- No finalizar cambios con textos rotos de codificacion (acentos/simbolos).
- Mantener mensajes de UI claros y consistentes en espanol.

## Regla de Oro

- Si una mejora puede resolverse con un componente compartido existente, reutilizarlo.
- Si no existe, crear una solucion compartida en `shared` antes que una implementacion aislada en una feature.

## Base de Datos — Sincronizacion Obligatoria

Cada vez que se agrega o modifica la estructura de la base de datos (nueva tabla, nueva columna, nuevo indice, nueva constraint, datos semilla), se deben actualizar **ambos** archivos en el mismo commit:

- `backend/src/scripts/runMigration.js` — parche incremental con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` o equivalente.
- `backend/src/scripts/bootstrapSchema.js` — estado final completo del schema. El `CREATE TABLE` correspondiente debe reflejar todas las columnas actuales con sus tipos y defaults correctos.

**bootstrapSchema.js es la fuente de verdad para tenants nuevos.** Si solo se actualiza runMigration.js, un tenant nuevo instalado desde cero tendra un schema incompleto y el sistema fallara.

