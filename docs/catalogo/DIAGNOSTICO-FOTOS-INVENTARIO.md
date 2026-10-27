# Diagnóstico de fotografías e inventario — 27 de octubre de 2026

## Hallazgos comprobados

La configuración local está en `MEDIA_STORAGE=inline`. No están definidos `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`, `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY`. No se modificó `.env` ni se imprimieron valores. No se identificó un perfil separado de R2 de pruebas. La API local respondió 200 en readiness; esto no comprueba credenciales ni lectura de R2.

En ese modo, `createMediaStorage` no configura objetos y `/api/media/config` devuelve `enabled: false` para un administrador. Antes, el cliente convertía la foto en Base64 y la galería rechazaba después ese resultado porque exige objetos. Ahora se informa que las fotografías no están habilitadas antes de comprimir/subir: no se genera un reemplazo inline ni almacenamiento temporal.

También había dos defectos verificables: las vistas administrativas ignoraban el mapa de miniaturas persistido, y una respuesta de deduplicación se aceptaba sin comprobar su lectura pública. Se corrigieron ambos. No se consultó la configuración de Render, Pages ni Neon; estos hallazgos locales no acreditan la causa de un fallo remoto.

## Flujo y archivos

- `GalleryEditor.tsx` y `ModelPhotos.tsx` usan `mediaService.ts`: configuración → WebP completo (hasta 1200 px) y miniatura (hasta 400 px) → huellas SHA-256 → autorización → PUT firmado sin cookies → confirmación → lectura pública comprobada.
- Endpoints administrativos: GET `/api/media/config`, POST `/api/media/upload`, POST `/api/media/complete`. Exigen sesión de administrador, y las escrituras usan los controles de Origin/X-Requested-With existentes.
- `server/media.ts` reutiliza Head/Get/Copy/Put/Delete y las validaciones MIME/tamaño/huella. `_pending/` permanece privado; solo se publica la referencia verificada en `products/`.
- `catalogService.save` conserva en Product el mapa `imageThumbnails` y las referencias de cada diseño. No modifica cantidades; para persistir la asociación hay que guardar el producto.
- Galería, tarjetas de diseño e inventario usan la miniatura propia y persistida. No se utiliza la foto de otro diseño cuando falta una: se muestra «Sin fotografía».
- Se mantiene el mensaje por etapa: autorización HTTP, PUT rechazado/bloqueado, confirmación o lectura pública. Un fallo no devuelve al formulario una referencia válida.

## Inventario

La tabla compartida agrupa por producto/diseño y muestra debajo sus tallas y colores. Cada grupo incluye fotografía o «Sin fotografía»; «Existencias actuales» y «Nueva cantidad» quedan separadas. «Actualizar existencias» requiere confirmación cuando ya existe cantidad y usa los movimientos/versiones existentes. Los códigos están en Datos avanzados; no se duplica el listado. La paginación sigue siendo por opciones: un diseño grande puede continuar en otra página, y el encabezado indica el alcance de la página. No se cambiaron esquema, saldos, permisos ni reglas del historial.

## Configuración para probar R2, sin usar producción

No ejecutar cargas con credenciales actuales de producción. Preparar una API y un bucket de prueba, con base aislada y lectura pública propia; no reutilizar el binding productivo.

| Nombre | Dónde | Requisito |
|---|---|---|
| MEDIA_STORAGE | API local de pruebas / Render de pruebas | s3 |
| S3_ENDPOINT | API | Endpoint HTTPS S3 de la cuenta de pruebas; no es la URL pública de fotos |
| S3_REGION | API | Región del proveedor; R2 usa auto |
| S3_BUCKET | API | Bucket de pruebas |
| S3_PUBLIC_BASE_URL | API | Base HTTPS de lectura; con la Function existente, origen Pages de pruebas seguido de /media |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | Solo API | Credenciales privadas del bucket de pruebas |
| S3_FORCE_PATH_STYLE | API | Opcional; mantener el estilo que admita el endpoint |
| AWS_SESSION_TOKEN | Solo API | Opcional, solo credenciales temporales que lo requieran |
| SESSION_SECRET | API | Secreto propio del entorno para sesiones y tickets; no compartir con producción |
| APP_ORIGIN | API | Origen exacto del frontend que realiza la prueba |
| PRODUCT_IMAGES | Pages de pruebas | Binding R2 al mismo bucket que usa la API; configurar previews y producción por separado |
| API_ORIGIN | Pages de pruebas | API aislada; no apuntar previews de prueba a la API productiva |
| VITE_API_URL | Frontend | /api |

Nunca usar prefijo VITE_ para credenciales o secretos. No se añadieron variables nuevas. Para una sesión local de prueba, configurar estas variables privadamente en el proceso sin guardar secretos en documentación o Git. No se editó la configuración del usuario.

El token R2 necesita lectura/escritura de objetos en el bucket elegido: Head/Get para verificar, Put/Copy para publicar y Delete para retirar temporales. CORS debe admitir PUT desde APP_ORIGIN con Content-Type. El bucket permanece privado; la Function de Pages lee solo `/media/products/...` mediante PRODUCT_IMAGES. Un binding ausente devuelve 503; un objeto inexistente, 404. La lectura de imágenes por `<img>` no usa credenciales AWS en el navegador.

## Migraciones y orden de despliegue

No hay migraciones nuevas en este cambio. No se consultó `_prisma_migrations` en Neon: no puede afirmarse qué está pendiente allí. Las últimas migraciones del repositorio que deben cotejarse son `20261021000000_model_inventory`, `20261026000000_sized_skus_search` y `20261026010000_catalog_management`; existen seis anteriores. No se aplicó ninguna en Neon.

En una rama aislada y autorizada de Neon, `pnpm catalog:check` informa pendientes/checksums/integridad sin imprimir conexiones. Para inspección manual de solo lectura, consultar migration_name, finished_at y rolled_back_at en `_prisma_migrations` y comparar con `prisma/migrations`. No ejecutar migrate deploy hasta contar con respaldo y autorización. Mantener el orden de ensayo, migración, API compatible y frontend descrito en DESPLIEGUE.md; no desplegar un frontend nuevo sobre la API antigua.

## Pruebas y pendientes

Aprobados: lint, typecheck, 136 pruebas generales, build, build:web y 25 pruebas en PostgreSQL desechable. Los mocks verifican carga/configuración/autorización, PUT sin cookies, deduplicación, lectura pública, archivos inválidos y ausencia de referencias tras fallo. Las pruebas de persistencia comprueban tres diseños, miniaturas al reabrir, reemplazo sin afectar otro diseño/SKU/saldo/historial, talla editable antes del conteo, publicación selectiva y rechazo de un diseño sin foto. Se conservan las pruebas anteriores de concurrencia, roles e importación.

No ejecutados: subida/lectura/borrado real de objetos R2, inspección visual en navegador, consulta o migración en Neon, despliegue en Render/Pages.

### Comprobación manual antes de main

1. Configurar exclusivamente el entorno aislado anterior y entrar como administrador. En Network, comprobar config enabled, autorización 200, PUT correcto y confirmación 200. No compartir cookies, tickets ni URLs firmadas en capturas.
2. Crear Frazada individual, tres diseños y guardar borrador. Subir PNG/JPEG a uno; comprobar miniatura, guardar, recargar y reemplazar. Los otros dos deben seguir sin foto.
3. Registrar piezas, consultar historial, probar una talla sin movimientos y publicar únicamente el diseño completo. Comprobar selección, imagen, talla/color y mensaje de WhatsApp.
4. Revisar inventario móvil y escritorio: agrupación, edición por talla, códigos avanzados, estado vacío, error y conflicto entre dos sesiones.
5. Identificar los objetos de prueba desde el registro privado de esa prueba y retirar solo los desechables, comprobando antes que no haya referencias guardadas. No ejecutar limpiezas de producción; la transacción de BD no elimina automáticamente objetos subidos y aún no asociados.
