# Technology Stack

## Programming Languages
- **JavaScript** - Node.js / navegador - lenguaje principal de frontend, backend y scripts operativos.
- **JSX** - React components - definicion de componentes y vistas del frontend.
- **YAML** - GitHub Actions - definicion de CI, release y redeploy.

## Frameworks
- **React 19.2.4** - UI SPA del frontend.
- **Vite 8.0.1** - bundler y dev server del frontend.
- **Express 4.21.2** - framework HTTP del backend.
- **vite-plugin-pwa 1.2.0** - capacidades PWA del frontend.

## Infrastructure
- **PostgreSQL** - almacenamiento transaccional principal.
- **GitHub Actions** - CI, release y automatizacion de despliegues.
- **Vercel Deploy Hook** - redeploy del frontend al publicar releases.
- **Brevo / SMTP** - transporte de correo.
- **CFE API** - integracion fiscal opcional.

## Build Tools
- **npm** - gestion de dependencias y scripts en root, frontend y backend.
- **semantic-release 24.2.7** - versionado y publicacion automatizada.
- **ESLint 9.39.4** - lint del frontend.

## Testing Tools
- **Frontend build + lint** - `npm run lint` y `npm run build` en CI.
- **Backend syntax check** - `node --check src/index.js` en CI.
- **Datos de prueba** - `backend/src/scripts/seedClientesVentasTest.js` como soporte de pruebas manuales.
