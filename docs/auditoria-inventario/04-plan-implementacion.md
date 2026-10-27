# 04. Plan sujeto a aprobación

Nada implementado. Etapas en orden; cada PR debe tener pruebas y rollback, sin mezclar rediseños visuales o refactor de auth.

| Etapa / objetivo | Archivos o módulos y cambios | Dependencia / riesgo | Pruebas y aceptación |
| --- | --- | --- | --- |
| 0. Reglas | Aprobar decisiones del resumen, modelo/talla, salida y mapeo fotos | Propietario; ambigüedad de diseños | Ejemplo de dos diseños y artículo simple aceptado |
| 1. Gates | server/database.ts, smoke-lib/CI/deploy; TLS obligatorio prod, esquema/backup | 0; acceso/restore no probado | Rechazo config insegura, esquema viejo detectado, restore aislado |
| 2. BD expand | prisma/schema.prisma y nueva migración incremental; variantes/saldos/operaciones/ledger/publicación | 1; locks DDL/FKs | Ensayo desde esquema anterior; datos intactos; CHECK/FK/unique; no aplicar aquí |
| 3. Backfill | server/scripts/backfillInventory.ts propuesto; lotes/dry-run/reporte | 2; duplicar SKU/inventar stock | Repetir/reanudar sin cambios duplicados; saldo desconocido |
| 4. Dominio | shared/inventorySchema.ts; services/repositories inventory nuevos | 2; lost update/doble salida | Saldo+movimiento atómico, negativos rechazados, última unidad concurrente |
| 5. API admin | Nuevos handlers /api/admin/inventory y /operations, reutilizar guards/CSRF | 4; permisos/reintentos | 401/403; extra fields400; actor revocado; misma clave/body idempotente, otro body409 |
| 6. Captura admin | Nueva feature inventory y admin-products: modelos/tallas, conteos/historial y ajustes | 3-5; contar fotos erróneamente | Carga/error/vacío, teclado/móvil; motivo/versión; agotados y pendientes consultables |
| 7. Público | repositories/catalog/products, contratos; EXISTS y endpoints admin separados | 4-6; ocultar todo/facetas erróneas | Total/páginas/facetas coherentes; oculto404 público, visible admin; CAPTURE sin ocultar |
| 8. Carrito SKU | cartService/useCart/ProductDetail, validación puntual sin pedidos | 7; localStorage antiguo | Elección modelo/talla, duplicados agregados, precios servidor, WhatsApp sin descuento |
| 9. Rendimiento | serialQueue/cachés/resolución IDs/índices medidos | 7-8; pool/saldos obsoletos | Carga aislada, cola acotada, presupuesto acordado; salida no confía en caché |
| 10. QA staging | tests aislados PostgreSQL e E2E, fallos/retries/reinicio | 2-9; mocks no prueban SQL real | Constraints, carreras, idempotencia tras timeout, varios SKU, reconciliación y restore |
| 11. Captura rollout | deploy/CLOUD, build→migrate→API CAPTURE→UI; conteos reales | Restore y writer único; releases mixtos | Conteos/mapeos aprobados; fichas/fotos/precios intactos; pendientes publicados identificados |
| 12. ENFORCE | Activación backend aprobada, smoke/admin controlado | 11; caché/agotados | Agotado oculto público, admin conserva/repone; reposición solo reaparece publicado |
| 13. Rollback/seguimiento | Volver CAPTURE/OFF compatible; bloquear writers antiguos; no borrar ledger | 12; ventas durante pausa | Ensayo sin DROP/reset, reconciliación; retirar stock legado solo después |

## Casos mínimos

- NULL→0/positivo con OPENING único; repetición y versión vieja.
- Negativo/decimal/overflow/ID ajeno/motivo ausente.
- Dos admins/última unidad; dos SKUs en orden inverso y deadlock/retry.
- Respuesta perdida después de commit, retry con misma clave y body distinto.
- Actor desactivado o rol revocado; CSRF y cliente en endpoints admin.
- Editar ficha/galería no reinicia saldo; archivo conserva historial.
- Publicado/borrador/archivado, agotado/pendiente/variante inactiva combinados con filtros/facetas/detalle.
- Carrito antiguo, imagen retirada, mismo SKU desde fotos distintas y agotado durante cotización.
- Cancelación sin salida sin efecto; devolución física compensatoria única; WhatsApp no consume.
- Ledger=saldo; migración desde anterior, rollback y restore aislado.

No se fija calendario o esfuerzo sin conocer número real de SKU y reglas aprobadas. Integración futura exclusivamente en BD efímera/aislada; producción no es entorno de test.
