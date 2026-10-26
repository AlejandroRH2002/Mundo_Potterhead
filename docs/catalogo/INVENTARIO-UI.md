# Inventario: actualización de interfaz

- Una fila por SKU, con producto/modelo, miniatura, talla/color, saldo, estado y conteo físico separado.
- Tabla de ancho completo y tarjetas por debajo de 768 px; desplazamiento controlado en pantallas intermedias.
- Resúmenes calculados únicamente sobre la página visible y total paginado proporcionado por la API. Los modelos pueden aparecer en varias páginas: no se presentan los conteos de página como totales globales.
- Búsqueda y filtros existentes en URL; confirmación al cambiar filtros/página con conteos pendientes.
- Guardado individual explícito, confirmación para reemplazar cantidades existentes, versión esperada e idempotencia del endpoint existente. Los errores conservan el borrador; «Actualizar saldos» permite detectar conflictos sin perder otros conteos de la página.
- Sin endpoint de lote: no se simula una operación atómica con varias peticiones. Es posible preparar varios conteos y guardarlos individualmente.
- SKU inactivos siguen visibles para auditoría y conteo, identificados como inactivos; no se modifica su activación al contar. La edición del estado del modelo conserva su estado propio.
- El componente se reutiliza también dentro de Variantes en `/admin/catalogo`.
- Sin migraciones, cambios de datos, despliegue ni acceso a Neon.

Revisión visual manual pendiente: inventario vacío y poblado, nombres/SKU largos, filtros, conteos simultáneos, conflicto de versión, historial y pestaña Variantes del catálogo, en móvil (320/390 px), tableta (768 px) y escritorio (1024/1440 px).

Validación: pnpm lint, pnpm typecheck, pnpm test (118 pruebas) y pnpm build correctos. Sin ejecutar pruebas de integración ni Docker. Chunk principal: 115,91 kB gzip. Servidor de desarrollo restablecido tras liberar el bloqueo de Prisma en Windows.
