# Operación cloud

## Checklist de release

1. **Variables:** cargar desde el gestor de secretos del entorno; comprobar arranque fallido al omitir una obligatoria. Los errores nombran campos, nunca sus valores.

| Variable | Obligatoria/opcional | Verificación |
| --- | --- | --- |
| NODE_ENV=production | Obligatoria al desplegar | Activa validaciones y cookies Secure |
| DATABASE_URL | Obligatoria para API/bootstrap | PostgreSQL privado, pool y TLS del proveedor |
| DIRECT_DATABASE_URL | Obligatoria para migraciones | Conexión directa de release; no requerida en el proceso API |
| SESSION_SECRET | Obligatoria, 32–512 caracteres | Aleatorio y compartido entre réplicas |
| APP_ORIGIN | Obligatoria, origen HTTPS exacto | Sin ruta, query ni credenciales |
| MEDIA_STORAGE=s3 | Obligatoria en producción | Sin fallback inline |
| S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL | Obligatorias para API/migración de medios | Endpoint API y URL pública HTTPS; región según proveedor |
| S3_FORCE_PATH_STYLE | Opcional, false | Ajustar al proveedor compatible |
| AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY; AWS_SESSION_TOKEN | Credenciales obligatorias si no hay identidad de carga; token opcional | Cadena SDK privada; permisos de bucket mínimos |
| COOKIE_SAME_SITE | Opcional, Strict | None exige HTTPS/Secure |
| TRUST_PROXY | Opcional, false | true genera warn; proxy sobrescribe X-Real-IP y bloquea acceso directo |
| REGISTRATION_ENABLED | Opcional, false | true genera warn; alta pública solo de clientes |
| PORT/API_PORT, API_HOST | Opcionales | Puerto asignado y escucha interna; no publicar sin proxy TLS |
| DB_POOL_*, DB_CONNECT_TIMEOUT_SECONDS, DB_QUERY_TIMEOUT_SECONDS, DB_TLS_MODE, DB_SSL_CERT_PATH | Opcionales | Límites medidos, TLS require; CA montada si corresponde |
| ADMIN_BOOTSTRAP_EMAIL/ADMIN_BOOTSTRAP_PASSWORD | Solo bootstrap inicial | Contraseña de 20–256 caracteres; retirar después |
| VITE_API_URL, VITE_SITE_URL, VITE_WHATSAPP_NUMBER, VITE_LEGAL_NAME, VITE_LEGAL_EMAIL | Configuración pública de build para lanzamiento | API, canonical HTTPS, atención y responsable reales; reconstruir al cambiar |

2. **Build → migrate → bootstrap → start:** ejecutar instalación frozen y pnpm build; verificar artefactos del mismo SHA. Ejecutar pnpm db:migrate una vez con NODE_ENV=production y DIRECT_DATABASE_URL; revisar resultado sin reset. Primer aprovisionamiento: pnpm db:bootstrap. Iniciar pnpm start:api. En la imagen usar node dist-server/migrate.js, bootstrap.js e index.js respectivamente. No ejecutar bootstrap en cada réplica.
3. **HTTPS y cookies:** certificado válido y redirección HTTP→HTTPS en el proxy. Mismo origen: VITE_API_URL=/api; enrutar /api y /health al backend antes del fallback SPA. Subdominios del mismo sitio: APP_ORIGIN exacto y credentials include; cookie host-only en la API. Sitios diferentes: COOKIE_SAME_SITE=None y Secure; comprobar bloqueo de cookies de terceros en navegadores objetivo. No añadir Domain a cookies __Host-.
4. **Salud:** GET/HEAD /health/live devuelve 200; /health/ready devuelve 200 con BD accesible y 503 al retirar tráfico o fallar BD. Readiness admite tráfico; liveness no depende de BD. Comprobar shutdown con SIGTERM y margen de gracia superior a 15 segundos.
5. **Bucket y CDN:** configurar endpoint, región, bucket y URL pública por entorno. _pending/ privado y no accesible mediante CDN ni bucket público; products/ legible mediante CDN HTTPS. Verificar que una petición anónima a un temporal falle. CORS permite PUT desde APP_ORIGIN, Content-Type y HEAD/GET según uso; no comodín de origen en producción. Verificar subida, validación y lectura pública de una imagen válida, y rechazo de contenido/MIME incorrecto. Aplicar expiración solo a temporales; no borrar productos vigentes.
6. **Backups:** programar backups cifrados/PITR según necesidades; antes del release restaurar una copia en una BD aislada y comprobar catálogo, cuentas y migraciones. Registrar fecha, duración y resultado; definir RPO/RTO y responsables. No declarar la restauración probada sin ejecutarla.
7. **Rotación:** generar SESSION_SECRET nuevo en el gestor de secretos y cambiarlo coordinadamente en todas las réplicas. Reiniciar despliegue completo; las sesiones y tickets de subida anteriores quedan inválidos. Comprobar nuevo login y rechazo del anterior. No alternar secretos entre réplicas.
8. **Smoke:** pnpm smoke -- --url https://tu-origen (opcional --api-url https://tu-api). Solo GET, sin credenciales ni login. Verifica salud/frontend y denegación del API admin; una SPA puede servir HTML 200 en /admin. La redirección del guard requiere comprobación de navegador; las cookies del login requieren una sesión de prueba manual. El smoke marca estos casos pendientes y termina con código 2, no éxito completo; código 1 indica fallo y 0 indica todas las comprobaciones verificadas.

### Guía de plataforma

Render/Railway: servicio Node o imagen con secretos de sistema, comando de build/release/start anterior, puerto del proveedor y health /health/ready. Frontend estático con fallback SPA; mantener /api y /health fuera del fallback. Confirmar logs de avisos y SHA publicado. No se configuraron cuentas o recursos.

VPS: contenedor o servicio supervisado con usuario sin privilegios, variables privadas, reinicio y SIGTERM, proxy HTTPS delante; acceso de BD y API limitado a la red prevista. Ejecutar release una vez antes del rollout y comprobar sondas desde la red real.

S3/R2 o equivalente: usar el endpoint API del proveedor para firmar PUT y una URL pública/CDN separada para products/. R2 puede usar región auto; path-style depende del servicio. Las plantillas AWS son ejemplos: en otros servicios traducir permisos a su modelo de tokens. Si no es posible ocultar _pending/ en el dominio público, usar CDN/proxy que solo permita products/ antes de lanzar.

## PostgreSQL administrado

La aplicación conserva Prisma 5.22 y su motor de conexiones. `server/database.ts` normaliza la URL privada sin imprimirla. Se crea un `PrismaClient` por proceso, compartido por repositorios, sesiones y health checks.

| Configuración | Valor predeterminado | Propósito |
| --- | --- | --- |
| `DB_POOL_SIZE` | 5 | Máximo de conexiones por proceso |
| `DB_POOL_TIMEOUT_SECONDS` | 5 | Espera por una conexión libre |
| `DB_CONNECT_TIMEOUT_SECONDS` | 5 | Apertura de conexión |
| `DB_QUERY_TIMEOUT_SECONDS` | 10 | Límite de consulta/socket de la aplicación |
| `DB_TLS_MODE` | require en producción | TLS y `sslaccept=strict` |
| `DB_SSL_CERT_PATH` | sin valor | Ruta absoluta a CA PEM montada, vía `sslcert` de Prisma |
| `DIRECT_DATABASE_URL` | obligatorio para migrar en producción | Conexión de release separada del pooler de transacciones |

Las variables explícitas tienen prioridad sobre los parámetros equivalentes de la URL. Se conservan los demás parámetros del proveedor, como `schema` o `pgbouncer`. No se aceptan pools ni timeouts ilimitados. El presupuesto debe cumplir `réplicas máximas × pool + jobs + reserva operativa <= conexiones disponibles`. Incluye las réplicas temporales de un rolling deployment. Ajusta con medidas de carga y saturación, no solo con el número de CPU.

En producción, la URL no puede pedir `sslmode=disable` ni `sslaccept=accept_invalid_certs` cuando se aplica TLS estricto. `DB_TLS_MODE=disable` es una excepción explícita usada por las pruebas aisladas; no la configures para una base cloud. Usa el nombre DNS certificado, no una IP sustituta. Los parámetros son los del [conector PostgreSQL de Prisma](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql), no todos los parámetros de libpq son intercambiables.

| Proveedor | Aplicación | Migraciones y TLS |
| --- | --- | --- |
| AWS RDS | Endpoint de la instancia o proxy compatible, usuario de aplicación con permisos mínimos | Conexión directa de release, CA vigente montada y rotación documentada. Configura `rds.force_ssl` según la política de la instancia. |
| Supabase | URL de pooler para la app; conserva `pgbouncer=true` cuando lo indique la configuración Prisma del proveedor | URL directa; si el runner no tiene conectividad IPv6, usa la opción de sesión compatible indicada por el proveedor. No uses modo transacción para este pipeline. |
| Neon | URL con pooler para el tráfico de la aplicación | Este proyecto elige URL directa para uniformar releases, aunque Neon admite migraciones mediante determinados poolers. Considera el tiempo de reactivación al ajustar sondas/timeouts. |

Consulta [TLS de RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html), [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) y [compatibilidad Prisma de Neon](https://neon.com/blog/better-postgres-with-prisma-experience). Los endpoints, credenciales, certificados y límites reales los proporciona la cuenta cloud; no se crearon recursos ni se conectó a una base administrada durante esta implementación.

## Imágenes S3

Configura únicamente en el backend:

```dotenv
MEDIA_STORAGE=s3
S3_BUCKET=tu-bucket
S3_REGION=tu-region
S3_PUBLIC_BASE_URL=https://imagenes.tu-dominio
S3_ENDPOINT=https://endpoint-del-proveedor
# S3_FORCE_PATH_STYLE=true
```

Usa IAM workload roles en AWS. Fuera de AWS, inyecta `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y, si corresponde, `AWS_SESSION_TOKEN` como secretos privados. Nunca uses prefijo VITE. El SDK usa la cadena oficial de credenciales.

Flujo implementado:

1. El editor consulta el límite, comprime a WebP y solicita PUT firmado con tamaño/MIME declarado. La API exige administrador y CSRF.
2. El servidor genera UUID y firma una carga de 60 segundos a `_pending/`, nunca usando nombres del cliente. El navegador hace PUT con Content-Type.
3. `/api/media/complete` valida un ticket HMAC de 5 minutos, tamaño real, Content-Type y firmas binarias PNG/JPEG/WebP; copia la versión inspeccionada a `products/` y confirma la subida antes de entregar la URL.
4. `_pending/` debe ser privado y excluirse del CDN/URL pública. Configura una regla de limpieza solo para temporales. No se entrega URL pública antes de validar; las firmas binarias no sustituyen un decodificador completo o un análisis antimalware.

Producción exige MEDIA_STORAGE=s3, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL y SESSION_SECRET. S3_FORCE_PATH_STYLE es configurable (false por defecto). Usa HTTPS; R2 suele usar región auto. Credenciales mediante la cadena SDK (IAM o AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY), nunca VITE_. Sin Base64 nuevo ni rutas locales en producción.

Usa CORS PUT/GET/HEAD y los permisos de las plantillas: Put/Get en temporales y productos, Delete solo en temporales; Copy usa Get+Put. R2 no utiliza políticas IAM de AWS: aplica permisos equivalentes en su token. Sirve products/ con CDN HTTPS y nosniff; mantén temporales privados. El modo inline de 2 MB es exclusivo de desarrollo/pruebas. No hay fallback cuando falla el bucket.

Las pruebas validan la firma y sus restricciones sin usar credenciales cloud. Antes de activar S3, verifica una carga real, CORS y lectura CDN en staging.

## CI/CD y migraciones

`.github/workflows/ci.yml` ejecuta instalación con lockfile, build de ambos artefactos, auditoría de secretos, lint, pruebas unitarias, integración PostgreSQL y prueba de la imagen Docker. Publica únicamente artefactos declarados y asociados al SHA del commit.

Las migraciones se ejecutan solo mediante `workflow_dispatch`, con `migrate=true`, desde la rama predeterminada y después del job de verificación. Hay exclusión mutua por entorno y nunca se cancela una migración en curso por otro despliegue. El proceso ejecuta `prisma migrate deploy`; no ejecuta reset, db push, seed ni bootstrap.

Configura en GitHub los environments `staging` y `production`, restringidos a la rama de release, con revisores requeridos y prevención de autoaprobación donde tu plan lo permita. Estas [protecciones de environment](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) requieren configuración en GitHub; el YAML no las crea. Guarda `DIRECT_DATABASE_URL` como secreto del entorno, con una cuenta de migraciones distinta de la cuenta de la aplicación.

Si la base requiere una CA privada, monta el certificado y configura `DB_SSL_CERT_PATH` en el runner. Si la base solo es accesible por red privada, utiliza un runner de release dentro de esa red. No abras PostgreSQL a Internet para adaptar el pipeline.

`pnpm db:migrate` usa `scripts/migrate.mjs`. En producción exige `DIRECT_DATABASE_URL`, limita el pool a una conexión y omite el timeout corto de consultas de la aplicación para permitir DDL. No muestra la URL ni la salida interna de Prisma. Ante fallo, revisa el estado de migraciones privadamente y aplica un procedimiento de recuperación; no reintentes un reset. En Docker usa `node dist-server/migrate.js` con el mismo entorno privado.

Los artefactos están listos para un paso de rollout específico de tu hosting, que debe desplegar exactamente el SHA verificado después de migrar. No se configuró un proveedor de hosting, publicación de imagen ni webhook sin un destino elegido. Reconstruye con el `VITE_API_URL` del entorno objetivo antes de promocionar el frontend; no reutilices un bundle que apunte a otro entorno. Para ambos entornos se recomienda `/api` mediante proxy.

En el artefacto descargado, instala dependencias de producción con el lockfile y genera Prisma para la plataforma de destino. Ejecuta `node dist-server/migrate.js` para el release y `node dist-server/index.js` para arrancar; los scripts de desarrollo del repositorio no forman parte del artefacto. La imagen Docker ya incluye el cliente Prisma generado para Linux.

## Sondas y observabilidad

| Endpoint | Resultado | Dependencia |
| --- | --- | --- |
| `/health/live` GET/HEAD | 200 mientras el proceso atiende | Sin BD, sesión ni S3 |
| `/health/ready` GET/HEAD | 200 o 503 | `SELECT 1`, con respuesta limitada a 1,5 s |

La readiness comparte una consulta en curso entre sondas concurrentes y cachea el resultado durante un segundo. Un timeout HTTP no cancela por sí solo la consulta de Prisma; se mantiene compartida hasta concluir, con los timeouts de conexión/pool/socket como límites de infraestructura. Las respuestas no tienen caché HTTP ni detalles de conexión. Los éxitos de health no generan logs de acceso; los fallos conservan status e identificador.

Al recibir SIGTERM, la readiness pasa a 503; el proceso deja cinco segundos para que el balanceador retire tráfico, cierra HTTP y desconecta Prisma. El límite total de cierre es quince segundos. `kubernetes.yaml` propone startup/liveness/readiness separadas y 25 segundos de gracia. Ajusta recursos y réplicas a las medidas reales.

En Render/Railway usa `/health/ready` para admisión de tráfico. En Kubernetes, no uses readiness como liveness: una caída de BD debe retirar tráfico, sin provocar reinicios masivos. Docker conserva health check de readiness con timeout de cinco segundos.

Centraliza los logs JSON y alerta sobre 5xx, readiness fallida, reinicios, saturación del pool, almacenamiento y errores de subida. Esta entrega no instala un servicio externo de monitorización ni exportador Prometheus.

### Limpieza de registros vencidos

`server/cleanup.ts` elimina únicamente sesiones y contadores de login vencidos; no realiza operaciones de archivos. Programa el siguiente ciclo después de finalizar el anterior (intervalo normal de 60 segundos). Un lock transaccional no bloqueante de PostgreSQL evita trabajo simultáneo entre réplicas; `SKIP LOCKED` pospone filas en uso. Cada ciclo procesa hasta 500 registros por tabla, con límites de espera y ejecución. El apagado detiene la programación y espera el ciclo activo antes de desconectar Prisma, dentro del plazo global de cierre.

Los fallos generan `CLEANUP_DEFERRED` con `level=warn`, como máximo una vez cada 15 minutos por proceso durante una racha de fallos. Los reintentos esperan 1, 2, 4, 8 y luego 15 minutos como máximo. La recuperación genera `CLEANUP_RECOVERED`. La advertencia conserva solo un código de causa permitido, nunca mensajes de Prisma, SQL ni credenciales.

Si el aviso persiste, comprueba migraciones y permisos: `42P01`/`P2021` indica tabla ausente; `42501`/`P1010` permisos; `55P03` bloqueo; `57014` timeout; `P1001` conectividad y `P2024` pool saturado. Los registros vencidos pendientes de limpieza siguen siendo rechazados por la validación de sesiones. Un error de mantenimiento no convierte una sesión caducada en válida.
