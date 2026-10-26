# Verificación local — 26 de octubre de 2026

| Comprobación ejecutada | Resultado |
| --- | --- |
| Node de verificación / pnpm | 24.22.1 / 11.21.0 |
| pnpm install --frozen-lockfile | Correcto |
| pnpm lint | Correcto |
| pnpm typecheck | Correcto |
| pnpm test | 110 pruebas, cero fallos |
| pnpm build | Correcto; frontend, backend y control de secretos |
| pnpm build:web | Correcto; control de secretos correcto |
| pnpm test:integration | 11 pruebas, cero fallos, PostgreSQL temporal |
| docker build + test:integration --image | Correcto; 11 pruebas, readiness, usuario sin privilegios y SIGTERM controlado |
| pnpm audit --prod / pnpm audit | Cero alertas en ambos |
| pnpm catalog:check local | Sin pendientes, fallos, checksums incompatibles, duplicados ni referencias huérfanas |
| Respaldo local previo | 32434 bytes; checksum comprobado y restauración aislada satisfactoria |
| Comparación tras migrar localmente | IDs, saldos, movimientos y referencias de pedidos conservados |
| HTTP local | Readiness, catálogo y frontend 200; administración sin sesión 401 |

Salida de Vite (kB decimales, tamaños sin comprimir / gzip):

| Chunk | kB | gzip kB |
| --- | --- | --- |
| index-B2LRYZB6.js | 361.97 | 115.82 |
| catalogFiles-BiPqWqzp.js | 82.73 | 30.16 |
| motionFeatures (hash de build) | 53.04 | 18.55 |
| CatalogManagement (hash de build) | 17.18 | 5.62 |
| Inventory (hash de build) | aproximadamente 12.2 | aproximadamente 4.3 |

Los hashes pueden cambiar al compilar. La referencia previa del principal era 115.67 kB gzip: incremento aproximado de 0.15 kB. El parser de archivos y el importador están diferidos; no se carga XLSX para navegar por la tienda.

## Pendiente y límites

- No se accedió a Neon ni se aplicaron migraciones allí. Ensayo en rama hija y estado real de producción pendientes.
- Sin inspección visual en navegador ni subida real a R2; revisar las pantallas indicadas en el manual, incluyendo móvil, teclado, previews, orden e imágenes de variantes.
- El inventario continúa en capture; WhatsApp no reserva ni descuenta automáticamente. No se activó enforce.
- No se enviaron correos, no se añadieron pagos ni se crearon pedidos reales.
- No se publicó código, fusionó main ni desplegó. La PR está preparada como texto para revisión; no se abrió remotamente.
- La prueba usa el runtime portátil local; no cambia la instalación global de Node. Seleccionar la versión documentada en terminales y proveedores.
- DDL puede esperar locks y una importación puede alcanzar el timeout con alta latencia; el lote revierte y admite reintento idempotente. Ensayar tiempos en Neon antes de programar el corte.
