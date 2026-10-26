# 12. Producto → modelo → SKU por talla

Fecha: 2026-10-26. Rama feat/inventario-modelos. Extensión de la implementación anterior: no se aplica ninguna migración, no se cambia .env real ni se activa enforce. Los documentos07–11 describen la fase previa; esta nota actualiza tallas, contratos y medios.

## Datos y compatibilidad

Migración nueva **20261026000000_sized_skus_search**, posterior a **20261021000000_model_inventory** (también pendiente). Se aplican en orden mediante pnpm db:migrate solo en un entorno autorizado; comando NO ejecutado aquí. La migración anterior no se reescribe.

- Product mantiene ficha, tarifa única y galería de máximo8; añade searchText e imageThumbnails (mapa limitado a8 referencias).
- ProductModel posee diseño/imagen y relación con SKU. Sus campos históricos sku/quantity/version permanecen por compatibilidad, pero dejan de ser fuente de saldo.
- ProductSku posee id/código estable, talla, cantidad nullable y versión. UNIQUE(modelId,size), CHECK de cantidad y validación de talla/categoría en Zod y trigger SQL.
- Se copia cada saldo/versión de modelo existente al SKU one conservando su ID/código. Movimientos reciben skuId sin cambiar importes, actor, motivo o claves; el trigger inmutable solo se suspende dentro de la transacción de migración para añadir esa referencia. No se consulta Product.stock.
- SKU nuevo de talla nace pendiente, sin unidades inventadas. Movimiento y ajuste siguen bloqueando fila/transaccionando, ahora sobre ProductSku. Los IDs de SKU one permiten resolver carritos y reintentos antiguos inequívocos.

Lista controlada: shared/sizes.ts. Ropa XS/S/M/L/XL/XXL y Única; calzado22–30 en pasos0,5cm, más Única para compatibilidad con artículos sin talla; accesorios/juguetes/bolsas Única. Slug one es el predeterminado. No se crean todas las combinaciones automáticamente: admin agrega las que comercializa. Cambiar categoría se rechaza si hay tallas incompatibles; no se borran SKU históricos para forzarlo.

## API y vistas

- POST /api/admin/inventory/:modelId/skus crea una talla válida; body estricto size, sin cantidades.
- GET /api/admin/inventory devuelve filas de SKU con modelId y size. /:skuId/movements conserva operaciones/historial por SKU; los IDs antiguos one permanecen válidos.
- POST /api/quote acepta skuId; también resuelve referencias antiguas inequívocas. Diseño/talla, precios, cantidades acumuladas y fotos se revalidan; no hay reservas ni descuento al cotizar.
- Listado público/admin: una fila por producto, miniatura, modelCount, available, priceMin/priceMax e información de ficha. Sin arrays de modelos/SKU/galería ni Base64. No se copia información de SKU a cada tarjeta.
- priceMin y priceMax coinciden porque el sistema conserva una tarifa por producto; no se añadieron precios independientes por talla.
- Detalle devuelve diseños con sus SKU/tallas/saldos; selector por miniaturas y talla. En enforce deshabilita agotados y muestra Últimas N piezas con umbral INVENTORY_LOW_STOCK_THRESHOLD (backend, default10). No se activó ese modo.
- En capture cantidades desconocidas/cero no se ocultan ni bloquean por stock; se conservan selecciones obligatorias de diseño/talla y el archivo/desactivación manual existentes.
- Filtro size en URL y barra lateral al seleccionar categoría; limpieza y chips incluidos. Búsqueda q usa searchText denormalizado (nombre de producto+modelos), mantenido por triggers al guardar; no introduce joins en el predicado de búsqueda textual.
- Total/lista son actuales; facetas se cachean30s por filtro, pueden retrasar hasta30s sus conteos. Las consultas del catálogo no abren transacciones interactivas; los movimientos sí las requieren para integridad.
- El carrito solicita solo detalles de IDs presentes (lotes de4), no todo el catálogo. Agrupa por SKU y WhatsApp incluye diseño, talla, código, referencia e importes. La imagen sigue siendo propiedad del diseño, no del SKU.
- Admin: cuadrícula modelos×tallas con conteo rápido y movimiento por guardado; motivo explícito de conteo físico, versión e idempotencia. Es una cuadrícula de los SKU de la página: filtros/paginación siguen vigentes y un guion no prueba que no exista talla en otra página.

## Backfill explícito, sin ejecutar

pnpm catalog:backfill-models -- --dry-run es el modo predeterminado; --apply escribe solo bajo autorización. Procesa100 productos por lote, usa IDs deterministas, conserva galería y conteos existentes. Reutiliza un modelo sin imagen solo si no tiene saldos capturados; crea diseños faltantes por imágenes únicas con SKU Única/cantidad NULL. No cuenta fotografías como unidades ni borra imágenes/modelos. Deben revisarse los nombres comerciales después de convertir imágenes antiguas a diseños.

El resumen solo imprime cantidades; no URLs/Base64. Repetir no crea duplicados. No aplicar en enforce. Productos con cantidad previamente capturada no se reinician a pendiente. El script inventory:prepare anterior permanece disponible para fichas sin modelo; no sustituye la revisión de tallas.

## WebP, miniaturas y deduplicación

Se reutiliza canvas para lado máximo1200 y400, calidad0,8, sin ampliar originales menores. Cada archivo WebP tiene SHA-256 calculado en navegador. Firma consulta HEAD del objeto canónico; si huella/tipo/tamaño coinciden devuelve la URL existente y evita PUT. complete verifica bytes/MIME/SHA antes de publicar y guarda metadata verificable. Publicaciones nuevas usan clave content-addressed incluso para clientes que aún no envían huella. Dos cargas concurrentes iguales convergen en el mismo objeto final, aunque ambas puedan haber subido temporales.

Las miniaturas se referencian en el mapa de producto y se usan en listado/modelos. No se vuelve a procesar automáticamente toda la biblioteca antigua: sin miniatura se conserva su imagen existente. Objetos históricos de nombre aleatorio sin índice por huella no se reconocen retroactivamente mediante HEAD; deduplicación canónica aplica a las nuevas publicaciones. No se escanea todo el bucket en cada carga.

pnpm media:orphans -- --dry-run es únicamente lectura y rechaza --apply. Compara objetos products/ contra referencias de productos/modelos/miniaturas; informa conteos/bytes potenciales, sin borrar. Excluye _pending/ (política lifecycle independiente). Revisar subidas concurrentes, URLs con prefijos anteriores y referencias externas antes de cualquier limpieza futura: un candidato no autoriza borrado.

## Estimación de almacenamiento, no medición

Supuestos: IDs textuales tipo UUID, códigos cortos, razón media80bytes UTF-8, huella64caracteres, índices existentes y nuevos. Estimación450B por SKU y800B por movimiento incluyendo fila/índices:10000×450 +50000×800 =44.500.000B ≈42,44MiB. Con margen25% para páginas/fragmentación ≈**53MiB**. Rango orientativo45–65MiB. Excluye productos/modelos/imágenes, WAL, backups, réplicas, historial muerto prolongado y motivos muy largos. No se ejecutaron consultas ni herramientas contra BD para calcularlo.

## QA y gates

Pruebas nuevas: tallas por categoría, UNIQUE declarado, listado sin variantes, búsqueda denormalizada, backfill determinista/idempotente, deduplicación SHA con bytes discrepantes rechazados, compresor400 y capture/enforce por talla. Tests reales PostgreSQL siguen pendientes/prohibidos en esta ejecución; comprobar SQL/trigger/locks en BD aislada antes de producción. No declarar que validate equivale a aplicar migraciones.

Revisión manual: detalle de ropa/calzado/Única, diseño y talla en móvil/escritorio, filtro/chip/Atrás, carrito por dos tallas y WhatsApp, cuadrícula/confirmación/agotados, subir dos veces PNG/JPEG y revisar ambas resoluciones. No se instaló navegador ni se observó renderizado.

Despliegue futuro: probar migraciones desde esquema anterior en staging/restore; detener writers viejos de stock; aplicar cadena de esquema → API capture → frontend → backfill revisado/conteos → QA. No activar enforce en esta fase. Para rollback comercial mantener capture, conservar tablas/ledger y evitar volver a un backend que escriba el saldo obsoleto de ProductModel. Sin push/merge/deploy automático.

### Resultados locales finales

Lint, typecheck, pnpm test (102/102), pnpm build y pnpm build:web pasan. Prisma validate pasa; no se ejecutó SQL de migración. El build verifica que no haya valores privados del entorno en el cliente. Principal321,57kB /101,30kB gzip en unidades Vite:98,93KiB gzip frente a98,15KiB anteriores (+0,77KiB, debajo de +6KiB). No se abrieron archivos de dist.

Se aisló la configuración del optimizador en tests/fixtures/viteServer.mjs: Vite fusionaba arrays de entradas e inclusión heredadas y provocó una corrida bloqueada; solo se detuvo el runner propio identificado por su comando. Tras vaciar esas listas en configResolved,20 pruebas afectadas y luego la suite completa102/102 pasan. Configuración productiva Vite intacta.

La suite PostgreSQL aislada se adaptó a ProductSku y añade unicidad/categoría/búsqueda SQL real; solo se comprobó su sintaxis. No se ejecutaron Docker, test:integration, backfill, inventario:prepare ni media:orphans. Bases, R2 y .env reales no se modificaron. Producción y main no se publican desde esta entrega.
