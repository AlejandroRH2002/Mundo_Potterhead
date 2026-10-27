# Auditoría de importación CSV/XLSX + ZIP

## Flujo existente

No se necesitan entidades ni migraciones nuevas: `Product` contiene precio/descripción, `ProductModel` el diseño y sus imágenes, `ProductSku` la talla/color y cantidad, e `InventoryMovement` su historial. La columna antigua `Product.stock` no participa en estas operaciones ni en la disponibilidad; no se modifica ni se usa como saldo alternativo. Los productos nuevos tienen su valor legado por defecto en cero.

Una fila representa un SKU. Repite `productCode` y los datos base idénticos (nombre, descripción, precio, categoría, universo y estado) en todas las filas del mismo producto. Repite `modelCode`/`modelName` para distintas tallas o colores del mismo diseño. Para añadir diseños a un producto existente, usa su código estable y códigos nuevos para esos diseños/SKU. No se eliminan diseños o SKU omitidos.

| productCode | modelCode | modelName | sku | size | images | quantity | inventoryMode |
|---|---|---|---|---|---|---|---|
| PLAYERA-01 | DISENO-A | Diseño A | A-M | m | diseno-a.png | 3 | replace |
| PLAYERA-01 | DISENO-A | Diseño A | A-L | l | diseno-a.png | 0 | replace |
| PLAYERA-01 | DISENO-B | Diseño B | B-M | m | diseno-b.png | 2 | replace |

Completa también las columnas base de la plantilla y `reason` al introducir cantidades. Cantidad vacía conserva el saldo. `replace` establece el saldo; `increment` registra una entrada sobre un conteo ya existente. Reenviar el mismo archivo/contenido confirmado no duplica el inventario: para una entrada nueva usa un archivo que represente la operación nueva y revisa siempre la simulación.

## Correcciones mínimas

- Validar todo el ZIP antes de iniciar cargas: archivos no admitidos, imágenes vacías y nombres ambiguos entre carpetas se rechazan previamente.
- Al reemplazar el ZIP se reemplaza su mapa de referencias, evitando mezclar archivos de cargas anteriores.
- Las importaciones conservan la activación de modelos/SKU existentes: el formato no incluye una orden para reactivarlos.
- La disponibilidad estricta se valida después de escribir los conteos iniciales de la importación, dentro de la misma transacción; si falta alguno, todo se revierte.
- Se evita procesar dos veces un doble clic y se limpia la simulación anterior antes de solicitar otra.

## Validación automatizada

`pnpm lint`, `pnpm typecheck`, `pnpm test` (119 pruebas), `pnpm build` y `pnpm test:integration` (20 pruebas) correctos.
Las pruebas de persistencia usan PostgreSQL desechable, credenciales aleatorias y las migraciones existentes; no usan `.env` ni bases reales.

Se probaron archivos CSV/XLSX generados y procesados con el lector real, asociación de referencias ZIP a modelos/SKU, reimportación idempotente, actualizaciones, búsqueda y detalle públicos, historial y saldos, permisos HTTP, CSRF, filas inválidas, duplicados, archivos peligrosos y acciones de duplicación/retirada de variantes. Un fallo forzado al insertar un movimiento revierte productos, referencias de imagen, saldos e informe; el mismo intento puede repetirse después sin duplicar registros.

El modo `enforce` se probó exclusivamente en el proceso aislado y se restauró al terminar. No se activó en desarrollo ni producción. Una venta con cantidad superior al stock se rechaza incluso en `capture`. En `capture`, WhatsApp sigue siendo una cotización sin reserva ni descuento de inventario; el bloqueo de SKU en la selección pública depende de `enforce`.

## Límites y comprobaciones manuales

No se hicieron cargas reales a R2: las URLs de imágenes y los bytes del ZIP de estas pruebas son referencias sintéticas. No se afirma que se hayan validado credenciales, CORS, compresión en canvas ni publicación/lectura real del bucket. Probar con un bucket y credenciales de prueba, nunca producción.

Revisar manualmente `/admin/catalogo` → Importación masiva: seleccionar CSV/XLSX + ZIP con fotos reales, simular, confirmar y revisar el historial. Verificar diseños/tallas e imágenes en detalle público, selección del SKU y mensaje de WhatsApp, y conteos/historial en Inventario. La inspección automatizada del detalle comprueba datos, no el aspecto visual en un navegador.

Una carga fallida antes de confirmar la importación puede dejar objetos sin referencias en el almacenamiento: la transacción PostgreSQL no elimina objetos de R2. Revisar con el script de huérfanos en modo simulación; no se ha ejecutado ninguna limpieza real.
