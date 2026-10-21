# 09. Pruebas y resultados

Ejecución local 2026-10-21, rama feat/inventario-modelos. Resultados reales, no extrapolados a producción.

| Comprobación | Resultado |
| --- | --- |
| pnpm lint | Exit0 |
| pnpm typecheck | Exit0 |
| pnpm test | 95/95 pasan; 0 fallos, cancelados o saltados |
| pnpm build:web | Exit0; chequeo de secretos del cliente pasa |
| pnpm build:server | Exit0, API independiente compilada |
| prisma validate | Exit0 con DATABASE_URL temporal de localhost no conectada |
| prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | Exit0; generación local de DDL sin aplicar cambios |
| node --check tests/persistence.test.mjs | Exit0; solo sintaxis, NO ejecución SQL |
| git diff --check | Sin errores de espacios; finales de línea normalizados en archivos tocados |

Bundle principal:318,83 kB, gzip100,51 kB (unidades decimales del build). Módulo de inventario cargado por React.lazy. No se abrieron archivos generados de dist. Generar Prisma/compilar usa herramientas instaladas; no instala librerías ni modifica credenciales. Las herramientas pueden cargar .env internamente, pero no se abrieron o imprimieron sus valores ni se editó el archivo. Sin conexiones a BD para validate/generate/diff.

## Cobertura nueva ejecutada

- Pendiente→conteo cero/positivo, no copiar stock histórico; conteo inicial repetido rechazado.
- Entradas, ventas de una/varias unidades, saldo insuficiente, ajustes con motivo/versiones, límites/negativos/decimales.
- Zod estricto, paginación, campos extra, configuración capture/enforce y gate de pendientes.
- Varios modelos, modelo agotado, suma de cantidades repetidas por SKU y disponibilidad pendiente.
- Cotización no modifica cantidades; nombre/SKU/imagen y enlace de producto en WhatsApp.
- Carrito por modelo, límite conocido, modelos ambiguos de carrito antiguo y eliminación de línea correcta.
- SQL público tiene predicado de disponibilidad; admin lo omite, capture no lo activa.
- API HTTP local:401/403, admin permitido, CSRF y campos extra rechazados, quote excesiva409 y válida200.
- Fixture transaccional: reintento devuelve mismo movimiento, distinto payload409, última unidad con cola de fixture y rollback si falla inserción. Esto prueba flujo del repositorio contra el doble de prueba, NO locks ni aislamiento PostgreSQL.
- Las85 pruebas anteriores siguen pasando; se adaptó el mock SQL del catálogo para incluir la carga de modelos, sin reducir sus aserciones.

## Integración PostgreSQL preparada, NO ejecutada

Se extendió tests/persistence.test.mjs, ya usado por el runner aislado/CI. Gate MP_ISOLATED_TEST_DB=true preexistente impide ejecución accidental normal. Casos añadidos: conteo/entrada/venta/ajuste, dos salidas simultáneas de última unidad, mismo key concurrente, body diferente, constraints negativos, trigger de fallo temporal para probar rollback saldo+ledger, ledger inmutable, lectura/historial, varios modelos, agotado total/parcial, reposición, facetas/listado en enforce, archivo/reaparición, quote sin descuento y actor desactivado.

No hay PostgreSQL local identificado en PATH; se respetó la restricción vigente de no ejecutar Docker/test:integration. No se usó Neon como sustituto. Debe correr en CI/staging con el runner desechable antes del release: pnpm test:integration (en entorno donde Docker esté autorizado). El script existente crea su propia BD y credenciales temporales, sin usar la BD productiva. No ejecutar persistence.test directamente con DATABASE_URL de Neon.

La validación/generación de DDL no demuestra que el SQL handwritten, triggers y locks funcionen en PostgreSQL real. No se aplicó migración alguna ni se ensayó restore. La implementación NO está aprobada para producción hasta cerrar esas pruebas.

## QA visual pendiente

Navegador no utilizado ni instalado. Revisar320/360/390/768/1024/1440px: tarjetas/acciones admin, selección de galería/modelo, foco al gestionar, confirmación y bloqueo de duplicados, filtros/historial/páginas, feedback, agotado/repuesto y carrito antiguo. No declarar E2E móvil aprobado por pasar tests estáticos.

## Incidencias durante desarrollo

Se corrigió una construcción TS no soportada por Node strip-only y el mock del catálogo. Una corrida posterior sufrió timeouts de transporte Vite después de una demora prolongada del entorno; repetición final sin builds concurrentes terminó95/95. El resultado final no elimina la necesidad de estabilidad del runner en CI.

## Riesgos anteriores fuera de alcance

Cola de catálogo sin límite explícito, TLS desactivable por configuración, tareas de media/BD no atómicas y backups/permisos de panel no verificados permanecen según auditoría. El cambio mejora disponibilidad de catálogo/quotes y archivo histórico, pero no declara resueltos todos los hallazgos originales.
