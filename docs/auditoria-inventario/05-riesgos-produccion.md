# 05. Riesgos de producción

Fecha 2026-10-21. No se accedió a paneles/BD/bucket. Medidas propuestas, no se afirma que estén activas.

| Riesgo | Prevención y comprobación | Recuperación |
| --- | --- | --- |
| Ocultar todo por ceros heredados | Saldo desconocido separado, CAPTURE sin filtro, conteo real por SKU y reporte | Volver CAPTURE; revisar elegibilidad sin fabricar saldo |
| Pérdida o DDL largo | SQL incremental revisado, ensayo aislado, medir locks/volumen; backup y restore probado | Detener rollout, diagnosticar estado Prisma sin reset; conservar nuevas tablas |
| Release mixto Pages/Render/Neon | Expand API primero, UI compatible después; modo backend y writer único | Rollback compatible y bloqueo de escrituras incompatibles |
| Negativo/doble descuento | Idempotencia, constraints, lock por SKU, saldo+ledger atómicos | Reconciliar y compensar aprobado; no editar historia |
| Venta externa no registrada | Acordar responsable y momento de salida; WhatsApp no reserva | Conteo y conciliación; no prometer garantía de stock externo |
| R2/BD separados | Introducir stock sin mover/borrar assets; modelos independientes de URL | Recuperar asociación; GC solo tras retención/referencias verificadas |
| Pool y despertar Neon | Verificar límite real: (pool +1 probe) × réplicas más CI/operación; migrador1 conexión | Retries acotados/diagnóstico; no subir pool arbitrariamente |
| Cola/timeouts | Medir en entorno aislado, límites/cancelación | Limitar carga y rollback funcional |
| Cachés de réplicas | Versión compartida o bypass; toda salida verifica en BD | Nunca garantizar saldo desde lista cacheada |
| Config cloud desconocida | Confirmar APP_ORIGIN, TLS, proxies/IP confiable, _pending privado, CORS PUT/Content-Type y binding | Procedimiento privado de configuración; sin secretos en logs |
| Backup/restore defectuoso | Probar restore fuera de producción y documentar corte/retención | Recuperar separado y conciliar movimientos posteriores; no sobrescribir a ciegas |
| Borrado histórico | Archivo lógico y FKs RESTRICT; impedir remove antiguo con historial | Preservar ledger/saldo y corregir estado de archivo |

## Secuencia futura (NO ejecutar aquí)

1. Aprobar reglas, responsables, ventana, criterios de detener y recuperación.
2. Confirmar BD/rama Neon y destino migrador; acceso/restore en entorno aislado. No compartir conexiones en chats o commits.
3. CI/SQL/compatibilidad desde esquema anterior; medir locks, filas y recursos; sin producción para pruebas.
4. Build revisado → migración expand aprobada → start API CAPTURE → UI. El YAML exige workflow_dispatch y migrate=true; protección real/aprobadores de entorno se verifican en GitHub.
5. Backfill dry-run/idempotente y conteos privados sin datos personales. Comparar productos/IDs/fotos/precios y elegibilidad antes/después.
6. Activar enforcement solo tras aprobación del reporte. No retirar Product.stock ni tablas Order en ese release.
7. Smoke público read-only y prueba admin controlada bajo autorización: catálogo/facetas, agotados/repone, cotización sin descuento. Resultados sin secretos.

## Rollback

Detener nuevas salidas si el saldo es inconsistente; consultar operación idempotente. Desactivar enforcement restaura visibilidad comercial anterior, pero puede mostrar agotados: requiere decisión consciente. Mantener tablas/saldos/ledger. API antigua solo con escrituras incompatibles bloqueadas y proceso manual acordado: su remove físico puede violar FKs o trazabilidad. Restore es último recurso con conciliación; una migración fallida se diagnostica y resuelve explícitamente, nunca migrate reset/seed remoto.

## Monitoreo requerido

Frontend, ready y consulta real de catálogo; esquema/5xx/latencia p95/cola/conexiones; conflictos, reintentos, diferencias ledger-saldo, pendientes de conteo y productos elegibles. Baseline y umbrales antes del rollout, no métricas inventadas. Render: health/reinicios/revisiones; Neon: conexión/backups; Pages: SHA/bindings; R2: CORS/permisos/lifecycle/huérfanos. No asumir planes o retenciones. Excluir tokens, correos, cuerpos y URLs firmadas de logs. Ver deploy/MONITORING.md como antecedente, no como prueba de configuración real.
