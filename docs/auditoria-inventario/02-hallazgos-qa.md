# 02. Hallazgos QA

Fecha 2026-10-21, base 1d6f4be. Confirmado = evidencia en código, no incidente demostrado en producción. No hay CRÍTICO confirmado; no es certificación de seguridad.

| ID / nivel | Evidencia y estado | Impacto / probabilidad | Recomendación |
| --- | --- | --- | --- |
| INV-01 ALTO | Confirmado: schema.prisma:33 stock default0; products.ts:9-20 no lo lee/escribe; catalog.ts:4-22 no filtra | Riesgo potencial de ocultar todo con stock>0; alta si ceros heredados | Estado desconocido independiente, conteo real y activación gradual |
| INV-02 ALTO | Confirmado: cartService.ts:6-8 solo ID/cantidad/foto; Product no tiene variantes | Contar fotos mezcla modelos/tallas; alta al introducir stock | SKU estable; foto es atributo, variante default para simples |
| INV-03 ALTO | Confirmado: server/database.ts:20-24 permite DB_TLS_MODE=disable incluso production | Posible conexión sin TLS si servidor lo permite; depende de entorno no inspeccionado | Prohibir disable en prod y probar config; no se afirma que Neon esté sin TLS |
| INV-04 ALTO | Confirmado: server/lib/catalogQueue.ts:2 cola sin cota; repositories/products.ts:28 la usa | Espera/memoria crecientes, trabajo tras timeout HTTP; media con carga | Medir y acotar cola/deadline/cancelación; no eliminar freno sin medir pool |
| INV-05 MEDIO | Confirmado: productService.ts:30-39 pagina catálogo completo; useCart.ts:20,32 lo consume | Cotización cuesta O(N) catálogo, muchas consultas/facetas; alta al crecer | Resolución puntual de IDs/SKUs y paginación admin |
| INV-06 MEDIO | Confirmado: repositories/products.ts:24-46,61-66 cachés 30s e invalidación local | Réplicas pueden servir datos anteriores; media | Versionado compartido/bypass disponibilidad y revalidación en salida |
| INV-07 MEDIO | Confirmado: media.ts:66-74 publicación fuera de guardado; products.ts:66 solo borra BD | Huérfanos; retry complete después de borrar pending no recupera resultado; media | Finalización idempotente, referencias y GC con retención; no borrar por URL arbitraria |
| INV-08 MEDIO | Confirmado: server/index.ts:24 SELECT1 | Ready verde con esquema incompleto; media en despliegues | Gate de esquema/migración y smoke de consulta real |
| INV-09 MEDIO | Confirmado: schema.prisma:33,53-78 y migraciones sin CHECK; pedidos Float; products.ts:66 borrado físico | Futuros writers permiten negativos y pérdida de trazabilidad; FK podría bloquear borrado; condicional | Constraints en inventario, archivo lógico; no activar pedidos heredados |
| INV-10 MEDIO | Confirmado: package.json:17,25; persistence.test.mjs:13 aislado; sin ErrorBoundary/RUM encontrado | Tests con mocks no demuestran carreras SQL, restore o E2E; media | Suite inventario con DB efímera, E2E, alarmas y restore probado |

Las rutas abreviadas cartService/productService/useCart corresponden a src/features/cart/services, catalog/services y cart/hooks respectivamente; products/catalog sin prefijo son server/repositories.

## Observaciones BAJO

Contrato producto .strip() en shared/productSchema.ts:21: descarta extra fields, no los rechaza como usuarios/query. El mapper selecciona campos, por tanto no demuestra mass assignment; nuevos DTO inventario deben ser strict. Evitar que PUT de ficha aparente guardar stock que descarta.

Acoplamiento backend→src/types y monolito HTTP creciente; añadir handlers nuevos sin reescribir auth. No eliminar dependencias sin prueba de uso; no se midió peso de dependencias instaladas. Tablas de pedidos parecen legado inactivo, no deben borrarse sin revisar datos reales.

ILIKE con comodín inicial, COUNT/facetas y orden descuento calculado pueden requerir escaneo; no se observa N+1 por producto. Índices actuales no garantizan optimizar esas consultas: EXPLAIN en entorno representativo antes de trigram/FTS. Product no tiene isActive/publicación: User.isActive no sirve para ocultar fichas.

## Controles favorables

Prisma.sql y parámetros, orden allowlist; búsquedas dirigidas sin rawUnsafe. Scrypt/HMAC, revocación/CSRF y autorización servidor; lock transaccional de usuarios. R2 verifica ETag/MIME/tamaño. Seed exige loopback y rechaza production (server/lib/localSeed.ts:2-6). Limpieza con tolerancia y probes separadas.

.gitignore protege .env, claves/dumps/uploads y CORS privado. git ls-files no devolvió .env/PEM/key/dumps/SQLite rastreados; CORS versionado genérico. Búsqueda dirigida PRIVATE KEY/AKIA sin coincidencias en fuentes/documentación consultadas. No es escaneo exhaustivo ni de historial; no se inspeccionaron secretos reales o paneles. Sin auditoría de dependencias de red en esta sesión.

## Pruebas locales

pnpm lint exit0; pnpm test 85/85, 0 fallos; pnpm typecheck exit0. Pruebas con fixtures/HTTP loopback, no 85 E2E ni cobertura porcentual. Sin integración/Docker/build/seed/migración ni acceso BD. No se hizo build para evitar cargar .env real mediante Vite. Logs locales ignorados y fuera del commit.
