# Mundo Potterhead

## Diseño de Figma

Las cuatro vistas públicas se adaptaron a los frames de escritorio/móvil de Figma. Consulta [tokens, componentes, diferencias de negocio y revisión manual](deploy/design/FIGMA.md). Esta adaptación sustituye la portada pública anterior basada en banner.jpg; se conservan catálogo real, filtros, auth y cotización por WhatsApp. No cambia variables privadas ni requiere migración.

## Revisión visual del escaparate

Ajustes incrementales: `Button` con variantes/tamaños/loading, anuncio descartable y puntos de confianza editables en `src/features/marketing/data/storefrontCopy.ts`, CTA de cotización y WhatsApp, mini-resumen móvil, migas de pan y galería/relacionados. No se añaden favoritos ni reseñas ficticias. La BD/API actual solo ofrece una imagen; la UI acepta extras válidos si el contrato futuro los incorpora. Scroll/foco centralizados: rutas arriba, filtros confirmados al inicio de resultados y restauración de POP con posiciones en memoria.

Consulta [la auditoría priorizada y la comprobación HTTP local](deploy/STOREFRONT_AUDIT.md). La comprobación HTTP autorizada detectó un fallo 500 en productos; auth/usuarios y limpieza temporal funcionaron.

Paleta recuperada de `ed2c185`: burdeos `#2a0001`, panel `#450a0a`, acento `#740001`, dorado `#fdb813` y botones con `#fcd34d`. Se conservan crema e ink/muted para contraste. El hero usa `public/brand/banner.jpg` y el JPG original `MPLogo.jpg` en navbar/hero/footer/carga. No se generó un logo ni un reemplazo del banner. El h1 es accesible y oculto en escritorio; a 390 px o menos se muestra como texto real sobre un degradado. El banner de 1280 px se limita a 1280 px CSS, se centra y se contiene en escritorio (65svh, tope 640 px, bordes con máscara, sin zoom que amplíe la imagen). Sus atributos 1280×720 reservan una proporción de referencia; confirmar el alto real del archivo al revisar el asset. Si existe `public/brand/banner@2x.jpg` al compilar, se añade al srcset; su ausencia no genera una solicitud fallida. El comportamiento móvil se conserva. No se inspeccionó el contenido de la imagen.

Animaciones mediante `LazyMotion` con `domAnimation` diferido, transform/opacity y movimiento reducido. La reorganización de tarjetas usa FLIP y `AnimatePresence`, sin cargar `domMax`. El carrito lateral se carga al abrirlo y reutiliza la vista y el checkout existentes; `/cart` sigue disponible. La API no expone stock: se muestra disponibilidad por confirmar, sin inventar estados agotados.

Antes de dar el visto bueno, revisar manualmente en escritorio y móvil: portada/CTAs/categorías, ofertas, catálogo/facetas/chips/paginación, skeletons/errores/vacío, detalle de producto, alta rápida y contador, drawer y `/cart` (cantidades, total, aviso legal, WhatsApp), footer/legales/contacto, login/perfil y formularios admin. Revisar anchos 360, 390, 768, 1024 y 1440 px sin scroll horizontal. Usar Tab/Shift+Tab/Escape, zoom 200%, lector de pantalla y movimiento reducido. Verificar que los diálogos devuelvan el foco y que la barra fija no tape los controles; comprobar CLS con DevTools y la carga local de fuentes. Los tests verifican contraste de los tokens sobre fondos sólidos; no sustituyen esta revisión renderizada.

Referencia anterior a estos ajustes: chunk principal 86,71 KiB gzip. El límite acordado permite como máximo +25 KiB gzip; las cifras del build se obtienen de su salida, sin inspeccionar archivos generados.

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

Los datos antiguos requieren una importación explícita y validada antes de incorporarse al catálogo. Los registros de una BD anterior deben ajustarse al contrato de categorías, universos, descripción y precios. Contraseñas con formatos distintos de scrypt requieren restablecimiento controlado.

### Subcategorías y filtros del catálogo

La taxonomía compartida está en `shared/catalogTaxonomy.ts`. Conserva los slugs existentes de categorías y universos; cada subcategoría pertenece a una categoría. Los registros antiguos admiten `subcategory: null`; el formulario admin exige seleccionarla al guardar.

La migración incremental `20261001010000_product_subcategory` debe aplicarse explícitamente antes de arrancar esta versión contra una BD existente. No requiere reset. Después, ejecuta `pnpm catalog:backfill-subcategory --dry-run` (también es el modo por defecto), revisa las clasificaciones por palabras clave y ejecuta `pnpm catalog:backfill-subcategory --apply` para escribir. Procesa lotes de 100, conserva clasificaciones existentes y lista únicamente id/nombre de los productos sin clasificar. En producción usa `node dist-server/backfillSubcategory.js --dry-run` con `DATABASE_URL` del sistema, seguido de `--apply` tras la revisión. El seed solo clasifica nuevas filas; no modifica las existentes.

`GET /api/products` devuelve `{ items, total, page, pageSize, facets }` y acepta `universe`, `category`, `subcategory`, `onSale=true|false`, `minPrice`, `maxPrice`, `q`, `sort=novedad|precio-asc|precio-desc|descuento`, `page` y `pageSize` (máximo 100). Rechaza filtros desconocidos, repetidos o incoherentes. No devuelve imágenes Base64. Las facetas conservan búsqueda/precios/ofertas; universo ignora los tres niveles, categoría conserva universo y subcategoría conserva universo/categoría. Así los conteos permiten cambiar de opción sin quedar limitados a la ya seleccionada.

Los filtros y la paginación viven en la URL. Sin parámetros no se preselecciona universo/categoría/subcategoría. `universe=all` se conserva por compatibilidad con enlaces antiguos (la API omite ese filtro); los enlaces antiguos `offers=1` siguen funcionando. En móvil el panel modal admite Tab/Shift+Tab, Escape y retorno del foco. Comprobar también con teclado y lector de pantalla en el navegador de destino.

## Autenticación y seguridad

- El cliente nunca decide el rol. El guard revalida sesión y la API exige administrador para modificar productos.
- Sesiones aleatorias de 256 bits, digest HMAC en BD y caducidad por inactividad de 30 minutos y tope absoluto de 8 horas desde el último login. Las réplicas comparten BD y `SESSION_SECRET`; un nuevo login rota la sesión anterior. Las solicitudes autenticadas renuevan la cookie y la expiración persistida como máximo una vez por minuto por sesión, también entre réplicas. La granularidad puede adelantar el cierre por inactividad hasta 59 segundos. No hay sondeo periódico del navegador que mantenga viva una pestaña inactiva. Logout revoca en todas las instancias. Rotar el secreto invalida sesiones existentes.
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

Consulta [deploy/CLOUD.md](deploy/CLOUD.md) para pools/TLS administrados, cargas directas S3, CI/CD, migraciones protegidas y sondas. `MEDIA_STORAGE=s3` habilita cargas de hasta 10 MB; el modo local mantiene 2 MB. En producción, las migraciones requieren `DIRECT_DATABASE_URL`.

## Identidad pública y SEO

Antes de publicar, configura `VITE_LEGAL_NAME`, `VITE_LEGAL_EMAIL` y `VITE_SITE_URL` (origen HTTPS sin ruta), y reconstruye el frontend. Los dos primeros son datos públicos del responsable, no secretos. Los textos de privacidad y términos requieren revisión con asesor legal.

El build genera robots.txt y sitemap.xml con rutas públicas estáticas. Sin VITE_SITE_URL, no se emiten URLs canónicas y se solicita no indexar. Las rutas privadas llevan noindex mediante JavaScript; robots.txt no sustituye los guards. Vercel y Netlify incluyen reglas X-Robots-Tag: noindex para rutas privadas; replica esas cabeceras si usas otro hosting.

El hook actualiza metadatos por ruta y producto, pero los crawlers que no ejecutan JavaScript solo reciben los metadatos generales del HTML. Para posicionar o compartir productos, conviene prerender de páginas públicas con invalidación al editar catálogo. Estimación de implementación: 1–3 jornadas para una primera versión, más operación según catálogo y plataforma; no implementado ni presupuestado con un proveedor.

## Accesibilidad: alcance de la revisión

Se comprobaron nombres, etiquetas y alt en el código, foco visible, enlace de salto, orden DOM del carrito/editor y contraste de la paleta base. El borrado usa confirmación nativa del navegador; no hay modal propio. Se respeta movimiento reducido. El mapa se inserta en la página de contacto con carga diferida de Google; las fuentes son locales. Pendiente: recorrido real con teclado (incluido foco tras eliminar), lector de pantalla, zoom, menú móvil y contraste de todas las composiciones temáticas. Las pruebas estáticas no certifican accesibilidad.

## Administración de usuarios

`/admin/usuarios` permite listar con paginación, crear cuentas (contraseña de 20–256 caracteres), activar/desactivar y cambiar roles. La API usa `/api/admin/users` (GET/POST) y `/api/admin/users/:id` (PATCH); no ofrece eliminación. Las escrituras revalidan al administrador dentro de una transacción y preservan al menos un administrador activo. No puedes desactivar ni degradar tu propia cuenta. Desactivar o cambiar el rol revoca las sesiones; reactivar requiere iniciar sesión de nuevo.

Antes de arrancar el backend actualizado, aplica `pnpm db:migrate` a la base de destino revisada: migración incremental `20261001000000_user_is_active`, sin reset. Las cuentas existentes quedan activas. Las pruebas unitarias usan dobles de persistencia; la integración PostgreSQL se ejecuta aparte con `pnpm test:integration`.

## Migración de imágenes

`pnpm media:migrate-base64` usa variables privadas del proceso y hace dry-run por defecto; `--batch-size=25` limita la memoria por lote (1–100). Revisa el resumen antes de `pnpm media:migrate-base64 --apply`. Para desarrollo puedes usar `pnpm exec node --env-file=.env server/scripts/migrateMedia.ts --dry-run`; producción usa `node dist-server/migrateMedia.js`. No se ejecuta al arrancar.

La migración valida firmas y MIME, genera claves deterministas, confirma la subida con HEAD y cambia la URL solo si el valor original de BD sigue igual. Fallos conservan el original; repetir no crea nuevos nombres ni procesa URLs ya migradas. Se imprimen únicamente contadores; no imágenes, URLs privadas ni contenidos. No se ha ejecutado contra la BD o bucket reales.

## Imágenes y despliegue

Producción requiere MEDIA_STORAGE=s3, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL y SESSION_SECRET. Configura credenciales privadas mediante IAM o AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY; S3_FORCE_PATH_STYLE es opcional. El CDN debe servir solo products/, sin _pending/. Los originales del editor se decodifican y comprimen a WebP (lado máximo 1200 px, calidad 0.8); el navegador debe soportar canvas/WebP. Las imágenes animadas se convierten en una imagen fija.

El listado no devuelve Base64: las imágenes antiguas se sirven por /api/products/:id/image sin modificar la BD. El detalle consulta un único producto. Primera imagen con prioridad; las demás se cargan lazy, con dimensiones reservadas y decoding async. Verifica una carga real PUT + confirmación, lectura CDN, CORS y permisos en staging; no se ejecutaron operaciones sobre el bucket real.

## Medición del bundle (fase 4)

Medición desde la salida de Vite, sin leer dist: index-1V6mypez.js 242.73 KiB; Contact-JPMIY0uc.js 114.51 KiB; ProductEditor-CIk6r3XK.js 6.05 KiB; AdminUsers-BoDWtlOH.js 6.00 KiB; Cart-DUGKtk0l.js 2.52 KiB (JavaScript sin gzip, hashes variables). Admin ya usa lazy/Suspense; no se añadió otra división sin ganancia demostrada. La configuración de integración usa endpoints S3 ficticios solo para verificar arranque; no prueba operaciones de bucket.

## Smoke post-despliegue

`pnpm smoke -- --url https://tu-origen` (opcional `--api-url https://tu-api`) usa solo GET anónimos y timeouts. Comprueba readiness JSON, frontend y denegación del API admin. Una respuesta HTML 200 de la SPA no demuestra que el guard redirija: se marca pendiente. Las cookies emitidas por un login requieren revisión manual con una cuenta de prueba; el script no crea sesiones ni afecta el limitador. Código 1: fallo; código 2: comprobaciones pendientes. El verificador de atributos se prueba contra el login real del fixture unitario, sin credenciales reales.

## Mapa opcional y catálogo sin selección implícita

Sin parámetros el catálogo muestra todos los universos. Los enlaces filtrados usan query params explícitos. El mapa solo se monta en `/contact` (ruta actual de contacto), directamente en un recuadro con carga diferida al acercarse al viewport. `VITE_MAP_EMBED_URL` tiene prioridad: solo admite HTTPS de www.google.com con ruta /maps/embed o sus subrutas. `VITE_MAP_QUERY` aporta la dirección pública en texto y, sin embed válido, genera `https://www.google.com/maps?q=<consulta codificada>&output=embed`: este formato no es oficial y puede dejar de funcionar. Sin configuración utilizable se consulta por WhatsApp, sin inventar dirección. Google puede recibir datos técnicos cuando se carga el mapa. Reconstruye tras cambiar estas variables. La CSP actual pertenece solo a la API JSON; `_headers` no establece CSP del frontend y no requiere cambios. Si el hosting aplica CSP al HTML, permite `frame-src https://www.google.com`.

Comprobación de esta revisión: lint y 60 tests pasan; el build completo vuelve a generar Prisma sin EPERM. La API local estaba detenida en tres comprobaciones consecutivas; iniciar `pnpm dev:api` y repetir listado/readiness para diagnosticar el 500/503 anterior. No se modificaron pool/timeouts ni se infirió una causa sin evidencia. Revisar manualmente portada, catálogo sin filtros/con filtros/ofertas, drawer de filtros, navbar, detalle/carrito, footer/contacto/mapa y tablas/formularios admin en 320/360/390/768/1024/1440 px, con teclado y Atrás/Adelante; las pruebas estáticas no comprueban el layout renderizado.

## Lecturas concurrentes del catálogo

El listado no usa transacciones interactivas: filas y total comparten una sentencia/snapshot; las tres facetas se agregan en una consulta, con caché de 30 s (hasta 100 claves) y un consumidor de conexión por réplica. Ofertas usan caché de 30 s; las escrituras locales invalidan ambas. Otros procesos/réplicas pueden mostrar datos cacheados hasta 30 s. Readiness utiliza un cliente Prisma separado de una conexión, conectado antes de escuchar: presupuestar `DB_POOL_SIZE + 1` conexiones por réplica. Diagnóstico de etapas/clase/código Prisma solo con NODE_ENV=development, sin SQL ni valores. Índices incrementales `20261002150000_catalog_listing_indexes` creados pero no aplicados: ejecutar `pnpm db:migrate` tras revisar destino.

La búsqueda única de la navbar conserva filtros/orden al confirmar y reinicia página 1. `q` busca nombre/descripción (ILIKE) y etiquetas/slugs controlados de universo, categoría y subcategoría (comparación de etiquetas sin acentos). Vacío elimina q. No se implementa autocompletado; la búsqueda solo se envía al confirmar. Prueba de carga de solo lectura: `node --env-file=.env scripts/check-catalog-http.mjs`.

Diagnóstico local: el catálogo fallaba con P2028 en adquisición de transacción interactiva (~2000 ms, maxWait predeterminado de Prisma), antes de ejecutar filas/facetas. Tras quitar esa adquisición y precalentar la conexión exclusiva de readiness: 24/24 HTTP 200 en cuatro rondas, listados 7–172 ms y readiness 2–49 ms. No había migraciones previas pendientes; únicamente quedan los nuevos índices por aplicar. No se ejecutaron migraciones ni integración.

## Destinos de navegación

`safeInternalPath` valida destinos internos (incluida decodificación repetida) de retorno de login, IDs de API/carrito, migas de pan, categorías y búsqueda. WhatsApp conserva su salida externa deliberada con número validado y mensaje codificado; mapas validan su origen y consultas. La app usa createRoot y BrowserRouter: no hay hydrateRoot, deserializeErrors ni SSR de producción. Los ssrLoadModule de tests son cargas de módulos, no hidratación de páginas.

### Actualización de Router 7

React Router DOM 7.18.4 conserva los imports y BrowserRouter/Routes existentes. La [guía oficial v6 → v7](https://github.com/remix-run/react-router/blob/react-router%407.18.4/docs/upgrading/v6.md) requiere React 18 y Node 20 como mínimos; React 18.3/Node 24 cumplen. No hay rutas multi-segmento con splat ni enlaces relativos, data routers, loaders/actions o hidratación; sus flags no aplican. React.lazy permanece en ámbito de módulo para las transiciones. Scroll/foco y AnimatePresence siguen centralizados; revisar manualmente navegación, Atrás/Adelante y carga diferida tras desplegar.

### Actualización de Vite 6

Vite 6.4.3 y plugin-react 4.7.0 usan esbuild 0.25.12 también en el árbol anidado. Se revisó la [migración oficial desde Vite 5](https://v6.vite.dev/guide/migration): no hay Sass, PostCSS TS ni conditions personalizados que adaptar. El escaneo de dependencias se limita a index.html para no recorrer backups node_modules.previous-*; los tests desactivan discovery/entries y mantienen middlewareMode/HMR sin listener. Alias con fileURLToPath y transformación HTML SEO se conservan.

## Servidores de desarrollo: solo loopback

Vite y preview escuchan únicamente en 127.0.0.1; fs.strict=true limita acceso al proyecto y bloquea secretos, servidor y backups. pnpm dev verifica el mismo socket IPv4 y conserva http://localhost:5173 para coincidir con APP_ORIGIN local. No exponer dev/preview a la red, no añadir --host ni usar túneles públicos; producción usa Pages y el backend independiente. Preview no reemplaza un servidor de producción ni cambia el origen autorizado de la API. Las políticas de pnpm 11 se conservan, sin relajar minimumReleaseAge/allowBuilds; packageManager sigue 11.21.0.
