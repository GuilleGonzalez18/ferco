# Visual Refresh Clarification Questions

Detecté dos tensiones razonables en las respuestas: quieren una mejora visual conservadora pero a la vez de toda la app, con animación visible y alto impacto. Para cerrar bien la propuesta antes de tocar código, necesito estas definiciones.

## Question 1
Para esta **primera implementación**, ¿cómo prefieren manejar el alcance?

A) Hacer toda la app en una sola tanda visual
B) Diseñar la visión completa, pero implementar primero login + dashboard + ventas + componentes compartidos
C) Diseñar la visión completa, pero implementar primero dashboard + tablas/listados + modales
X) Other (please describe after [Answer]: tag below)

[Answer]:B

## Question 2
Cuando dicen que la mejora debe ser **conservadora**, ¿qué quieren preservar?

A) La estructura general actual; solo mejorar capas visuales, profundidad, espaciado y movimiento
B) La estructura actual, pero permitiendo retocar sidebar, topbar, cards y layouts internos
C) Solo preservar identidad y colores; el layout puede evolucionar más
X) Other (please describe after [Answer]: tag below)

[Answer]:C

## Question 3
Sobre accesibilidad y movimiento, ¿qué prefieren para la implementación?

A) Mantener `prefers-reduced-motion`, pero con animaciones ricas para el resto
B) Ignorar `prefers-reduced-motion` y priorizar impacto visual siempre
C) Mantener movimiento reducido solo en transiciones grandes, pero no en microinteracciones
X) Other (please describe after [Answer]: tag below)

[Answer]:B

## Question 4
Con la restricción de paleta dinámica desde base de datos, ¿qué margen de mejora visual habilitan?

A) Mejorar sombras, transparencias, brillos, bordes, superficies y gradientes derivados del color configurado
B) Lo anterior, y además recalcular colores derivados automáticamente para dar más profundidad visual
C) Solo mejorar composición y animación, sin tocar derivados cromáticos
X) Other (please describe after [Answer]: tag below)

[Answer]:A
