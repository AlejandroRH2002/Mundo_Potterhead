# Despliegue sin dominio: Pages + Render + Neon + R2

Guía verificada con documentación oficial el 2 de octubre de 2026. Los recursos y secretos se configuran manualmente; no se desplegó ni se conectó a una base cloud. Se mantiene catálogo → cotización por WhatsApp, sin pagos.

## 1. Variables por plataforma

| Variable / binding | Obligatoria | Dónde | Valor / comprobación |
| --- | --- | --- | --- |
| NODE_VERSION / PNPM_VERSION | Sí para Pages | Pages, build | 24 / 11.21.0; Render también debe usar Node 24 y pnpm del package.json |
| VITE_API_URL | Sí | Pages, build | /api; nunca URL de Render en el navegador |
| VITE_SITE_URL | Sí para publicar SEO | Pages, build | Origen HTTPS estable del proyecto *.pages.dev, sin ruta |
| VITE_WHATSAPP_NUMBER, VITE_LEGAL_NAME, VITE_LEGAL_EMAIL | Sí para lanzamiento | Pages, build | Datos públicos reales; no credenciales |
| VITE_MAP_QUERY, VITE_MAP_EMBED_URL | Opcionales | Pages, build | Dirección pública y mapa opcional; ver README |
| API_ORIGIN | Sí | Pages, runtime; local solo para pruebas de Function | Origen HTTPS de Render *.onrender.com, sin ruta, query ni credenciales; no VITE_ |
| PRODUCT_IMAGES | Sí con lectura R2 por Pages | Pages, binding R2 | Vincular el bucket privado; configurar producción y previews por separado |
| NODE_ENV | Sí | Render | production |
| DATABASE_URL, DIRECT_DATABASE_URL | Sí | Render / runner de release | Ambas cadenas Neon directas, sin -pooler, con sslmode=require; secretos privados |
| SESSION_SECRET | Sí | Render | Aleatorio de 32+ caracteres; igual entre réplicas |
| APP_ORIGIN | Sí | Render | Origen HTTPS exacto y estable de Pages que ve el navegador, sin ruta |
| MEDIA_STORAGE | Sí | Render | s3 |
| S3_ENDPOINT, S3_REGION, S3_BUCKET | Sí | Render | Endpoint S3 de la cuenta R2, región auto y bucket privado |
| S3_PUBLIC_BASE_URL | Sí | Render | Origen de Pages seguido de /media; se sirve solo products/ |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | Sí para R2 | Render | Token S3 privado restringido al bucket; nunca VITE_ ni Pages frontend |
| AWS_SESSION_TOKEN | Opcional | Render | Solo si las credenciales lo requieren |
| S3_FORCE_PATH_STYLE | Opcional | Render | true si lo requiere el endpoint compatible; verificar PUT firmado |
| DB_POOL_SIZE | Opcional | Render | 5 inicialmente; presupuestar pool + 1 conexión exclusiva de readiness por réplica, jobs y reserva |
| DB_CONNECT_TIMEOUT_SECONDS | Opcional, recomendado | Render | 15; nuevo predeterminado de producción, desarrollo sigue en 5 |
| DB_POOL_TIMEOUT_SECONDS, DB_QUERY_TIMEOUT_SECONDS | Opcionales | Render | 15 / 10 sugeridos; medir bajo carga, no ilimitados |
| DB_TLS_MODE | Opcional | Render | require (predeterminado de producción); no disable para Neon |
| COOKIE_SAME_SITE | Opcional | Render | Strict; el navegador usa un único origen mediante Pages |
| TRUST_PROXY, REGISTRATION_ENABLED | Opcionales | Render | false; no habilitar confianza sin verificar cómo el proxy sobrescribe IP y evita spoofing |
| PORT, API_HOST | Opcionales | Render | PORT asignado por Render; escucha 0.0.0.0 en producción |
| ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD | Solo aprovisionamiento | Runner privado de bootstrap | Contraseña de 20–256 caracteres; quitar ambas tras el bootstrap |
| DATABASE_URL local / demás variables de desarrollo | Solo desarrollo | Local, .env ignorado | No sobrescribir con credenciales cloud; seed solo loopback, nunca producción |

No copies .env a Pages, Render, artefactos o Git. Las variables VITE son públicas y requieren reconstruir al cambiarlas. No uses previews con acceso al backend de producción: APP_ORIGIN admite un único origen; prepara un entorno separado o deja previews sin autenticación/API de producción.

## 2. Orden verificable: build → migrate → bootstrap → start

1. **Pages:** conectar Git, raíz del proyecto que contiene package.json y functions/, salida dist; build `pnpm install --frozen-lockfile && pnpm build:web`. Configurar versiones y variables públicas arriba. build:web no necesita Prisma ni secretos de BD; Pages compila las Functions desde functions/. No usar carga drag-and-drop de solo dist para publicar Functions.
2. **Render:** crear Web Service Node con el mismo SHA; build `pnpm install --frozen-lockfile && pnpm build:server`; variables privadas de sistema y start `pnpm start:api`. No ejecutar seed ni mocks. Antes del primer arranque, realizar release abajo; no añadir migraciones/bootstrap al start de cada réplica.
3. **Neon:** escoger región cercana a Render; copiar la cadena **directa**, sin -pooler, para DATABASE_URL y DIRECT_DATABASE_URL, ambas con sslmode=require. Este proyecto usa Prisma 5 con pool propio; la elección directa es deliberada para este stack pequeño, no una recomendación universal de Neon. Limitar réplicas/conexiones.
4. **Migrate:** en un runner de release autorizado, con NODE_ENV=production y secretos privados de Neon, ejecutar `pnpm db:migrate`. Solo migrate deploy: no reset, db push ni seed. Los índices pendientes se aplican aquí. Render gratuito puede no ofrecer pre-deploy ni shell: usar CI/runner privado, no una ruta HTTP para migrar. Revisar backup antes del release.
5. **Bootstrap inicial:** mismo artefacto/runner con secretos temporales: `pnpm db:bootstrap` (requiere dist-server construido). Es idempotente; no cambia cuentas existentes. **Quitar ADMIN_BOOTSTRAP_EMAIL y ADMIN_BOOTSTRAP_PASSWORD tras el bootstrap**, también del runner y de Render si se añadieron ahí.
6. **Start:** iniciar/re desplegar Render con `pnpm start:api`; verificar /health/live y /health/ready en su URL HTTPS. Luego publicar Pages y probar su /api/products y /api/health/ready. No se garantiza tiempo de despertar del plan gratuito.

## 3. Proxy, fallback y cookies

`functions/api/[[path]].ts` utiliza routing multipath oficial. API_ORIGIN se lee de context.env; preserva método, stream de cuerpo, query, Origin, X-Requested-With y Cookie. Copia respuestas/Set-Cookie individualmente (incluidos Expires con comas), no sigue redirects upstream y fuerza no-store en fetch/respuesta/CDN; no registra cuerpos ni cookies. Solo admite /api/ y un origen HTTPS configurado, no destinos suministrados por el cliente. /api/health/live y /api/health/ready se traducen a /health/live y /health/ready de Render.

public/_routes.json limita invocaciones a /api, /api/* y /media/*; public/_redirects conserva `/* /index.html 200`. Según Cloudflare, _redirects no se aplica a rutas servidas por Functions, de modo que /api no termina en HTML. /api sin barra se rechaza. vercel.json permanece: Pages no lo utiliza.

APP_ORIGIN debe ser **https://<proyecto>.pages.dev**, no Render. El proxy conserva Origin sin falsificarlo. La cookie `__Host-mp_session` sale por Pages hacia el navegador con Secure, HttpOnly, Path=/ y sin Domain; se almacena para el host Pages y se reenvía a Render. Mantener Strict; no hace falta None ni una cookie de terceros. Comprobar login/logout y atributos reales manualmente después de desplegar. No ampliar CORS a wildcard ni reescribir Origin de previews. Con TRUST_PROXY=false el limitador ve la IP de conexión del proxy y puede agrupar usuarios; queda pendiente validar IP real sin spoofing y bloqueo de acceso directo antes de habilitar confianza. No basta con reenviar una X-Real-IP suministrada por el cliente.

## 4. R2 privado sin dominio propio

Mantener bucket **privado**, con r2.dev desactivado: la URL r2.dev se documenta para desarrollo y haría visibles los temporales. Vincularlo en Pages como PRODUCT_IMAGES. La Function /media/[[path]] solo permite GET/HEAD de /media/products/... con extensiones png/jpeg/jpg/webp; rechaza _pending/ y sirve el stream con metadatos, nosniff y caché de una hora. S3_PUBLIC_BASE_URL=https://<proyecto>.pages.dev/media. Lecturas implican invocaciones de Functions y operaciones R2; revisar cuotas/costes. No se implementa un proxy genérico de objetos.

La API firma PUT a _pending/, valida bytes/MIME al completar y copia a products/. Configurar CORS del bucket: AllowedOrigins solo APP_ORIGIN, AllowedMethods PUT/GET/HEAD, AllowedHeaders Content-Type (y cabeceras firmadas usadas), ExposeHeaders ETag. Probar PUT firmado desde el navegador; nunca publicar credenciales del token. Añadir lifecycle de temporales, no de productos. Con dominio propio futuro se puede usar CDN, pero hay que seguir ocultando _pending/.

## 5. Salud, suspensión y monitor

La API conecta ambos clientes Prisma antes de escuchar. Readiness usa una conexión exclusiva y consulta coalescida, caché de 1 s: plazo 4,5 s en producción, 1,5 s local. DB_CONNECT_TIMEOUT_SECONDS=15 tolera el despertar habitual de Neon; no elimina fallos de red ni despertares largos. Render exige respuesta de health dentro de 5 s. Un despertar de más de 4,5 s puede producir 503 transitorio; la consulta compartida sigue hasta terminar y la siguiente sonda puede recuperarse. No devolver 200 ficticio ni usar timeouts infinitos. Si causa reinicios, configurar la sonda de Render como /health/live y monitorear readiness por separado; elegir plan sin suspensión si se necesita disponibilidad continua.

Configurar un monitor externo HTTP GET a **https://<api>.onrender.com/health/live cada 5 minutos**, sin cookies, credenciales ni query; alertar si no hay 200 y dar timeout para arranque frío. No usar /health/ready como mecanismo de keepalive de BD. Render documenta suspensión gratuita después de 15 minutos sin tráfico entrante: ese monitor puede mantener tráfico, **verificar antes la política vigente y las cuotas de Render**; no garantiza evitar apagados/mantenimiento ni constituye disponibilidad contratada. Esta entrega solo documenta el monitor, no lo crea.

## 6. Aceptación y recuperación

- `pnpm smoke -- --url https://<proyecto>.pages.dev`: salud por /api/health/ready, HTML frontend y API admin anónima por Pages.
- `pnpm smoke -- --url https://<proyecto>.pages.dev --api-url https://<api>.onrender.com`: readiness directa, pero API admin siempre por Pages para comprobar proxy.
- Solo GET: no crea sesión. Código 1=falla, 2=guard/cookies pendientes manuales, 0=todas las comprobaciones verificadas; no tratar 2 como aceptación completa. Login HttpOnly/__Host-/Secure, guards, logout, CORS, imagen y _pending/ privado se verifican manualmente.
- Backups/PITR Neon y restauración en una base aislada: registrar fecha y resultado, definir RPO/RTO; no se probó una restauración aquí. Rotar SESSION_SECRET coordinadamente en todas las réplicas: invalida sesiones y tickets previos; verificar nuevo login. No modificar .env local ni correr scripts de mocks contra Neon.

## Documentación oficial consultada

- [Pages routing, multipath y _routes.json](https://developers.cloudflare.com/pages/functions/routing/), [redirects y Functions](https://developers.cloudflare.com/pages/configuration/redirects/).
- [Bindings de entorno/R2](https://developers.cloudflare.com/pages/functions/bindings/), [build image/versiones](https://developers.cloudflare.com/pages/configuration/build-image/).
- [Workers Headers y Set-Cookie/getAll](https://developers.cloudflare.com/workers/runtime-apis/headers/), [Request/cache no-store](https://developers.cloudflare.com/workers/runtime-apis/request/).
- [R2 public buckets: r2.dev para desarrollo](https://developers.cloudflare.com/r2/buckets/public-buckets/).
- [Prisma con Neon: despertar y timeouts](https://docs.prisma.io/docs/orm/v6/overview/databases/neon); se usa solo la explicación TCP/timeouts, no el adapter ni configuración de Prisma 6.
- [Render gratuito y suspensión](https://render.com/docs/free), [health checks y plazo de 5 s](https://render.com/docs/health-checks).
## Diagnóstico de subida desde Pages

Si el navegador muestra «Subida a R2 bloqueada o sin respuesta», revisar primero Red/Network: el error puede ser CORS, conexión o una autorización firmada caducada. No compartir URLs firmadas.

En Cloudflare → R2 → bucket usado por Render → Settings → CORS Policy, pegar el contenido de deploy/r2-cors-pages.json (formato array del dashboard, distinto de CORSRules de AWS). Autoriza únicamente PUT con Content-Type desde https://mundo-potterhead.pages.dev, sin barra final. Guardar y esperar hasta 30 segundos de propagación; volver a seleccionar la imagen para obtener una autorización nueva. No cambiar la privacidad del bucket ni publicar _pending/.

Esta plantilla no se aplica automáticamente al desplegar. Si ya hay reglas válidas para otros entornos autorizados, conservarlas. Si persiste, comprobar OPTIONS/PUT en Network: 403 puede indicar caducidad o permisos S3; un fallo en media/complete exige revisar el log de Render sin copiar secretos.

Referencia: https://developers.cloudflare.com/r2/buckets/cors/
