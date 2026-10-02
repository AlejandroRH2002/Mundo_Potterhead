# Auditoría priorizada del escaparate

Sin implementar las mejoras de esta tabla. Impacto/esfuerzo son estimaciones. Todas encajan con cotizar por WhatsApp y **sin pagos en línea**.

| Prioridad | Mejora pendiente o parcial | Impacto / esfuerzo | Encaja sin pagos |
| --- | --- | --- | --- |
| 1 | Resolver el HTTP 500 de productos: falla listado, consulta sin coincidencias y detalle incluso para ID inexistente; auth/usuarios funcionan; readiness alternó 200/503. Revisar logs internos y alineación de esquema/cliente/API, sin reset. La causa exacta sigue sin confirmar. | Alto / por diagnosticar | Sí |
| 2 | QA renderizada a 360/390/768/1024/1440 px: teclado, foco, Atrás/Adelante, lector de pantalla, sticky, zoom 200%, contraste real y CLS. Los tests actuales son unitarios/estructurales. | Alto / medio | Sí |
| 3 | Revisar con asesor los datos del responsable/contacto, cambios/devoluciones y condiciones de cotización/envío; publicar solo condiciones confirmadas. Ya hay páginas legales y contacto configurable. | Alto / medio | Sí |
| 4 | Galería real y derivados multimedia: hoy la BD/API ofrece una sola imagen. La UI admite extras válidos cuando exista `images`, pero falta su persistencia/editor. Banner @2x opcional, WebP/AVIF y recortes aprobados. | Alto / medio | Sí |
| 5 | Evitar descargar todo el catálogo para resolver cotizaciones: consulta por IDs, caché compartida y revalidación al cotizar. El mini-resumen reutiliza el flujo existente y se carga solo en móvil con artículos. | Alto / medio | Sí |
| 6 | Stock/fecha de publicación/variantes reales: exponer datos controlados para agotados, etiqueta nuevo, talla/color y preservar selección en el mensaje. Actualmente se confirma disponibilidad; no se inventa stock ni fecha. | Alto / alto | Sí |
| 7 | Prerender/SSR selectivo para detalles: los crawlers sin JS reciben metadatos generales. Ya existen canonical, robots, sitemap estático y metadatos por ruta. | Alto / alto | Sí |
| 8 | Datos estructurados y breadcrumbs JSON-LD con precios/availability reales; revisar si Offer corresponde a una cotización. No emitir reseñas ni disponibilidad inventadas. | Medio / medio | Sí |
| 9 | Analítica agregada sin cookies: eventos mínimos de búsqueda, alta a cotización y salida a WhatsApp; evaluar proveedor, retención y texto de privacidad. Nunca enviar correos, cuentas ni el contenido del pedido. | Medio / medio | Sí |
| 10 | Compartir producto: Web Share con fallback de copiar enlace y confirmación accesible. | Medio / bajo | Sí |
| 11 | Favoritos locales con estados vacíos y recuperación al eliminar productos; no existe aún esa funcionalidad. | Medio / medio | Sí |
| 12 | Guías de tallas/medidas y cuidados por categoría, fotos y especificaciones revisadas por el negocio. | Medio / medio | Sí |
| 13 | Reseñas auténticas con moderación, consentimiento y mecanismo de reporte. No afirmar “compra verificada” sin evidencia que soporte esa afirmación. | Medio / alto | Sí |
| 14 | Correos reales de novedades con consentimiento, baja y entrega fiable. La suscripción existente es local/de demostración; no hay envío de correos ni historial de pedidos. | Medio / alto | Sí |
| 15 | Afinar 404/errores y observabilidad de producción: la vista 404 ya existe; falta comprobar códigos HTTP al servir la SPA, errores por producto y métricas/alertas operativas sin datos personales. | Medio / medio | Sí |

## Comprobación HTTP local

Ejecutar `node --env-file=.env scripts/check-local-http.mjs`; no sustituye ni ejecuta `test:integration`, no usa Docker y solo comprueba mediante HTTP. Lee credenciales del entorno sin mostrarlas. Crea un cliente temporal con contraseña aleatoria, lo desactiva, comprueba revocación y hace logout. Si la limpieza falla, el script lo indica y termina con error.

Resultado observado: readiness intermitente (200/503), listado filtrado 500, admin sin sesión 401, login admin 200, admin autenticado 200, alta temporal 201, login temporal 200, admin cliente 403, desactivación 200, sesión temporal revocada, login desactivado 401, logout 204 y sesión admin revocada. La cuenta de prueba quedó desactivada. La readiness volvió a dar 503 en la comprobación final. No se modificó el catálogo ni se aplicaron migraciones.

Si la API no responde: `pnpm dev:api` (o `pnpm dev` para frontend y API). Para el fallo de productos, revisar el proceso y sus logs/esquema; no asumir que reiniciar o resetear la BD lo soluciona.

## Revisión manual de pantallas

Inicio/banner 1280px/@2x/CTAs, anuncio descartable, franja de confianza; catálogo/orden/filtros/chips/paginación; detalle/miniaturas/precio/barra fija/relacionados; tarjetas táctiles y hover; cotización vacía/con artículos, mini-resumen/drawer, total, aviso legal y WhatsApp; navbar/footer/login/perfil/admin/contacto/legales/404. Revisar foco y scroll al navegar y con Atrás/Adelante; confirmar que editar búsqueda no desplaza la vista hasta enviar el formulario.

El comando completo `pnpm build` encontró EPERM al regenerar el motor Prisma de Windows con la API en ejecución. Typecheck, lint, 58 tests y compilaciones de frontend/backend por separado pasaron; el scanner del cliente no encontró valores privados. Queda pendiente autorización para interrumpir/reiniciar la API y repetir el comando completo. Principal: 88,40 KiB gzip (+1,69 KiB respecto a 86,71). No se detuvo ningún servicio.
