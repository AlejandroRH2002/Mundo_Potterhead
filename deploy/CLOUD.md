# Operación cloud

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
# Solo para un servicio compatible con políticas POST de S3:
# S3_ENDPOINT=https://endpoint-del-proveedor
# S3_FORCE_PATH_STYLE=true
```

Usa IAM workload roles en AWS. Fuera de AWS, inyecta `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y, si corresponde, `AWS_SESSION_TOKEN` como secretos privados. Nunca uses prefijo VITE. El SDK usa la cadena oficial de credenciales.

Flujo implementado:

1. El editor consulta `/api/media/config`; muestra errores según el límite configurado.
2. El administrador solicita `POST /api/media/upload` con tamaño y MIME. El servidor exige sesión, rol admin y protección CSRF.
3. La API genera un nombre UUID, política POST de 60 segundos, tamaño exacto y MIME permitido: PNG, JPEG o WebP, hasta 10 MB.
4. El navegador envía multipart directamente a S3 sin cookies de la aplicación. Solo después de recibir éxito usa la URL permanente en el producto.

Las [políticas POST de S3](https://docs.aws.amazon.com/AmazonS3/latest/developerguide/sigv4-HTTPPOSTConstructPolicy.html) permiten imponer tamaño y campos firmados. Los servicios compatibles deben soportar esta operación; una API que solo implemente PUT firmado necesita otro adaptador. La firma y los campos temporales se entregan al administrador, pero nunca la clave secreta de AWS.

`MEDIA_STORAGE=inline` conserva el modo local de 2 MB. No hay fallback automático a Base64 cuando S3 falla. Las imágenes antiguas permanecen válidas y no se migran automáticamente.

Preparación del bucket/CDN:

- Adapta `s3-upload-policy.json`: permite únicamente `s3:PutObject` en `products/*`. Sin List/Delete/ACL para la aplicación.
- Adapta `s3-cors.json` al origen real del frontend. Mantén Block Public Access, cifrado y Object Ownership adecuados; sirve lectura mediante CDN con acceso al origen. No se envían ACL desde el cliente.
- `S3_PUBLIC_BASE_URL` debe mapear el mismo prefijo `products/` del bucket. Configura HTTPS, Content-Type correcto y `X-Content-Type-Options: nosniff` en el CDN.
- El MIME firmado limita la declaración, no inspecciona los bytes. Para contenido no confiable agrega cuarentena y procesamiento de imágenes antes de publicar. El flujo actual está restringido a administradores.
- Archivos cargados sin guardar el producto pueden quedar huérfanos. Planifica limpieza comparando URLs referenciadas, con un periodo de gracia. No apliques una expiración global que elimine imágenes vigentes.

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
