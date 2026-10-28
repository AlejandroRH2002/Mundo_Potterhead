# Crear, revisar y publicar un producto

## Qué causaba la confusión

`/products/new` abría el editor clásico de fichas, mientras que
`/admin/catalogo/nuevo` abría un asistente distinto. Los diseños nuevos nacen
inactivos: subir una fotografía y guardar conserva ese borrador. El antiguo botón
de publicación solo preparaba un cambio local para el siguiente guardado.

Ahora **Agregar producto** utiliza siempre el mismo asistente. La ruta anterior
redirige a ese asistente y conserva el guard de administrador. Modelos e
importación permite abrir productos existentes y añadirles diseños; su enlace
para crear un padre utiliza la misma entrada. La importación completa existente
se conserva en sus servicios y API, sin ofrecer un segundo alta desde esa vista.

## Flujo del empleado

1. **Agregar producto:** nombre, precio, descripción y clasificación.
2. Elegir **Un solo diseño**, que crea una presentación única automáticamente,
   o **Agregar diseño** varias veces. También se pueden preparar diseños con
   CSV/XLSX, sin repetir los datos del producto padre.
3. Añadir fotografías. La cola conserva la asociación con cada diseño. Una foto
   subida todavía está **pendiente de guardar** en el producto.
4. Revisar el panel: nombre, foto, opciones, color opcional y existencias.
   Las acciones llevan al campo correspondiente; las existencias se leen desde
   Inventario. Si no pudieron comprobarse, se indica en lugar de asumir un saldo.
5. Elegir una acción:
   - **Guardar borrador:** conserva el producto sin mostrarlo públicamente.
   - **Guardar cambios:** conserva el estado de publicación actual.
   - **Guardar y publicar diseños listos:** muestra los nombres que se publicarán
     y los pendientes; pide confirmación y envía una sola operación al servidor.
6. Esperar **Confirmado por el servidor**, con los diseños publicados y pendientes.
   Si no había portada real, se utiliza una foto de un diseño listo. Una portada
   existente no se sustituye.
7. **Volver a borrador** retira el diseño y conserva sus fotos, opciones, códigos,
   cantidades e historial. Si era el último activo, el padre también vuelve a
   borrador para no mostrar una ficha sin diseños disponibles.

## Transacciones y fallos

No hay un endpoint nuevo ni guardados consecutivos para publicar: se reutiliza
`POST /api/admin/catalog`, que comprueba permisos y revisión y guarda dentro de
una transacción. Los diseños sin datos requeridos se envían inactivos. El color
vacío sigue siendo opcional. Subir una foto nunca activa un diseño.

Las reglas de inventario no cambian. En modo `capture`, un conteo pendiente no se
interpreta como cero. En `enforce`, si faltan conteos obligatorios de un diseño
que se quiere activar, **se rechaza la operación completa**. No se omite esa
validación ni se intenta publicar mediante varias solicitudes parciales.

Si falla el guardado, el formulario se conserva. Cuando el producto ya tiene ID,
se intenta leer su estado guardado para informar qué sigue publicado sin
reemplazar los cambios locales. Una respuesta perdida no demuestra rollback:
si no se pudo comprobar el resultado, se muestra como no confirmado. Para una
creación sin ID devuelto, revisar el listado antes de volver a crear otra ficha.
Un error al refrescar el listado después de guardar no invalida un guardado ya
confirmado.

## Recomendados

Solo estas tarjetas usan marcos cuadrados de tamaño uniforme e imágenes
contenidas, sin recorte, deformación ni participación de su tamaño intrínseco
en la altura de la fila. Se conservan miniaturas, carga diferida y placeholders.
Los estilos generales del catálogo permanecen sin cambios.

## Validación y despliegue

Las pruebas cubren el asistente único/múltiple, borradores, fotos, publicación
atómica de dos diseños dejando otro pendiente, retirada, permisos, concurrencia,
importación CSV/XLSX y conservación de opciones, movimientos y pedidos.
La integración utiliza únicamente PostgreSQL desechable y las migraciones ya
versionadas. Las fotografías de navegador usan almacenamiento simulado:
**no equivalen a una prueba de Cloudflare R2 real**.

Resultado local: lint y typecheck aprobados; 161 pruebas unitarias y 44 de
integración aprobadas; build y build:web aprobados. Chrome comprueba anchos de
320 a 1440 px, el asistente de uno y varios diseños, recarga del borrador,
publicación y retirada confirmadas, errores/reintentos y las tres orientaciones
de fotografías recomendadas. El bundle principal es 117,54 kB gzip según Vite.

Antes de integrar, revisar a mano el asistente y la ficha existente en móvil y
escritorio, las tarjetas con fotos verticales/horizontales/cuadradas y una subida
en un bucket de pruebas. Tras aprobar la PR y CI, desplegar el frontend por el
procedimiento habitual de Pages. No requiere cambios del backend, nuevas
variables, esquema ni migraciones, ni actualización masiva de datos existentes.
