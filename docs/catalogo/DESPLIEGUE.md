# Integración y despliegue del catálogo

## Estado y estrategia

Trabajo en `fix/security-node-oct-2026`; no hay modificaciones directas en main. Esta rama incluye también las correcciones anteriores de seguridad e inventario. Revisar el conjunto en la PR, no solo la interfaz nueva.

Migraciones que ya se habían probado/aplicado localmente:

1. `20261021000000_model_inventory` — modelos e historial inmutable.
2. `20261026000000_sized_skus_search` — SKU por talla y búsqueda; incluye la corrección del delimitador SQL `$$`.

Nueva migración: `20261026010000_catalog_management` — códigos/estado/revisión del producto, galerías de modelo, color/galería/actividad del SKU e historial de importaciones. Probada dos veces en PostgreSQL temporal y aplicada a la BD local después de un respaldo de 32434 bytes restaurado satisfactoriamente en una instancia aislada. La comparación de identificadores, saldos, movimientos y referencias de pedidos antes/después fue idéntica. `pnpm catalog:check` local no detectó pendientes, checksums incompatibles, duplicados ni huérfanos.

Neon NO fue consultado ni modificado. Su historial y sus pendientes son desconocidos hasta validar el destino autorizado. No asumir que el resultado local acredita producción.

Es una expansión: se mantienen columnas heredadas, IDs, tablas de pedidos, saldos y movimientos. La unicidad pasa de modelo/talla a modelo/talla/color; el color vacío mantiene el comportamiento anterior, y un índice normalizado evita duplicados por mayúsculas/espacios. No hay renombrado de tablas, reset, borrado de datos ni fase contract en este release. El trigger sincroniza status/archived y mantiene revisiones también para escritores anteriores.

**Límite de compatibilidad:** main anterior al inventario no conoce borradores ni colores. No habilitar el nuevo editor/importador hasta que todas las réplicas de la API nueva estén listas. Volver a esa API antigua después de crear borradores podría exponerlos; no es un rollback funcionalmente equivalente. El rollback ordinario debe ser a un artefacto compatible con inventario/estados, con las escrituras administrativas deshabilitadas temporalmente si es necesario.

## 1. Validación en una rama aislada de Neon, antes de fusionar

1. En Neon Console, seleccionar el proyecto, **Branches → New branch**, elegir como padre la rama de producción y crear una rama de ensayo. Verificar nombre, ID y que el endpoint sea diferente de producción. Restringir acceso: contiene una copia de datos reales. No usar Reset/Restore sobre la rama padre. Neon documenta que una rama hija puede modificarse sin afectar al padre: [administración de ramas](https://neon.com/docs/manage/branches).
2. Obtener su conexión **directa** (sin `-pooler`) con `sslmode=require`. Inyectar esa conexión como DATABASE_URL y DIRECT_DATABASE_URL en un runner/terminal privado; NODE_ENV=production y DB_TLS_MODE=require. No editar el .env del proyecto, copiar conexiones en capturas ni pegarlas en comandos versionados. Para el backend de staging, usar un SESSION_SECRET propio, APP_ORIGIN de staging y almacenamiento de pruebas.
3. En ese runner, seleccionar Node 24.22.1 y pnpm 11.21.0; checkout de la rama de trabajo, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm build:web`.
4. Ejecutar `pnpm catalog:check`. Antes de migrar puede terminar con código 1 por pendientes; revisar su JSON: pending enumera nombres, failed/checksumMismatch deben estar vacíos e integrity debe ser cero. No continuar con una migración fallida o un checksum distinto. No usar migrate resolve para ocultar un caso desconocido.
5. Confirmado que AMBAS conexiones apuntan a la rama hija, ejecutar `pnpm db:migrate`; repetirlo y comprobar que no hay nuevas operaciones. Después ejecutar `pnpm catalog:check`: debe terminar con código 0, sin pendientes ni anomalías. Este comando solo lee y no imprime conexiones ni datos de clientes.
6. Arrancar una API de staging con esa rama y comprobar readiness, login/roles, listados, edición/reapertura, dos modelos con tallas/colores, imágenes, importación repetida y ledger. La suite `pnpm test:integration` prueba una BD Docker desechable; NO apunta a Neon y no reemplaza esta prueba de staging.
7. Registrar commit, nombres de migración, fecha, resultado y aprobador. Esa evidencia falta todavía; bloquear la publicación hasta obtenerla.

## 2. Respaldo recuperable antes de producción

Configurar la política de backups/retención del plan de Neon y obtener un dump privado con una versión de pg_dump compatible con el servidor. Inyectar la conexión de lectura mediante PGDATABASE en el runner privado, sin escribir el secreto en la línea de comandos:

```sh
pg_dump --format=custom --file=neon-before-catalog.dump
pg_restore --list neon-before-catalog.dump
```

La lista no demuestra una restauración. Cambiar PGDATABASE a otra base aislada vacía, confirmar su identidad y ejecutar `pg_restore --exit-on-error --no-owner --no-privileges neon-before-catalog.dump`. Comprobar integridad, cantidades y referencias allí. No ejecutar --clean ni restaurar encima de producción. Cifrar/guardar el respaldo fuera de Git, registrar checksum y ensayo de recuperación, y acordar RPO/RTO. Una rama hija facilita ensayos, pero no sustituye una política de backups independiente.

## 3. Pasos para preparar y fusionar la Pull Request

1. Revisar los commits locales y el [listado de archivos](ARCHIVOS.md). `.env`, respaldos, binarios de herramientas y configuración privada no se incluyen.
2. Tras aprobar la publicación de código, ejecutar `git push origin fix/security-node-oct-2026`. Abrir una PR **borrador** hacia main usando [PR.md](PR.md); no se publicó esta tarea automáticamente.
3. Exigir CI verde, revisión de código y evidencia del ensayo de Neon hijo. Revisar también los cambios previos de inventario/seguridad presentes en la rama. Preparar los artefactos de frontend/backend del SHA aprobado y probarlos antes del corte.
4. Revisar/suspender los auto-deploys de Pages y Render antes del merge: la fusión no debe arrancar un backend que exija columnas todavía ausentes. No activar el job migrate ni aprobar un environment production como parte de una prueba casual.
5. Obtener aprobación explícita para producción. Fusionar la PR por el procedimiento del repositorio y anotar el SHA definitivo. Si cambia el contenido después de staging, repetir las validaciones que correspondan.

## 4. Orden de producción aprobado

1. Build reproducible de los artefactos aprobados; mantener la versión actual atendiendo tráfico. Preparar rollback compatible.
2. Respaldo y restauración aislada verificados; confirmar destino directo de producción y ventana de cambios. Sin imports ni edición concurrente durante el corte.
3. Aplicar `pnpm db:migrate` desde el runner aprobado con las conexiones de producción. Solo migrate deploy; nunca reset, db push, seed ni restauraciones sobre la base activa. Ejecutar `pnpm catalog:check`.
4. Desplegar API nueva en Render y esperar a que TODAS las réplicas y /health/ready estén listas. Mantener INVENTORY_MODE=capture. Comprobar compatibilidad del catálogo con el frontend anterior, roles, cookies y media. No hacer bootstrap de nuevo para esta actualización.
5. Desplegar frontend en Pages y habilitar el nuevo editor/importador para administradores. Revisar imágenes reales de R2, selección talla/color, carrito y WhatsApp; después hacer una importación pequeña real con datos revisados. Verificar trazabilidad y reintento.
6. Reactivar despliegues automáticos según la política acordada. Vigilar errores 5xx/409, latencia de importaciones, conexiones/locks y readiness. No se promete un corte sin interrupciones: ALTER TABLE y DDL pueden esperar bloqueos; ensayar duración y reducir actividad administrativa durante la migración.

No hay variables nuevas obligatorias de aplicación: se reutilizan las de PostgreSQL, sesión, origen y S3/R2. Las bibliotecas de archivos se cargan de forma diferida en administración. Una base Neon dormida o lotes de alta latencia pueden superar los límites; reintentar idempotentemente o reducir filas, sin aumentar timeouts indefinidamente.

## 5. Recuperación

Si migrate deploy falla, detener el rollout y revisar privadamente la causa y el registro de migración. El SQL nuevo está dentro de BEGIN/COMMIT; confirmar el rollback real antes de marcar un intento como rolled-back. No editar migraciones ya aplicadas ni sus checksums; publicar una corrección incremental cuando corresponda.

Si falla la aplicación con la migración aplicada, conservar las columnas nuevas y volver al último artefacto compatible; no ejecutar una migración inversa que borre colores, SKU o historial. No volver al main antiguo sin un plan para ocultar borradores y detener nuevas operaciones. Si existe daño de datos, restaurar en una base separada, comprobar integridad y recuperar selectivamente bajo mantenimiento y aprobación; nunca sobrescribir la rama productiva automáticamente.

Un cambio de datos importado se corrige con un ajuste trazable o una edición nueva. No borrar movimientos ni deshacer un lote confirmado mediante DELETE. Si se perdió una respuesta, consultar historial y reintentar antes de crear un ajuste compensatorio.
