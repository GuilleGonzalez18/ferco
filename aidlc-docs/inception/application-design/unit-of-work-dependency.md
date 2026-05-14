# Unit of Work — Dependency Matrix

## Dependencias entre Unidades

| Unidad | Depende de | Tipo de dependencia |
|--------|-----------|---------------------|
| `pw-setup` | — | Sin dependencias (base) |
| `pw-pages` | `pw-setup` | Necesita `playwright.config.js` para imports |
| `pw-specs` | `pw-pages` | Usa los Page Objects |
| `pw-ci` | `pw-setup`, `pw-pages`, `pw-specs` | Necesita todo lo anterior funcionando |

## Secuencia de implementación

```
pw-setup → pw-pages → pw-specs → pw-ci
```

## Paralelismo posible

- `pw-pages` y `pw-ci` (esqueleto sin steps) pueden escribirse en paralelo con `pw-specs`
- En la práctica: secuencial es más simple dado el equipo de 1 persona

## Notas de integración

- **pw-setup** define `baseURL=http://localhost:5173` — todos los Page Objects dependen de esto implícitamente
- **pw-ci** orquesta el arranque del backend (`localhost:3001`) y frontend (`localhost:5173`) en el mismo job
- Los fixtures en `e2e/fixtures/` son compartidos entre `pw-pages` y `pw-specs`
