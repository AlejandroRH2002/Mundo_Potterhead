# 08. Manual de inventario (computadora y teléfono)

Requiere migración/API desplegadas y cuenta admin. Desde Productos abre **Inventario** o **Existencias y modelos** en una ficha. En móvil hay tarjetas y acciones de al menos44px; tras Gestionar modelo la vista baja al formulario. No se instaló escáner ni se necesitan permisos de cámara.

## Antes de contar

1. Durante capture el catálogo sigue visible, sin prometer disponibilidad. Busca por nombre, modelo o SKU. Filtra Pendientes para detectar conteos faltantes.
2. Cada modelo vendible tiene su SKU. General sirve si solo hay un diseño. Si dos fotos muestran el mismo diseño, NO crear dos modelos.
3. Para dos diseños: gestiona General y renómbralo, por ejemplo Modelo A; guardar conserva su SKU/historial. Escribe Modelo B y pulsa Crear otro modelo. Selecciona una imagen ya guardada en la galería o usa la principal. No cambies el nombre de A para reutilizar su stock como B.
4. En enforce los modelos nuevos nacen inactivos. Captura su cantidad y luego marca Modelo activo y guarda. No intentes activarlos antes del conteo.

## Capturar inicial

Gestionar modelo → Conteo inicial → cantidad REAL (cero si se contó y no hay piezas) → motivo sin datos personales → Confirmar movimiento y aceptar confirmación. Resultado muestra pendiente→cantidad. No inventar unidades para publicar. Si todavía no se contó, dejar pendiente.

## Venta acordada por WhatsApp

Identifica el modelo/SKU recibido en el mensaje. Verifica cantidad física y acuerdo con cliente. Selecciona Registrar venta, cantidad vendida y motivo, confirma. Se resta solo al registrar esta operación. No se descuenta al recibir o enviar una cotización. Si no alcanza se rechaza; no se admite saldo negativo.

El momento exacto de registrar venta/entrega debe ser consistente con la operación del negocio. Si se vende por fuera de la tienda, también registrar la salida. No compartir datos del cliente en el motivo; usar referencia interna no personal si se necesita.

## Entrada, corrección y agotados

- Registrar entrada suma unidades recibidas. Si estaba pendiente, contar primero el total real; no sumar a un valor desconocido.
- Conteo/corrección justificada establece la cantidad absoluta que quedó físicamente, no la diferencia. Ejemplo saldo5 y conteo3: escribir3; historial registra delta-2. Exige versión actual: si otro gestor cambió saldo, recarga y revisa.
- Agotados muestra quantity0. Para reabastecer, Entrada y cantidad recibida; con enforce reaparece solo si modelo activo y ficha no archivada.
- Stock bajo muestra1–3, solo como ayuda. Pendiente no es agotado ni ilimitado.
- Archivar producto oculta ficha completa y conserva datos. Mostrar producto respeta su inventario; en enforce puede seguir oculto si todos los modelos están agotados/inactivos.

## Historial y reintentos

Movimientos muestra tipo, antes/después, motivo, fecha y responsable por ID; usa paginación. No se editan ni eliminan. Un error se corrige mediante nuevo ajuste justificado.

Mientras se guarda, botones quedan bloqueados. Ante fallo de red, no cierres ni cambies el formulario: reintentar exactamente la misma operación conserva la clave y evita doble salida. Si recargaste, revisa movimientos antes de repetir: la clave de reintento es de la sesión de la página, no se almacena permanentemente. Una respuesta perdida puede corresponder a operación confirmada.

Para devoluciones: solo reincorporar mercancía físicamente recibida y vendible mediante entrada justificada; no aumentar stock porque se canceló una conversación sin salida. Activación capture/enforce corresponde al operador backend, no a un botón público.

## Revisión manual pendiente

Probar320/360/390/768/1024px, teclado/foco/confirmaciones, cantidades largas, filtros, imágenes y mensajes de error. No se observó la UI en navegador en esta ejecución.
