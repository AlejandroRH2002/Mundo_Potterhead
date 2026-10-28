# Diseños y fotografías: experiencia de edición

## Compradores

El selector de diseños es una tira horizontal de altura constante. Las miniaturas
se cargan de forma diferida. Se puede deslizar en móvil, usar las flechas del
selector o recorrer los botones con Tab. Dentro de la tira, las teclas izquierda,
derecha, Inicio y Fin mueven el foco; Enter o Espacio eligen el diseño.
La selección sigue utilizando el mismo resolvedor de diseño, talla, galería y
carrito. No cambian precios, disponibilidad ni el mensaje de WhatsApp.

## Empleados

1. Agregar el diseño y sus opciones de talla o presentación.
2. Revisar el resumen del diseño. El color vacío es opcional, no un error.
3. Subir fotografías. Se procesan en una cola de **una carga simultánea**, con
   hasta 32 archivos pendientes o fallidos en memoria.
4. Mientras se suben, se pueden revisar otros diseños del mismo editor y editar
   sus datos. Cada tarea conserva el producto, diseño y opción de destino.
5. Si falla una fotografía, usar **Reintentar fotografía**. Se conserva la misma
   tarea; el servicio existente calcula la huella y reutiliza objetos confirmados.
6. **Fotografía subida** significa que el almacenamiento confirmó la carga y la
   URL pública pudo leerse. Todavía hay que **Guardar cambios** para conservar la
   asociación en la base de datos. No se anuncia como guardada antes de hacerlo.
7. **Publicar diseño** pide confirmación y prepara el estado para el siguiente
   guardado. El producto padre debe estar publicado. Subir fotografías nunca
   activa automáticamente diseños. Los borradores no aparecen en el catálogo.

El guardado, el cierre del editor y el cambio de sección esperan a que terminen
las cargas. Esto evita guardar una versión incompleta o desmontar la cola.
Cerrar o recargar la pestaña muestra la advertencia del navegador. Salir tras
aceptar descartar puede dejar objetos sin asociar; no se adjuntan resultados
tardíos a otros diseños. No hay persistencia ni recuperación de la cola después
de cerrar la pestaña. Se mantienen las herramientas existentes de revisión de
objetos huérfanos; no se ejecuta limpieza automática nueva.

El editor no recibe cantidades en su contrato de producto administrado. Por eso
remite a Inventario para verificar existencias, sin inventar un estado vendible.
Las reglas de inventario y publicación del servidor siguen siendo la autoridad.

## Validación antes de integrar

- Probar 1, 5, 20 y 50 diseños a 390 y 1440 px, teclado y desplazamiento táctil.
- Cargar dos fotos seguidas, cambiar de diseño y comprobar ambas asociaciones.
- Provocar un fallo del almacenamiento de pruebas, reintentar y guardar.
- Recargar y comprobar la fotografía, sus miniaturas y el estado publicado.
- Comprobar que un borrador continúa oculto y que carrito/WhatsApp identifica el diseño y talla.
- Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
  `pnpm build` y `pnpm build:web`. Integración requiere Docker para PostgreSQL
  desechable; no necesita ni debe utilizar credenciales de Neon o R2 producción.

No hay cambios de esquema, migraciones, contratos de API ni variables nuevas.
Tras revisar la PR y completar la integración pendiente, el frontend se despliega
por el procedimiento habitual de Pages. No requiere actualizar la base de datos.

## Resultado de esta entrega

Lint, typecheck, las 158 pruebas unitarias, build y build:web pasan. Chrome
instalado comprueba los seis anchos, la tira de 1/5/20/50 diseños, teclado,
desplazamiento táctil, selección para WhatsApp y el editor con fotografías
simuladas: compresión, cola, cambio de diseño, guardado, recarga y reintento.
Las respuestas de almacenamiento y guardado del fixture son simuladas; esto
**no acredita una subida a R2 real ni persistencia en PostgreSQL**.

Se intentó `pnpm test:integration`, pero Docker Desktop no estaba disponible:
no pudo abrirse el motor Linux y no se creó PostgreSQL desechable. Debe repetirse
con Docker iniciado antes de integrar. No se modificó ninguna base existente.
