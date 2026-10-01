# Mundo Potterhead

SPA React/TypeScript/Vite y API Node independiente con PostgreSQL/Prisma. Usuarios, hashes scrypt, sesiones, límites de intentos y catálogo se guardan en PostgreSQL. Las implementaciones en memoria existen únicamente como fixtures de pruebas.

## Arranque local

Requiere Node.js 24, pnpm 11 y PostgreSQL. Docker se utiliza para las pruebas de integración. En PowerShell usa `pnpm.cmd` si está bloqueado `pnpm.ps1`.

1. Copia `.env.example` a `.env` solo en una instalación nueva. En este workspace se conservó el archivo y se añadió un `SESSION_SECRET` aleatorio sin imprimirlo.
2. Configura `DATABASE_URL` con una base de desarrollo y `SESSION_SECRET` con al menos 32 caracteres aleatorios. Define las credenciales privadas del bootstrap.
3. Revisa la base de destino antes de aplicar migraciones. No se ha migrado automáticamente la conexión privada de este workspace.

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm db:bootstrap:local
# Opcional: cargar mocks sin sobrescribir productos existentes
pnpm db:seed:local
pnpm dev
```

Vite sirve `http://localhost:5173` y reenvía `/api` al backend en `127.0.0.1:3001`. Reinicia procesos anteriores después de actualizar. La API exige una base migrada: no vuelve silenciosamente a datos en memoria.

`pnpm dev` verifica puertos, espera la readiness de la API y después inicia Vite. Si falla un proceso, detiene su compañero; Ctrl+C cierra ambos. Ante `PORT_..._UNAVAILABLE`, identifica la instancia que ocupa el puerto antes de iniciar otra.

**Windows y WSL:** no reutilices el mismo `node_modules` entre Windows y Debian. pnpm y Prisma incluyen enlaces y binarios dependientes del sistema. Usa una copia del repositorio dentro del filesystem de WSL para desarrollar allí, o trabaja con Node/pnpm de Windows en esta carpeta. Ejecuta `pnpm install --frozen-lockfile` y `pnpm db:generate` en el entorno elegido. No reinstales desde otro sistema mientras haya un servidor usando esa carpeta. Los directorios `node_modules.previous-*` son respaldos ignorados por Git/ESLint y no participan en la ejecución.

El bootstrap es explícito e idempotente: crea un administrador nuevo y no cambia contraseñas existentes ni convierte clientes en administradores. Después del bootstrap, la API no necesita `ADMIN_BOOTSTRAP_*`. Cambiar estas variables no restablece una contraseña existente.

El Compose opcional inicia solo PostgreSQL: configura `POSTGRES_PASSWORD` privadamente y ejecuta `docker compose up -d postgres`. Mantiene PostgreSQL 15 y el volumen existente; las pruebas aisladas usan PostgreSQL 16. Cambiar la variable no cambia la contraseña dentro de un volumen ya inicializado. Si utilizabas la contraseña fija del Compose anterior, rótala en PostgreSQL y actualiza `DATABASE_URL`; no borres el volumen para hacerlo.

## Arquitectura

| Directorio | Responsabilidad |
| --- | --- |
| `src/app` | Rutas diferidas y guards |
| `src/features` | Vistas, hooks y servicios de auth, catálogo, administración, carrito y marketing |
| `shared/productSchema.ts` | Contrato Zod compartido para productos |
| `server/http` | HTTP, autorización, CORS y errores |
| `server/repositories` | Persistencia Prisma y limitador compartido |
| `server/security` | Contrato de auth y funciones scrypt |
| `server/validation` | Esquemas estrictos para login, registro y perfil |
| `prisma/migrations` | Historial versionado de PostgreSQL |
| `dist` / `dist-server` | Artefactos independientes del frontend y backend |

Se conserva la migración inicial y se añade una migración incremental de sesiones, límites y campos de catálogo. Los precios usan `DECIMAL(12,2)`. Las tablas de pedidos anteriores se mantienen; el checkout actual coordina pedidos por WhatsApp.

El archivo antiguo `server/data/products.json` no se importa automáticamente. Prepara una importación validada si contiene productos que quieras conservar. Los registros de una BD anterior deben ajustarse al contrato de categorías, universos, descripción y precios. Contraseñas con formatos distintos de scrypt requieren restablecimiento controlado.

## Autenticación y seguridad

- El cliente nunca decide el rol. El guard revalida sesión y la API exige administrador para modificar productos.
- Sesiones aleatorias de 256 bits, digest HMAC en BD y caducidad absoluta de 30 minutos. Las réplicas comparten BD y `SESSION_SECRET`; un nuevo login rota la sesión anterior. Logout revoca en todas las instancias. Rotar el secreto invalida sesiones existentes.
- Cookies HttpOnly, host-only, Path=/, con Secure y prefijo `__Host-` en producción. Sin Domain para evitar compartirlas con otros subdominios.
- CORS acepta únicamente `APP_ORIGIN`, permite credenciales y verifica el preflight. Las escrituras exigen Origin correcto y `X-Requested-With: MundoPotterhead`.
- `COOKIE_SAME_SITE=Strict` funciona con frontend/API del mismo sitio. Para sitios diferentes usa `None` con HTTPS; el navegador puede bloquear cookies de terceros. Se recomienda proxy del mismo origen o subdominios del mismo sitio.
- Diez intentos por IP cada quince minutos, compartidos en PostgreSQL. Activa `TRUST_PROXY` solo si el proxy sobrescribe `X-Real-IP` y bloquea acceso directo. Sin ese contrato, déjalo en false y añade límites en el proxy.
- Registro `POST /api/auth/register` desactivado por defecto. Al activar `REGISTRATION_ENABLED`, acepta `{name,email,password}`, crea solo clientes y rechaza campos adicionales. No hay interfaz de registro, verificación de correo ni recuperación de contraseña.
- Logs JSON con identificador de solicitud, ruta normalizada, estado y duración; sin cuerpos, cookies, correo, cadenas de conexión ni detalles SQL. Errores internos con mensajes públicos genéricos.
- `/health/live` comprueba el proceso; `/health/ready` comprueba PostgreSQL. Cierre ordenado por SIGTERM/SIGINT y limpieza de sesiones/límites caducados.

## Configuración

En producción `pnpm start:api` lee únicamente variables del proceso, sin cargar `.env`. El archivo local se excluye de Git y Docker; no lo copies a artefactos ni al servidor.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL privado; configura TLS y pool según el proveedor |
| `SESSION_SECRET` | Secreto aleatorio privado, igual en todas las réplicas |
| `APP_ORIGIN` | Origen exacto del frontend; HTTPS obligatorio en producción |
| `PORT` / `API_PORT` | Puerto; `PORT` tiene prioridad |
| `API_HOST` | Por defecto `0.0.0.0` en producción, loopback en desarrollo |
| `COOKIE_SAME_SITE` | Strict, Lax o None; None exige Secure |
| `TRUST_PROXY` | Confianza explícita en X-Real-IP; desactivada por defecto |
| `REGISTRATION_ENABLED` | Alta pública de clientes; desactivada por defecto |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | Solo aprovisionamiento; contraseña de 20–256 caracteres |
| `VITE_API_URL` | URL pública: `/api` o `https://api.tu-dominio/api` |
| `VITE_WHATSAPP_NUMBER` | Número público de atención |

Las variables VITE son de compilación: reconstruye el frontend cuando cambien. Vite rechaza otros nombres con ese prefijo y URLs de API con credenciales/query. El build inspecciona `dist` buscando valores privados conocidos del entorno, sus versiones codificadas para URL y archivos privados. Esta comprobación no sustituye una revisión de seguridad.

## Build y despliegue
`pnpm pack:source` genera `artifacts/mundo-potterhead-source-<commit>.zip` mediante `git archive HEAD`. Incluye solo archivos de la última revisión confirmada; primero crea el commit para incorporar cambios locales. Las exclusiones de `.gitattributes` omiten material local y generado. `artifacts/` está ignorado por Git y Docker; el ZIP contiene código fuente, no una imagen ejecutable.

```sh
pnpm build
# Solo backend:
pnpm build:server
```

El backend compilado no requiere Vite, TypeScript ni fuentes React en ejecución. Publica `dist` con fallback SPA. Despliega `dist-server`, dependencias de producción y `prisma` como servicio Node independiente. Prisma CLI se conserva como dependencia de producción para migraciones de release.

En Render/Railway/VPS configura secretos desde el proveedor y sigue este orden:

1. Build: `pnpm install --frozen-lockfile && pnpm build:server`.
2. Release, una vez por despliegue: `pnpm db:migrate`.
3. Aprovisionamiento inicial: `pnpm db:bootstrap` con credenciales privadas temporales.
4. Inicio: `pnpm start:api`, `NODE_ENV=production` y origen HTTPS correcto.
5. Health check: `/health/ready`. Proxy TLS delante de la API. Si usas el mismo origen, enruta `/api/*` antes del fallback SPA.

Las migraciones usan [`prisma migrate deploy`](https://docs.prisma.io/docs/cli/migrate/deploy), sin reset ni modificaciones automáticas del esquema al arrancar. Haz backups y prueba migraciones en staging antes de aplicarlas a datos reales.

### Docker

```sh
docker build -t mundo-potterhead-api .
```

La imagen usa un usuario sin privilegios e incluye backend compilado, Prisma y dependencias de producción. Inyecta secretos desde la plataforma al ejecutar. Comandos de release dentro de la imagen:

```sh
node dist-server/migrate.js
node dist-server/bootstrap.js
```

El comando predeterminado inicia `node dist-server/index.js`. Migraciones y bootstrap no se ejecutan automáticamente en cada réplica.

## Verificación

```sh
pnpm build
pnpm test
pnpm test:integration
pnpm lint
```

`test:integration` crea PostgreSQL 16 temporal en Docker, aplica ambas migraciones, prueba persistencia real y elimina el contenedor. No usa la conexión de `.env`. Cubre sesiones compartidas/revocadas, CRUD, reconexión, cookies, CORS, registro, logs y concurrencia del limitador.

Después de construir la imagen, `pnpm test:integration --image mundo-potterhead-api` comprueba además el arranque del contenedor con PostgreSQL y verifica que ejecute sin privilegios, sin `.env` y sin Vite/TypeScript. También elimina los contenedores y la red de prueba al terminar.

Para aceptación visual: intenta `/admin` sin sesión, entra con el administrador aprovisionado, prueba CRUD y logout. Reinicia la API y comprueba que catálogo y sesión vigente siguen disponibles. No hay contraseñas ni tokens de sesión en localStorage.

Antes del lanzamiento operativo faltan decisiones del entorno: proveedor y capacidad de BD, backups/restauración, TLS, proxy, monitorización, carga y gestión de cuentas. Carrito y suscripciones comerciales siguen siendo preferencias locales. Las imágenes base64 están limitadas a 2 MB; para crecer conviene almacenamiento de objetos. Estas mejoras no equivalen a una certificación ni a un despliegue realizado.

## Infraestructura cloud

Consulta [deploy/CLOUD.md](deploy/CLOUD.md) para pools/TLS administrados, cargas directas S3, CI/CD, migraciones protegidas y sondas. `MEDIA_STORAGE=s3` habilita cargas de hasta 10 MB; el modo local mantiene 2 MB. En producci?n, las migraciones requieren `DIRECT_DATABASE_URL`.
