# Administración y promociones

El catálogo vigente es /admin/catalogo. /admin y el editor anterior redirigen a este flujo. Las APIs antiguas se conservan. Las fichas agrupadas resuelven su familia sin cambiar identificadores históricos. Restaurar devuelve a borrador y exige publicar explícitamente.

## Fuente de verdad

Product.price sigue siendo el precio vigente; las ofertas reutilizan originalPrice e isOnSale. Desactivar restaura el precio normal. El editor del producto cambia el precio normal y Promociones administra las ofertas. No se modifican pedidos históricos ni inventario.

PromotionSettings es una tabla nueva necesaria porque no existía configuración persistente reutilizable. Tiene una fila, revisión de concurrencia y último administrador que la modificó. No hay variables de entorno nuevas.

El anuncio general es informativo y no añade descuentos. El envío gratis inicia desactivado, con mínimo de 1500 MXN. Activarlo requiere cobertura y condiciones reales. El servidor calcula el subtotal después de descuentos, en centavos; cantidades inválidas y artículos eliminados no cuentan. WhatsApp solicita el beneficio sujeto a confirmación, sin fijar envío de cero ni garantizar cobertura nacional. Conserva diseño, talla, SKU e imagen.

## Validación y despliegue manual

1. Revisar la PR, disponer de respaldo/PITR y restauración probada. Crear una rama aislada de Neon para staging.
2. Ejecutar pnpm install --frozen-lockfile, lint, typecheck, test, build y build:web. pnpm test:integration crea PostgreSQL desechable y aplica las migraciones dos veces.
3. En staging, definir DATABASE_URL y DIRECT_DATABASE_URL en el entorno del proceso hacia esa rama aislada. Verificar el destino antes de pnpm db:migrate. Nunca publicar conexiones ni copiarlas a variables VITE_.
4. La migración 20261028000000_promotion_settings solo crea una tabla y su fila inicial desactivada. No modifica columnas existentes ni elimina información; el backend anterior puede seguir funcionando.
5. Probar API y frontend del mismo commit en staging: edición única, agrupados, archivo/restauración, permisos 401/403, concurrencia 409, ofertas y cotizaciones de 1499.99, 1500 y 1500.01. Cambiar mínimo y desactivar sin redeploy. Revisar móvil y escritorio.
6. Tras aprobación y respaldo, aplicar manualmente pnpm db:migrate al destino de producción autorizado. Después actualizar API en Render y frontend en Pages. La migración debe preceder a la API nueva, que comprueba la configuración al arrancar. Comprobar readiness y repetir verificaciones.
7. Si falla, volver a los binarios anteriores conservando la tabla. No ejecutar reset ni migraciones inversas destructivas. Revertir código no revierte precios: revisar las ofertas antes de un rollback.

Las pruebas usan almacenamiento simulado y no acreditan acceso real a R2. Revisar manualmente fotografía existente, carga por diseño, talla, carrito y WhatsApp en staging. Este cambio no aplica migraciones automáticamente a Neon.
