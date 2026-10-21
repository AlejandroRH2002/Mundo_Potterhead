# 07. Implementación realizada

2026-10-21. Rama feat/inventario-modelos derivada de QA 595ee29. Los documentos 01–06 se conservan como auditoría/propuesta histórica. Esta implementación cambia la propuesta original: **no hay tallas**, solo modelos vendibles; saldo/version están en ProductModel y movimientos en InventoryMovement, evitando una tabla adicional 1:1 sin necesidad actual.

## Datos y reglas

Migración aditiva 20261021000000_model_inventory: Product.archived defaultfalse, ProductModel con SKU único y quantity nullable, InventoryMovement con responsable/FKs/clave única/fingerprint y valores antes/después. CHECK de cantidades/rango/coherencia y trigger que impide UPDATE/DELETE del ledger. Transacción DDL explícita. No se copia Product.stock, no se borra ni modifica el valor antiguo. Modelo General con ID/SKU determinista por producto existente; cantidad NULL. No se crean modelos por fotografía.

Modelos nuevos por API reciben UUID/SKU inmutable. Comparten precio de la ficha; la imagen asociada debe existir en su galería. Productos simples usan General. Ninguna pieza física individual o QR implementado. Archivo lógico reemplaza el borrado de productos para conservar trazabilidad; R2 no se modifica.

## Backend

- shared/inventory.ts: contratos estrictos, cantidades/motivos/versiones, cálculo de saldos.
- server/repositories/inventory.ts: transacción de saldo+movimiento, lock de fila del modelo, comprobación transaccional de admin activo, idempotencia y validación de cotización.
- /api/admin/inventory GET: búsqueda q, productId, status (all/pending/empty/low/available), page/pageSize.
- /api/admin/inventory/:modelId GET: saldo y SKU.
- /api/admin/inventory/:modelId/movements GET/POST: historial paginado y COUNT/RECEIPT/SALE/ADJUSTMENT.
- /api/admin/inventory/models/:productId POST y /:modelId PATCH: crear/nombrar/asociar imagen/activar modelos; no permiten saldo.
- /api/admin/inventory/archive/:productId PATCH: archivo lógico; body archived boolean.
- /api/admin/products GET y /:id GET: fichas sin ocultar agotados; administración deja de consumir listado público.
- /api/quote POST: precio/modelo/foto/cantidad actuales; agrega cantidades del mismo modelo, no crea pedido ni descuenta. Exige Origin/X-Requested-With como escrituras existentes. Máximo100 líneas, cantidades1–99, lectura sin reserva.

Endpoints admin requieren sesión y rol; escrituras mantienen CSRF. Modelo/operación estrictos; cantidades absolutas requieren expectedVersion. Mismo key/payload devuelve movimiento original, distinta solicitud409. UPDATE saldo y creación de movimiento comparten transacción; rollback revierte ambos.

## Modo y visibilidad

INVENTORY_MODE=capture por defecto, solo backend. Mantiene visibilidad de pendientes, con disponibilidad por confirmar. enforce oculta producto archivado/sin modelo activo positivo y opciones agotadas; aplica SQL antes de páginas/total/facetas. Arranque enforce rechaza productos no archivados sin modelo o con modelos activos sin conteo. Nuevos modelos en enforce se crean inactivos: contar y después activar. Reposición solo hace visible producto no archivado con modelo activo. No hay interruptor público.

Caché completa de ofertas retirada; facetas sin caché en enforce, por lo que saldo/visibilidad no dependen de invalidación en una sola réplica. La cola existente se conserva: límite de cola es un riesgo previo fuera de esta implementación.

## Cliente

Nueva feature inventory con servicios/hook/vista; listado de tarjetas responsive, filtros, entradas/ventas/ajustes, confirmación, bloqueo de envíos, clave reutilizada tras fallo, resultado antes/después, historial y paginación. Selección de imagen desde galería. Enlace desde Productos/edición. Ruta protegida /admin/inventario, noindex y sin footer por layout existente.

Detalle permite modelo independiente de foto; tarjeta con varios modelos lleva al detalle. Carrito conserva ID de modelo y foto de referencia, agrupa adiciones por modelo; entradas antiguas ambiguas requieren revisar/reseleccionar. Valida cantidad conocida localmente y de nuevo en servidor antes de WhatsApp. Mensaje incluye modelo/SKU, imagen, cantidades, importes y enlace de producto; advierte que no reserva. Sin pagos, tallas, QR, correo o automatización externa.

## Compatibilidad y límites

Migración antes de API. Backend antiguo ignora tablas nuevas pero puede crear productos sin modelo en ventana mixta: inventory:prepare los detecta/repara con NULL, dry-run predeterminado y --apply explícito, por lotes100 e idempotente. No ejecutado contra ninguna BD. No mantener writers viejos durante activación.

La UI anterior puede generar WhatsApp sin nueva validación; por eso no activar enforce hasta publicar frontend compatible y refrescar clientes. El servidor valida solicitudes nuevas de cotización, pero no puede prohibir conversaciones manuales externas. Stock no se reserva; ventas fuera del gestor requieren conciliación.

Decisiones prácticas: umbral bajo1–3 (etiqueta administrativa, no cambia disponibilidad), precio único, General como nombre transitorio editable. Conteo inicial solo una vez; conteos posteriores usan ajuste con motivo. Documento10 exige aprobación operativa y pruebas reales antes de activar.
