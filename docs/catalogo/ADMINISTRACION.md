El flujo de interfaz actual está documentado en [Administración centrada en productos](EXPERIENCIA-PRODUCTOS.md). Las referencias siguientes a secciones independientes describen la transición anterior; servicios, importaciones e integridad siguen vigentes.

# Modelos, variantes e importación

## Diagnóstico y estructura resultante

| Área | Antes | Ahora |
| --- | --- | --- |
| Producto | UUID, catálogo y galería general; archived | Conserva UUID; código comercial opcional, estado draft/active/archived y revisión de concurrencia |
| Modelo | UUID, código sku único, nombre único por producto, una imagen | Misma tabla e identificadores; galería ordenada y principal en primera posición |
| Variante | ProductSku: modelo × talla, código único, cantidad y versión | Modelo × talla × color normalizado; galería opcional y desactivación sin eliminar |
| Inventario | Saldo nullable por SKU y movimientos inmutables | Mismo saldo y ledger; importaciones registran COUNT, ADJUSTMENT o RECEIPT |
| Imágenes | R2/S3, WebP, miniaturas, SHA-256 y cargas verificadas | Se reutiliza el servicio, selección múltiple y asociaciones por producto/modelo/variante |
| Administración | Productos e inventario separados, sin carga masiva | Nueva vista /admin/catalogo enlazada desde Productos, con editor, selección masiva e importador |
| Pedidos | Tablas heredadas Order y OrderItem; flujo público WhatsApp | Sin cambios en tablas ni identificadores; no se crean pedidos ni pagos desde el importador |

La auditoría local de solo lectura no encontró SKU repetidos ni referencias huérfanas de modelos, SKU, movimientos o líneas de pedidos. Esto no describe el estado de Neon: no se accedió a su base.

La existencia se obtiene de ProductSku.quantity: null significa conteo pendiente, nunca cero ni disponibilidad ilimitada. Product.stock y ProductModel.quantity se conservan por compatibilidad y no son la fuente actual. Los cambios de saldo se serializan por SKU y producen un movimiento; la importación toma además un bloqueo de catálogo y vuelve a comprobar el rol activo. En capture no se impone disponibilidad; enforce sigue separado y no se activó. WhatsApp no reserva ni descuenta stock automáticamente.

## Uso del panel

1. En Productos, abrir **Modelos e importación**. `/admin/catalogo` tiene cabecera y distribución propias, sin la navegación de la tienda. Sus secciones son **Modelos**, **Variantes**, **Imágenes** e **Importación masiva**, navegables también con flechas, Inicio y Fin en las pestañas.
2. Crear un borrador o editar un producto existente. Los códigos se conservan: no renumerar productos, modelos ni SKU. Al primer guardado de un artículo antiguo se asigna como código su UUID existente.
3. Añadir diseños y sus variantes de talla/color. Cada combinación solo puede aparecer una vez por modelo. Una variante con movimientos conserva talla/color: para cambiarla, desactivar y crear otra.
4. Subir PNG/JPEG/WebP desde la galería general, del modelo o de la variante. Primera imagen = principal; las flechas cambian el orden. Una variante sin imágenes hereda las del modelo y, después, las generales.
5. Guardar y revisar el detalle público. El selector de talla/color identifica un SKU; carrito y WhatsApp incluyen modelo, talla, color, SKU e imagen elegida, también desde el botón móvil.
6. Para cantidades, usar el bloque de existencias de **Variantes** o abrir **Inventario e historial**. La tabla muestra una fila por SKU, con talla/color, saldo y conteo físico separados. Cada conteo requiere confirmación y queda registrado. El precio se muestra y edita como precio compartido del producto; no existen precios independientes por SKU.
7. Duplicar crea otro producto borrador y nuevos códigos; copia asociaciones visuales, pero ninguna cantidad ni movimiento. La selección masiva permite cambiar estado o categoría y rechaza el lote completo si una revisión/talla dejó de ser válida.

El listado desaparece al abrir un producto. El editor muestra un único diseño seleccionado y solo los campos de la sección activa. Cambiar entre Modelos, Variantes e Imágenes conserva el mismo borrador. Se indican los cambios sin guardar; Cancelar/Volver y el paso al importador piden confirmación si hay cambios. Recargar/cerrar la pestaña también avisa. Los conteos se guardan por separado y permanecen bloqueados mientras haya cambios de producto sin guardar.

**Quitar variante:** una variante nueva se quita del formulario de inmediato. Para una guardada se pide confirmación y se deja el retiro pendiente hasta **Guardar cambios**. Cancelar no modifica la base. Al guardar, la API bloquea el producto y los SKU afectados, vuelve a comprobar la revisión y decide en una transacción:

- Con movimientos, pedidos del producto, existencias positivas o una versión de inventario anterior, desactiva el SKU; no modifica saldo, versión, movimientos ni pedidos.
- Sin esas dependencias, elimina físicamente el SKU. Su código puede reutilizarse en un guardado posterior.
- Un SKU desactivado conserva su código y su combinación talla/color. Usar **Mostrar desactivadas → Reactivar variante**, sin crear otro con el mismo código.
- No se puede quitar y reutilizar el mismo código dentro del mismo guardado. Tampoco se pueden retirar IDs de otro producto.
- Los pedidos heredados no guardan SKU: por precaución, cualquier pedido del producto protege todas sus variantes. Si no quedan variantes activas, el modelo se desactiva y esos SKU dejan de admitirse en la cotización, incluso en capture.

**Duplicar modelo** crea una copia sin guardar dentro del producto: nombre y códigos nuevos, imágenes compartidas y ninguna cantidad/historial copiados. La copia se inicia inactiva para revisarla antes de publicarla. Las operaciones de edición y duplicación no se envían dos veces por un doble clic.

No se borran fotografías al quitarlas de una galería. `pnpm media:orphans -- --dry-run` conserva todas las referencias generales, de modelos, variantes y miniaturas; únicamente informa posibles huérfanos. No implementa borrado automático. Revisa también cargas en curso y referencias externas antes de decidir una eliminación manual.

## CSV, Excel e imágenes ZIP

Las plantillas se descargan desde el panel. Ejemplos versionados: [CSV](plantilla.csv) y [XLSX](plantilla.xlsx), con dos diseños del mismo artículo. Son ejemplos ficticios: reemplazar textos, precios y archivos por los reales. Los parsers ZIP y XML se cargan únicamente al usar archivos, sin añadirlos al bundle público inicial.

| Columna | Contenido |
| --- | --- |
| productCode | Código comercial estable del producto; para uno antiguo, su código mostrado o UUID |
| name, description, price | Datos generales repetidos de forma consistente en todas sus filas; precio MXN sin símbolo ni miles, punto o coma decimal |
| category, subcategory, universe | Slugs de la taxonomía compartida, por ejemplo clothing / chamarras-capas / harry-potter |
| status | draft (recomendado), active o archived |
| modelCode, modelName | Código estable y nombre del diseño; un modelo no puede moverse a otro producto |
| sku, size, color | Código único de variante, talla controlada (one = Única) y color opcional; un SKU no puede moverse a otro modelo |
| images | URLs HTTPS/rutas públicas o nombres del ZIP separados por `|`; se asocian al modelo y a la variante de esa fila |
| quantity | Vacío conserva el saldo; entero de 0 a 1000000 activa una operación de inventario |
| inventoryMode | replace = conteo inicial/ajuste; increment = recepción sobre un saldo ya contado |
| reason | Motivo obligatorio de 3 a 300 caracteres cuando hay cantidad |

Procedimiento:

1. Cargar CSV UTF-8 o XLSX con una primera hoja de valores. No se admiten fórmulas, macros, enlaces externos de libro, columnas repetidas/desconocidas ni entidades XML. Se limitan a 200 filas por lote; usar lotes menores si la latencia del proveedor provoca timeout.
2. Opcionalmente cargar un ZIP de PNG/JPEG/WebP, con nombres sin ambigüedades. Límites: 15 MB comprimidos, 30 MB expandidos y 200 entradas. Las imágenes se optimizan y suben mediante el servicio existente; no se guarda el ZIP ni Base64 en Neon. Si se cancela la importación, los objetos publicados pueden quedar pendientes de revisión por el diagnóstico de huérfanos.
3. Simular: valida filas y conflictos con datos actuales sin escribir en BD. Los errores indican la fila de la hoja (encabezado = 1). Corregir y volver a cargar.
4. Marcar la confirmación y ejecutar. El servidor valida otra vez, comprueba la firma de la simulación y las revisiones actuales, y aplica el lote en una única transacción. Un conflicto revierte el lote completo; no hay éxito parcial silencioso.
5. Descargar el informe JSON y consultar el historial de importaciones confirmadas. No se almacenan archivos originales ni imágenes en el historial.

La identidad se resuelve por códigos, nunca por posición de fila. Omitir modelos o variantes existentes los conserva. Mismos códigos con datos nuevos actualizan; los códigos no cambian de propietario. El mismo contenido confirmado vuelve a devolver el resultado anterior sin duplicar ni sumar stock, aunque se reintente con otra clave. Para una recepción posterior real, usar un motivo/documento distinto o registrar el movimiento desde Inventario; no repetir un archivo esperando otra suma.

Una simulación pierde validez si cambian productos, modelos o versiones de existencias. Si el navegador pierde la respuesta de confirmación, reintentar el mismo archivo es idempotente; revisar el historial antes de registrar manualmente un ajuste.

## API administrativa

Todas las rutas exigen una sesión admin vigente; las escrituras conservan Origin y X-Requested-With existentes. No hay nuevos endpoints públicos de escritura.

| Método y ruta | Uso |
| --- | --- |
| GET /api/admin/catalog?page=&q=&category= | Lista paginada ligera, sin imágenes ni arrays de variantes |
| GET /api/admin/catalog/:id | Documento editable con modelos/variantes |
| POST /api/admin/catalog | Crear/actualizar documento validado; revisión obligatoria en edición desde el panel |
| POST /api/admin/catalog/:id/duplicate | Duplicar como borrador, sin stock |
| PATCH /api/admin/catalog/bulk | Estado/categoría de una selección, con revisión por producto |
| POST /api/admin/catalog/preview | Simulación de filas y firma vinculada a su contenido/estado |
| POST /api/admin/catalog/import | Confirmación transaccional, clave idempotente e informe |
| GET /api/admin/catalog/history?page= | Historial paginado de confirmaciones |

Se conservan los endpoints de productos, inventario, movimientos, modelos, tallas y media anteriores. El listado público sigue siendo una fila ligera por producto y el detalle incluye modelos/variantes. Los schemas nuevos rechazan campos extra. Sin cambios de auth, sesiones, CORS o rate limiting.

## Pruebas y revisión manual

Pruebas automatizadas: CSV/XLSX de ida y vuelta, formatos inválidos, ZIP/entidades/fórmulas, combinación única, permisos 401/403 y CSRF, borradores, galerías/colores, duplicación sin cantidades, referencias históricas, concurrencia, rollback masivo, simulación sin escrituras y reimportación sin doble incremento. Ejecutar las verificaciones indicadas en [DESPLIEGUE.md](DESPLIEGUE.md).

Revisar a mano a 320, 390, 768 y 1440 px: /admin/catalogo, formulario con dos modelos y tallas/colores, galería múltiple y orden, importación CSV/XLSX + ZIP real de R2, errores por fila, inventario por color, detalle público, carrito y mensaje WhatsApp. No se realizó inspección visual en navegador ni una carga real a R2 durante esta tarea.

Para importar diseños sin repetir los datos del padre y cargar fotografías progresivamente, consulta [Diseños heredados](DISENOS-HEREDADOS.md). El límite actual es de ocho imágenes por galería y doscientos modelos por padre.
