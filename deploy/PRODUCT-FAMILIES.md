# Agrupar productos existentes

La acción está en **Administración → Modelos e importación → Agrupar productos existentes**. No ejecuta una importación ni suma cantidades. Requiere un administrador activo, las protecciones habituales de las escrituras y confirmación de una simulación reciente.

## Qué se conserva

Los diseños cambian de producto padre conservando sus identificadores, códigos, imágenes y opciones de talla/color. Los identificadores de las opciones, sus cantidades, versiones y movimientos no cambian. Los pedidos siguen apuntando a la ficha original y conservan sus precios históricos. Las fichas originales quedan vinculadas al destino y ocultas del catálogo, sin borrarse. Una auditoría inmutable registra quién confirmó y el resultado.

No se combinan diseños o tallas por nombre ni precio. Dos diseños de Gryffindor pueden convivir con nombres diferentes, cada uno con sus tallas y existencias. El destino conserva su precio y descripción compartidos.

## Compatibilidad y casos que requieren revisión

- Categoría, subcategoría, universo, precio y oferta deben coincidir. Una mochila de Totoro y una de Harry Potter con universos distintos **no se agrupan**: necesitan familias separadas o un diseño posterior del catálogo con universos por diseño. No se reclasifican automáticamente.
- Descripciones diferentes exigen revisar materiales y medidas y aceptar explícitamente la descripción del destino. La original se conserva en la ficha antigua.
- Cantidades antiguas a nivel producto/modelo deben revisarse y asignarse antes a opciones; no se inventa su distribución.
- Diseños repetidos requieren nombres distintos en la simulación. Códigos duplicados, tallas incompatibles, fotografías inline o galerías mayores de ocho bloquean la operación.
- Si hay varios diseños, las fotografías generales deben estar ya asignadas. En un producto con un solo diseño se conserva su galería general en ese diseño.
- No se admite como origen una ficha ya agrupada ni una familia con fichas vinculadas. Máximo veinte orígenes, doscientos diseños y mil opciones por operación.

Los enlaces y carritos anteriores no se redirigen silenciosamente a otra selección: las fichas agrupadas dejan de ser públicas y el cliente debe volver a elegir su diseño. No existe desagrupación automática; un cambio posterior requiere revisión específica.

## Borradores y publicación

Una familia en borrador puede agruparse sin fotografías nuevas y permanece oculta. Publicar requiere revisar los diseños activos y completar fotografías y opciones; los conflictos estructurales siguen bloqueando la agrupación. Ver [guía actualizada de categorías, R2 de pruebas y release](CATALOG-RELEASE.md).

La simulación reconoce las fotografías que ya pertenecen al diseño, sus opciones o, cuando solo hay un diseño, su producto original. No exige subirlas de nuevo ni hace peticiones al almacenamiento. Antes se reconocía la fotografía general en los orígenes, pero no en el destino; esto podía disparar el mensaje genérico de publicación aunque el producto ya tuviera fotografía.

Sin elegir un cambio de publicación se conserva el estado del destino. Si le faltan requisitos para permanecer público, la simulación nombra el diseño y el requisito concreto. Puede seleccionarse **Guardar la familia como borrador, sin publicarla** y volver a simular: los pendientes de publicación pasan a advertencias, mientras categoría, universo, códigos y demás conflictos estructurales siguen bloqueando. Esta decisión es explícita y no activa ni desactiva diseños o tallas. Publicar y guardar como borrador son opciones excluyentes.

Las cantidades sin registrar se conservan como null y se muestran como advertencias; no se convierten en cero. En capture no impiden agrupar un destino público que ya reúne sus requisitos de fotografía y opciones. Si el entorno ya usa enforce, conservar o solicitar publicación sigue exigiendo conteos completos: agrupar como borrador permite continuar sin eludir esa regla. El registro de una venta sin conteo continúa rechazándose en cualquier modo. Para confirmar, el empleado debe aceptar expresamente las advertencias y el estado resultante. No se añaden migraciones ni se modifica el historial de movimientos.

## Prueba y despliegue controlados

1. En una copia desechable, aplicar `20261027000000_product_families` mediante `pnpm db:migrate`, con conexión explícita a esa copia. Nunca usar credenciales de producción en las pruebas.
2. Ejecutar `pnpm test:integration`: crea PostgreSQL desechable y comprueba conservación de IDs, imágenes, cantidades, movimientos y pedidos; idempotencia, conflictos, permisos, concurrencia y rollback ante fallos.
3. Crear un padre borrador, seleccionar fichas compatibles y simular. Revisar fotografías, nombres, tallas, cantidades, pedidos y advertencias. Cambiar un nombre requiere volver a simular. Cancelar o cerrar antes de confirmar no escribe datos.
4. Confirmar en la copia, comprobar una sola ficha pública y sus diseños; revisar el inventario y los pedidos anteriores. Repetir con precios/universos incompatibles y una simulación caducada o con existencias modificadas: deben rechazarse.
5. Tras revisión de la PR y respaldo/restauración probada, validar primero la migración y aplicación en una rama aislada de Neon. La migración es aditiva: añade un vínculo nullable y una tabla de auditoría, sin modificar productos existentes.
6. En producción, con autorización separada: migrar primero, desplegar el backend y frontend nuevos, verificar salud y después habilitar el uso de la acción al empleado. No ejecutar agrupaciones durante un despliegue mixto con procesos antiguos. Antes de cualquier rollback a un backend anterior tras agrupar, revisar su compatibilidad; la migración aditiva no garantiza que una versión antigua interprete familias ya agrupadas.

La implementación no aplica migraciones a Neon ni confirma agrupaciones reales. El desarrollo normal también necesita la migración en su propia base antes de iniciar el backend nuevo; las pruebas desechables no actualizan esa base.
