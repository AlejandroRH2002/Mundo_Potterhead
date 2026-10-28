# Fichas públicas, enlaces históricos y errores 404

## Diagnóstico

Se reprodujo el 404 del ID reportado mediante GET público. La respuesta es JSON con `Cache-Control: no-store`; la página SPA responde 200. El mismo proxy devuelve 200 para las diecisiete fichas del catálogo público examinadas. No se encontró evidencia de un endpoint caído ni de que Pages estuviera devolviendo HTML en lugar de JSON para esa petición.

El ID reportado no aparece en ese catálogo ni entre los diseños/SKU públicos consultados. La API anterior ocultaba fichas archivadas, agrupadas y no publicadas con el mismo 404 que una ficha inexistente. Sin consultar su registro no puede afirmarse cuál es el estado concreto de ese ID en Neon. No se consultaron registros privados ni se utilizaron credenciales productivas.

Sí se confirmó una regresión del frontend: el estado del hook estaba vinculado al ID de ruta, pero el catch guardaba el error sin ese ID. Al comparar el estado con la ruta, el hook devolvía nuevamente loading=true y ocultaba el error de forma permanente. El fallo afectaba tanto a 404 como a otros errores.

El enlace Ver del administrador usa correctamente el identificador del producto; apunta a su ficha **pública**, aunque el listado administrativo incluya registros ocultos. Su etiqueta ahora lo indica expresamente. Catálogo, buscador y relacionados usan los IDs públicos de producto; no se cambian por IDs de diseño/SKU.

## Resolución implementada

| Caso | Resultado |
| --- | --- |
| Producto individual público | 200 con su detalle y opciones |
| Familia pública | 200 con sus diseños y tallas públicos |
| Original agrupado con correspondencia pública verificable | 200 con la familia y metadatos mínimos resolvedFrom; el cliente reemplaza la URL por la familia y preselecciona el diseño |
| Original con varios diseños públicos | Se abre la familia, sin adivinar una selección única |
| Archivado sin familia | 404 PRODUCT_UNAVAILABLE; pantalla Producto no disponible y enlace al catálogo |
| Inexistente o borrador privado | 404 genérico; pantalla Producto no encontrado |
| Familia oculta, diseño original inactivo, auditoría ausente o cadena de alias | No resuelve datos privados; 404 sin detalles históricos ni ID del destino oculto |
| Error de red, validación o 5xx | Pantalla de error con enlace al catálogo; no carga infinita |

El repositorio usa groupedIntoId y la auditoría inmutable ProductGrouping.report para relacionar el ID original con los IDs de diseño trasladados. Nunca deduce la correspondencia por nombre o fotografía. Solo devuelve un modelId si coincide con un único diseño que ya figura en el detalle público de la familia. No sigue cadenas de alias ni ciclos.

La familia pasa por las mismas reglas de estado, archivo y existencias de la consulta pública normal. Una sesión de administrador no habilita una vista privada por esta ruta. No se serializan nombres/descripciones históricos, pedidos, datos de usuario o informes completos de auditoría. Las fuentes de imágenes siguen pasando por la política existente.

El contrato normal de ProductRepository.get permanece sin resolución de alias. La cotización sigue validando el ID público actual y su SKU. Los carritos guardados anteriormente con un ID oculto requieren revisar y volver a elegir el diseño; no se convierten silenciosamente ni se aceptan precios antiguos. Las nuevas selecciones desde un enlace histórico guardan el ID de la familia y el mismo SKU vendible del diseño original. No se modifican cantidades, precios, pedidos, registros antiguos ni movimientos.

## Pruebas sin migraciones ni escrituras sobre bases existentes

- `pnpm test`: errores y contrato de metadatos, selección, galería, carrito y demás regresiones.
- `pnpm test:product-history`: copia únicamente el esquema actual desde PostgreSQL local en modo de solo lectura a un contenedor desechable de la misma versión. No copia registros y no ejecuta migrate, db push o seed. Rechaza conexiones remotas como origen, exige la familia de tablas ya existente y elimina solo su propio contenedor al terminar.
- La integración conecta el servicio frontend real con la API y Prisma del contenedor. Comprueba productos, familias, búsqueda, resolución y selección histórica, privacidad incluso con sesión admin, borradores/archivados/inexistentes, auditoría, variantes inactivas, cotización/WhatsApp y conservación de inventario/pedidos/movimientos.
- `pnpm test:product-ui -- --browser "<ejecutable Chrome/Edge instalado>"`: navegador con API simulada local, peticiones externas bloqueadas, casos 404/503/archivado y enlace histórico en móvil y escritorio, además de la matriz responsive ya existente. No instala navegadores ni abre WhatsApp.
- La infraestructura de CI incorpora también el nuevo test de historial a su PostgreSQL desechable habitual. No se modifica el job de migraciones productivas ni se lo habilita en una PR.

No se requieren migraciones nuevas ni cambios del esquema. El runner local no modifica el esquema o datos de la base original. Si la copia local del esquema no está disponible, falla sin intentar conectarse a Neon ni migrar una base real.

## Qué falta para confirmar el ID específico

Bastaría una lectura autorizada de id, status, archived y groupedIntoId del registro original, y del estado de la familia si tiene destino. Si hay control de existencias, también debe verificarse la disponibilidad de los diseños públicos. Un resultado vacío confirmaría que el ID no existe en esa base. No hacen falta contraseñas, fotografías ni datos de clientes.

No se ejecutó esa lectura en Neon. Tras desplegar la corrección, un 200 con resolvedFrom en el mismo GET permitirá confirmar una resolución histórica pública sin consultar la base directamente; un 404 continuará sin revelar información privada.

## Despliegue manual

1. Revisar y aprobar la PR y sus checks, sin aplicar migraciones. Mantener los despliegues automáticos bajo el control del responsable del release.
2. Publicar primero la API de Render del SHA aprobado mediante el proceso existente: build:server y start:api. No cambiar la base, secretos, cookies ni configuración de R2.
3. Publicar después el frontend de Pages del mismo SHA con build:web; mantener /api y su proxy actual. La API nueva es compatible con clientes anteriores; el cliente nuevo muestra estados claros incluso si aún recibe el 404 genérico de una API anterior, pero necesita la API nueva para resolver familias históricas.
4. Comprobar salud y repetir el GET reportado; verificar la URL final, diseño, talla, imagen, catálogo y cotización. Revisar un archivado, un ID inventado y una familia no publicada. No abrir datos privados desde sus IDs históricos.

El agente prepara la rama y la PR; no fusiona ni despliega producción.
