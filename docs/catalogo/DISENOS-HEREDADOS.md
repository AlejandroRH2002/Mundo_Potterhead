# Diseños heredados y fotografías progresivas

## Uso

1. En **Modelos**, crear el producto padre con nombre, precio, descripción/características, categoría, subcategoría y universo. Puede guardarse sin diseños; conservarlo como borrador mientras se prepara.
2. Abrir **Importación masiva** → **Importar diseños a producto existente**, buscar y seleccionar el padre.
3. Descargar la plantilla CSV o XLSX simplificada. Cada fila es una variante: `modelCode`, `modelName`, `sku` opcional, `size` opcional (vacía = `one`, Única), `color` opcional y `quantity` opcional. Repetir el mismo modelCode/modelName para sus tallas. No incluir precio, descripción, categoría ni imágenes.
4. Simular y revisar diseños/SKU nuevos, existentes y errores. Confirmar para guardar. Cantidad vacía conserva el saldo; una cantidad indicada establece un conteo absoluto y registra el movimiento si cambia. No representa una recepción incremental.
5. Volver al producto, en **Modelos** o **Imágenes**. El filtro **Sin imagen**, la búsqueda por código/nombre y los contadores muestran lo pendiente. La lista se pagina de doce en doce.
6. Usar **Agregar imagen** o **Reemplazar foto** en el diseño correspondiente. La foto se asigna al diseño, con vista previa; pulsar **Guardar cambios** para conservarla entre sesiones.
7. Una foto nueva no activa el diseño automáticamente. Usar **Publicar diseño al guardar** y guardar. El producto padre también debe estar activo. Quitar su última foto exige desactivarlo; la galería lo deja como borrador automáticamente.

Los modelos importados sin fotografía quedan inactivos y no aparecen entre los diseños del detalle público. En administración se usa un placeholder propio, nunca la fotografía de otro diseño. Reemplazar una foto no modifica SKU, cantidades ni movimientos.

## Herencia e integridad

Precio, descripción y características generales (incluidas medidas/materiales redactados en la descripción), categoría, subcategoría y universo existen solo en Product. Los modelos y SKU se relacionan con ese padre; editarlo cambia lo mostrado y cotizado para todas sus variantes. No se añadieron copias de esos datos ni nuevos campos de excepciones de precio. Los precios históricos de OrderItem permanecen intactos.

La excepción existente de imágenes se conserva: imagen específica de variante > galería de modelo > galería general del padre. Las nuevas variantes de la importación simplificada no copian imágenes, por lo que heredan la fotografía de su modelo. Las excepciones antiguas deben editarse en su propia galería si se quiere cambiarlas.

Los SKU explícitos se conservan. Si está vacío y ya existe esa combinación modelo/talla/color se reutiliza su SKU; para combinaciones nuevas se genera un código determinista con prefijo de modelo, talla y huella SHA-256. No se sobrescriben identidades ni se trasladan códigos a otros modelos/padres. Para renombrar un modelo existente se usa el editor: la importación simplificada rechaza un nombre distinto para un código existente.

La simulación incluye el estado del padre: si cambia después, hay que repetirla. Reenviar el mismo contenido confirmado no duplica diseños ni conteos. Importar nuevos diseños conserva los ya existentes, sus imágenes, activación y movimientos. El historial y los permisos reutilizan los endpoints actuales de catálogo.

## Límites y compatibilidad

- Hasta 200 diseños por padre, 100 variantes por diseño y 200 filas de importación por lote. Para más variantes, dividir en lotes.
- Ocho imágenes **por galería**, con galería propia de producto, modelo o variante. El límite anterior de ocho para todo el producto no permitía fotografiar treinta diseños.
- Miniaturas del producto: mapa con hasta 1600 referencias; el detalle público no mezcla todas las fotos de modelos en la galería general ni expone las miniaturas de diseños inactivos. El listado público cuenta los modelos activos.
- El inventario continúa en ProductSku, sin saldo propio del padre y sin modificar registros históricos. No se activa `enforce`.
- No se necesitan cambios SQL: se reutilizan relaciones, arrays y estado activo existentes. Migraciones nuevas: ninguna. No se tocó `.env`, Neon, Render ni main.

## Pruebas y revisión

Correctos: `pnpm lint`, `pnpm typecheck`, `pnpm test` (124), `pnpm build` y `pnpm test:integration` (23, PostgreSQL desechable). Incluyen producto padre sin modelos, plantillas simplificadas, treinta diseños sin foto, talla única/múltiple, SKU estables y duplicados, herencia, precios históricos, publicación sin foto rechazada, foto individual/reemplazo sin cambiar historial, cien galerías, catálogo público y foto seleccionada en el carrito. Las pruebas existentes de permisos, rollback y reimportación también siguen pasando.

No se probaron cargas reales a R2 ni la apariencia en navegador. Revisar con un bucket de prueba: selector del padre, plantilla CSV/XLSX, simulación, filtro Sin imagen, carga y reemplazo, guardar/reabrir, publicación, detalle, tallas, carrito y WhatsApp, en móvil y escritorio. Los objetos subidos sin guardar pueden quedar huérfanos; no se ejecutó ninguna limpieza ni se borraron archivos.
