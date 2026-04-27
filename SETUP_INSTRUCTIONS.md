# Mercatus — Guía de instalación en equipo nuevo

## Requisitos previos

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|---------|
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://www.postgresql.org/download |
| Git | cualquiera | https://git-scm.com |

---

## 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd ferco-posta
```

---

## 2. Configurar el Backend

### 2.1 Instalar dependencias

```bash
cd backend
npm install
```

### 2.2 Crear el archivo de entorno

```bash
# Copiar el template
copy .env.example .env   # Windows
cp .env.example .env     # Linux/Mac
```

Editar `.env` con los valores reales:

```env
PORT=3001

PGHOST=localhost
PGPORT=5432
PGDATABASE=mercatus_db     # nombre de la BD que vayas a crear
PGUSER=postgres
PGPASSWORD=tu_password

JWT_SECRET=un_string_largo_y_aleatorio
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173
```

> Los campos de SMTP/Brevo son opcionales. Solo se necesitan para envío de correos (recuperación de contraseña).

### 2.3 Crear la base de datos en PostgreSQL

```sql
-- Ejecutar en psql o pgAdmin
CREATE DATABASE mercatus_db;
```

### 2.4 Crear las tablas e inicializar datos

```bash
# Desde la carpeta backend/
npm run db:setup
```

Esto ejecuta en orden:
1. `db:schema` → crea todas las tablas
2. `db:migrate` → aplica columnas y datos por defecto

### 2.5 Crear el primer usuario (propietario)

Conectarse a la BD y ejecutar:

```sql
-- Contraseña encriptada con bcrypt (rounds=10)
-- Podés generar el hash con: node -e "require('bcryptjs').hash('tuPassword',10).then(console.log)"
INSERT INTO public.usuarios (username, password, tipo, nombre, correo)
VALUES ('admin', '$2a$10$...hash...', 'propietario', 'Administrador', 'admin@empresa.com');
```

O usar el seed de prueba para tener datos de ejemplo:

```bash
npm run db:seed:test
```

---

## 3. Configurar el Frontend

### 3.1 Instalar dependencias

```bash
# Desde la raíz del repo
cd frontend
npm install
```

### 3.2 Logo de Mercatus (favicon)

El archivo `frontend/public/favicon.png` debe ser el logo de Mercatus.  
Si no está presente, copiarlo manualmente:

```bash
copy ruta\al\logo\Mercatus.png frontend\public\favicon.png
copy ruta\al\logo\Mercatus.png frontend\public\mercatus-logo.png
```

---

## 4. Levantar el aplicativo

### Desarrollo (dos terminales)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Escucha en http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Abre en http://localhost:5173
```

### Producción

```bash
# Build del frontend
cd frontend
npm run build
# Los archivos estáticos quedan en frontend/dist/

# Backend en producción
cd backend
npm start
```

---

## 5. Primera vez que abrís el sistema

1. Entrar a `http://localhost:5173`
2. Iniciar sesión con el usuario propietario creado en el paso 2.5
3. El sistema detecta que no hay empresa configurada y muestra el **asistente de configuración**
4. Completar: nombre de empresa, logo, colores
5. ¡Listo! El sistema queda operativo

---

## 6. Scripts útiles del backend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia en modo desarrollo con auto-reload |
| `npm start` | Inicia en producción |
| `npm run db:setup` | Crea tablas + migra columnas (usar en equipo nuevo) |
| `npm run db:schema` | Solo crea las tablas base |
| `npm run db:migrate` | Solo aplica migraciones adicionales |
| `npm run db:export` | Exporta la BD a un archivo SQL |
| `npm run db:import` | Importa un dump SQL |
| `npm run db:seed:test` | Carga datos de prueba (clientes, productos, ventas) |

---

## 7. Estructura de carpetas relevante

```
ferco-posta/
├── backend/
│   ├── src/
│   │   ├── routes/        # Endpoints REST
│   │   ├── scripts/       # Setup de BD, seeds, migraciones
│   │   └── index.js       # Punto de entrada
│   ├── .env               # Variables de entorno (NO commitear)
│   └── .env.example       # Template del .env
└── frontend/
    ├── public/
│   │   ├── favicon.png    # Logo Mercatus (favicon + marca de agua)
│   │   └── mercatus-logo.png  # Logo para el login sin empresa
    └── src/
        ├── core/          # API, ConfigContext, versión
        ├── features/      # Módulos funcionales (ventas, productos, etc.)
        └── shared/        # Componentes reutilizables
```

---

## 8. Variables de entorno — referencia rápida

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `PORT` | No (default 3001) | Puerto del backend |
| `PGHOST` | ✓ | Host de PostgreSQL |
| `PGPORT` | No (default 5432) | Puerto de PostgreSQL |
| `PGDATABASE` | ✓ | Nombre de la base de datos |
| `PGUSER` | ✓ | Usuario de PostgreSQL |
| `PGPASSWORD` | ✓ | Password de PostgreSQL |
| `JWT_SECRET` | ✓ | Clave secreta para tokens (usar string largo) |
| `JWT_EXPIRES_IN` | No (default 7d) | Duración del token de sesión |
| `CORS_ORIGIN` | ✓ | URL del frontend (ej: `http://localhost:5173`) |
| `BREVO_API_KEY` | No | API Key de Brevo para envío de emails |
| `SMTP_*` | No | Configuración SMTP alternativa para emails |

