# Administración centrada en productos

## Flujo actual

`/admin/catalogo` lista únicamente productos: fotografía (o placeholder), nombre, precio base, número de diseños, estado y acciones. Búsqueda, categoría y página se mantienen en la URL. Las acciones son Agregar producto, Editar producto, Ver diseños e Importar diseños.

Cada producto guardado tiene su ficha en `/admin/catalogo/:productId`, protegida por el mismo guard de administrador y marcada noindex. No se muestran diseños de otros productos. Las fichas separan Diseños y tallas, Fotografías, Existencias e Importar diseños; la información general se edita con el asistente.

### Asistente

1. **Información general:** nombre, precio base, categoría, subcategoría, universo, descripción y características compartidas.
2. **Diseños y opciones:** una sola opción sin variantes comerciales, diseños manuales o CSV/XLSX; talla y color cuando corresponda. Los códigos internos se generan automáticamente y quedan en Datos avanzados.
3. **Fotografías:** tarjeta por diseño, filtro Sin imagen, carga/reemplazo, galería con orden de fotografía principal y vista previa. Puede omitirse y guardarse un borrador.
4. **Revisar y guardar:** resumen, selección explícita de diseños que se publicarán, Guardar borrador o Publicar producto. Los diseños sin foto no se habilitan para publicar. Un producto ya publicado también permite Guardar cambios sin cambiar su estado.

Avanzar y volver conserva el mismo borrador en memoria. No se escribe en la API al cambiar de paso. Cancelar o salir mediante los controles y enlaces advierte si hay cambios; también existe aviso al recargar/cerrar. Se debe comprobar manualmente la navegación Atrás/Adelante del navegador: no se migró a un enrutador de datos ni se añadió un bloqueo global de navegación.

## Importación sin registros parciales

Dentro del asistente, CSV/XLSX se revisa y añade al borrador local; todos los diseños se guardan junto con el producto en la transacción existente. No se guarda un producto provisional al abrir el importador.

**Límite deliberado:** el archivo preparado dentro del asistente debe dejar `quantity` vacío. Si contiene cantidades, se rechaza con instrucciones; no se ignoran. Para importar conteos, guardar primero y usar Importar diseños desde la ficha, que fija el producto elegido y reutiliza la transacción con movimientos existente.

La importación completa anterior, sus informes e historial permanecen en Opciones avanzadas del listado. También se conservan duplicación de productos y cambios masivos de estado/categoría. La ficha ofrece enlaces al editor clásico/ofertas y al inventario completo.

## Integridad

- Un diseño nuevo puede quitarse del borrador inmediatamente.
- Un diseño guardado se desactiva con confirmación, junto con sus opciones guardadas; se conservan identificadores, cantidades, movimientos y referencias de pedidos. Las opciones añadidas y aún no guardadas se descartan al retirar ese diseño.
- Quitar una talla continúa usando la retirada existente: eliminación si no tiene dependencias, desactivación si tiene historial, pedidos o saldo. No se reescribe el historial.
- La información y el precio pertenecen al producto y se heredan por relación. Los precios históricos de pedidos no cambian.
- El planificador de importación se comparte entre cliente y servidor; la generación determinista de SKU del servidor mantiene SHA-256. No se incorpora Node crypto al navegador.
- No se cambian auth, sesiones, R2, configuración de producción ni el modo capture/enforce. Sin migraciones nuevas.

## Validación

Correctos: lint sin advertencias, typecheck, 128 pruebas generales, build de frontend/backend y build:web. También pasaron 24 pruebas con PostgreSQL desechable, incluyendo el flujo guiado con 30 diseños, herencia, historial, retirada y listado con conteos reales.

No hubo inspección visual en navegador ni cargas reales a R2. Revisar manualmente listado, asistente completo con Atrás/Continuar, cancelar cambios, importación local y desde ficha, fotografías/orden, selección de publicación, tallas, existencias y opciones avanzadas, en móvil y escritorio. Verificar el catálogo y el mensaje de WhatsApp con un producto de prueba. No se aplicaron migraciones ni se accedió a Neon/Render.

## Archivos principales

- `CatalogManagement.tsx`, `ProductWizard.tsx`, `CatalogEditor.tsx`: listado, ficha y pasos.
- `DraftDesignImport.tsx`, `CatalogImporter.tsx`, sus hooks y `shared/designImport.ts`: importación preparada o aplicada al producto elegido.
- `productWizard.ts`, `editorActions.ts`, `ModelPhotos.tsx`, `VariantInventory.tsx`, `InventoryMatrix.tsx`: publicación, retirada y lenguaje sencillo.
- `server/repositories/catalogManagement.ts`: imagen y conteo de diseños en el listado, sin variantes anidadas.
- `App.tsx`, `StorefrontShell.tsx`, `index.css`: ruta independiente y estilos.
- `tests/catalog-management.test.mjs`, `tests/persistence.test.mjs`: pruebas del flujo y de integridad.
