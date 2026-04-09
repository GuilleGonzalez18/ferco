# Contribuir al proyecto

## Flujo de ramas (recomendado)
- `main`: producción estable.
- `develop`: integración de cambios.
- `feature/<nombre-corto>`: trabajo por funcionalidad.
- `fix/<nombre-corto>`: correcciones puntuales.

## Proceso de trabajo
1. Crear rama desde `develop`.
2. Hacer commits pequeños y descriptivos.
3. Abrir Pull Request hacia `develop`.
4. Verificar que CI (GitHub Actions) pase en verde.
5. Hacer merge.
6. Promocionar de `develop` a `main` cuando corresponda release.

## Convención de commits
Usar formato tipo Conventional Commits:
- `feat: ...` nueva funcionalidad
- `fix: ...` corrección
- `refactor: ...` mejora interna sin cambiar comportamiento
- `docs: ...` documentación
- `chore: ...` tareas de mantenimiento

Ejemplos:
- `feat: agregar observación opcional en ventas`
- `fix: validar CORS con múltiples orígenes`

## Versionado automático (semantic-release)
El proyecto usa `semantic-release` para generar tags y releases automáticos:
- `main`: release estable (`v1.2.3`)
- `develop`: prerelease (`v1.2.4-beta.1`)

Comandos de commit (Conventional Commits) que impactan versión:
- `fix:` → PATCH
- `feat:` → MINOR
- `feat!:` o `BREAKING CHANGE:` → MAJOR

Fuente de versión en la app:
- Prioridad 1: tag del commit/release (`vX.Y.Z` / `vX.Y.Z-beta.N`)
- Prioridad 2: último tag alcanzable en git
- Prioridad 3: fallback `frontend/package.json` (+ `-sha` en ramas no-main)
- Override opcional: `VITE_APP_VERSION`

No crear tags manuales para releases regulares; los genera el workflow `Release`.

## Validaciones locales
Frontend:
```bash
cd frontend
npm ci
npm run lint
npm run build
```

Backend:
```bash
cd backend
npm ci
node --check src/index.js
```
