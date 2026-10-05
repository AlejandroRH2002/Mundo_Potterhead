# Auditoría y seguimiento operativo

Fecha: 5 de octubre de 2026. Alcance: código de frontend, API, persistencia, archivos, configuración y CI; comprobaciones HTTP públicas sin sesión. No se ejecutaron Docker, integración, carga, restauraciones ni inspección visual con navegador. No se modificaron secretos ni bases de datos.

## Estado comprobado

| Área | Evidencia y límite |
| --- | --- |
| Entrega visual | Commit 6107a3e en main: barrido burdeos/dorado entre rutas, navegación fija, movimiento reducido respetado. En la primera comprobación Pages aún servía CSS anterior. Confirmar ese commit en el despliegue de producción. |
| Frontend | Rutas secundarias diferidas y AnimatePresence; lint y 83 tests pasan. Build web y completo pasan. Principal: 99,95 kB gzip frente a 99,93 kB anteriores (+0,02 kB, unidades del build). |
| API pública | Inicio, health/live, health/ready y listado: HTTP 200; admin/users anónimo: 401. Muestras individuales entre 152 y 513 ms; no representan percentiles ni arranque en frío. |
| Autenticación | Servicios, guards, cookies, validaciones y limitador existentes conservados. La prueba anónima no verifica login, atributos de cookies ni autorización con sesión en producción. |
| Base de datos | Prisma limita conexiones, establece timeouts y TLS de producción. Readiness ejecuta SELECT 1: una BD conectada puede tener migraciones pendientes. |
| Archivos | Flujo R2 de firma, publicación y galería existente. Falta una prueba periódica de una imagen publicada y una comprobación manual de subir/guardar/editar. |
| Logs | Registro estructurado con código, estado y duración. No sustituye un tablero de tasas de errores, latencia y alertas. |
| CI | Instalación congelada, build, lint y tests; también define Docker/integración, no ejecutados localmente. Migración manual depende de verify y entorno seleccionado. |
| Recuperación frontend | No se encontró ErrorBoundary ni instrumentación de errores de navegador/Core Web Vitals en src y scripts. |

## Prioridades

1. **Alta / baja:** confirmar que Pages publica el SHA esperado; después comprobar transición entre inicio, producto, carrito y legales. No confundir push con despliegue terminado.
2. **Alta / baja:** monitor externo del frontend, readiness y listado real cada 5 minutos; alertar tras dos fallos consecutivos. No basta con live para detectar columnas pendientes.
3. **Alta / media:** ErrorBoundary con recuperación accesible y captura de errores de navegador, sin cuerpos, correos, cookies, contraseñas ni URLs firmadas.
4. **Alta / media:** comprobar backups y hacer una restauración aislada documentada; revisar retención según el plan contratado. Esta auditoría no confirma su funcionamiento.
5. **Media / baja:** monitor HEAD de una imagen de referencia y prueba manual de galería tras despliegues que toquen media; nunca guardar tokens de subida en el monitor.
6. **Media / media:** medir Core Web Vitals por móvil/escritorio y plantilla de página; establecer presupuesto de bundle automatizado respecto al baseline del release.
7. **Media / baja:** tablero de 5xx, DATABASE_SCHEMA_OUTDATED, DATABASE_UNAVAILABLE, fallos de media y latencia p95. Propuesta inicial: alertar con 5xx >1% durante 5 minutos y volumen suficiente; ajustar con tráfico real.
8. **Media / media:** probar teclado, foco, contraste y movimiento reducido con navegador; revisar clicks rápidos, Atrás/Adelante y primera carga de una ruta diferida.

## Rutina de operación

- **Cada despliegue:** CI verde, migraciones cuando proceda, SHA publicado en Pages/Render, smoke HTTP y revisión manual de login, catálogo, galería, cotización y WhatsApp.
- **Diario:** revisar alertas y errores; distinguir indisponibilidad persistente de despertar de servicios. No usar un monitor para evitar suspensión sin verificar las condiciones del proveedor.
- **Semanal:** comparar latencias en frío/caliente, conexiones de BD, almacenamiento y bundle; revisar fallos de upload y errores del navegador cuando exista captura.
- **Mensual:** restauración aislada según política, dependencias y revisión de permisos; no ejecutar seed ni reset contra producción.

Ejecutar desde el proyecto: pnpm smoke -- --url https://<tienda>. El resultado puede dejar cookies y guard SPA como pendientes manuales: no implica que se hayan validado. Configurar avisos a una persona responsable; este documento no activa ningún servicio externo.

Para rendimiento usar PageSpeed Insights y DevTools sobre inicio, listado y detalle. Objetivos al percentil 75 de visitas reales: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1; separar móvil/escritorio. Fuente: [Web Vitals de Google](https://web.dev/articles/vitals). Una medición de laboratorio no reemplaza datos de usuarios. La instrumentación futura debe minimizar datos y revisarse junto al aviso de privacidad.

## Límites funcionales actuales

El carrito cotiza por WhatsApp y no reserva stock ni cobra. Fotos diferentes permiten identificar la selección, pero no sustituyen un inventario por modelo/talla. La suscripción local no envía correos. Estas funcionalidades requieren trabajos separados.

## Revisión manual de esta entrega

Inicio → catálogo → detalle → carrito → privacidad → términos; repetir en móvil y escritorio, con teclado, Atrás/Adelante, rutas todavía no cargadas y movimiento reducido. Verificar que la cortina no tapa navegación, no produce saltos ni bloquea el drawer. No se ha observado el resultado renderizado.
