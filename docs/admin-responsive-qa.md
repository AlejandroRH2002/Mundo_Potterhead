# Panel administrativo: navegación y responsive

## Cambios

- Barra compartida en Productos, Inventario, Promociones, Usuarios y Mi perfil (solo administradores). Conserva el menú principal y las rutas actuales; NavLink sincroniza el estado activo.
- Tarjetas con miniatura uniforme, precio, estado y diseños separados. Editar es la acción principal; Ver diseños y Ver ficha pública siguen visibles. Más acciones conserva importación y archivo/restauración con sus confirmaciones existentes.
- Diálogo de movimientos con producto, diseño, talla/color y cantidad actual. Reutiliza useInventory.move, permisos, concurrencia y reintentos existentes. Tras éxito cierra y refresca; el error conserva campos. Escape/Cancelar confirma cambios pendientes. El foco vuelve al botón de origen cuando termina la carga.

## Validación

El navegador usa componentes reales y una API simulada con datos ficticios, sin Neon ni R2. Se comprueban navegación y estado activo; productos y secciones a 320, 375, 390, 480 y 1440 px; nombres largos; tamaño de botones; ausencia de desbordamiento; conteo inicial, entrada y salida; rechazo del servidor, reintento y envíos duplicados; cancelación y foco; regresiones de sesión, fotografías, diseños y carrito.

Ejecutar pnpm test:product-ui -- --browser <ruta de Chrome instalado>. Capturas locales generadas y excluidas de Git:

- .tools/admin-responsive-evidence/products-390.png
- .tools/admin-responsive-evidence/products-1440.png
- .tools/admin-responsive-evidence/inventory-390.png
- .tools/admin-responsive-evidence/inventory-1440.png

## Publicación

Revisar la PR y sus checks; verificar manualmente tarjetas, Más acciones, barra desplazable y diálogo con una cuenta de staging. Tras aprobación, fusionar y publicar el frontend mediante el flujo habitual. No requiere migraciones, variables nuevas ni cambios de API. No cambia descuentos, publicación, inventario, autenticación ni cotizaciones. La validación con mocks no acredita conectividad real de R2 ni sustituye la prueba de staging.
