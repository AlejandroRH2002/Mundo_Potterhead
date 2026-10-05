# Mundo Potterhead

Catálogo de productos y carrito de cotización por WhatsApp. El sitio no cobra ni procesa pagos: disponibilidad, precio final, entrega y envío se confirman por WhatsApp.

## Stack y arquitectura

React, TypeScript, Vite y Tailwind CSS; API independiente Node.js con PostgreSQL y Prisma.

| Directorio | Responsabilidad |
| --- | --- |
| src/app | Rutas, carga diferida y guards |
| src/features | Catálogo, cuentas, administración, carrito y contenido |
| src/shared | Componentes y utilidades reutilizables |
| shared | Contratos Zod, taxonomía y utilidades compartidas |
| server | HTTP, autenticación, repositorios y almacenamiento |
| prisma | Esquema y migraciones incrementales |
| functions | Proxy de API y lectura de imágenes para Pages |
| deploy | Guías y plantillas genéricas de despliegue |

## Desarrollo local

Requisitos: Node.js 24, pnpm 11.21.0 y PostgreSQL de desarrollo. En Windows, usar pnpm.cmd si PowerShell bloquea pnpm.ps1.

1. Instalar con pnpm install --frozen-lockfile.
2. Copiar .env.example a .env únicamente en instalaciones nuevas; completar los valores localmente. Nunca sobrescribir una configuración existente.
3. Ejecutar pnpm db:generate. Revisar la base de destino antes de ejecutar pnpm db:migrate.
4. Para una instalación nueva, ejecutar pnpm db:bootstrap:local con credenciales privadas temporales y retirarlas después.
5. Opcional: pnpm db:seed:local, únicamente contra una base local de desarrollo.
6. Ejecutar pnpm dev. Frontend: http://localhost:5173; API por proxy /api.

No exponer Vite ni preview a la red ni mediante túneles públicos. No compartir node_modules entre Windows y WSL.

## Funcionalidades

- Catálogo con búsqueda, filtros por universo/categoría/subcategoría, ofertas y paginación; filtros compartibles por URL.
- Detalle con galería, productos relacionados y CTA para añadir a la cotización.
- Carrito local y mensaje de WhatsApp; no se crean pedidos ni pagos en el servidor.
- Autenticación con hashes scrypt, cookies HttpOnly y sesiones revocables; expiración por inactividad y tope absoluto.
- Administración de productos y usuarios con controles de rol y validación compartida.
- Estilo público crema, burdeos y dorado; fuentes autoalojadas y movimiento reducido.

## Imágenes

El administrador selecciona PNG, JPEG o WebP; el navegador redimensiona y comprime antes de subir. En producción se requiere almacenamiento S3 compatible. La URL del endpoint S3 sirve para subir, no es la URL pública de la imagen.

Con R2 privado, Pages sirve /media/products/ mediante el binding PRODUCT_IMAGES. Configurar CORS del bucket para el origen exacto de la tienda y PUT con Content-Type. La plantilla deploy/r2-cors-pages.example.json es genérica: su copia r2-cors-pages.json queda ignorada y se aplica manualmente en Cloudflare.

Las imágenes antiguas inline se sirven por /api/products/:id/image sin incluir Base64 en el listado. pnpm media:migrate-base64 permite migrarlas a objetos: dry-run por defecto; revisar antes de autorizar --apply. Una carga fallida conserva el diagnóstico y bloquea guardar accidentalmente el placeholder.

## Validación y despliegue

| Comando | Resultado |
| --- | --- |
| pnpm lint | Revisión estática |
| pnpm typecheck | Tipado TypeScript |
| pnpm test | Suite de pruebas |
| pnpm build:web | Frontend y comprobación de secretos |
| pnpm build:server | Backend independiente |
| pnpm build | Compilación completa |
| pnpm smoke -- --url https://your-project.pages.dev | Comprobaciones HTTP públicas |

Guía: [Pages + Render + Neon + R2](deploy/CLOUD.md). Orden de release: build → migrate → bootstrap inicial → start. Las migraciones y el bootstrap son acciones explícitas sobre la base de destino, no pasos automáticos de desarrollo.

## Configuración y privacidad

.env.example contiene nombres y valores de ejemplo, nunca credenciales reales. Las variables VITE_* son públicas y requieren reconstruir el frontend al cambiarlas. Credenciales de base, sesión y S3 pertenecen exclusivamente al entorno del backend.

Git ignora entornos privados, dependencias, builds, logs, claves, bases, uploads y configuraciones locales de despliegue. Las reglas de ignore no retiran archivos ya versionados ni eliminan información del historial. Revisar git status y los archivos seleccionados antes de cada commit.

Los textos legales requieren revisión por un asesor; los datos del responsable se configuran con variables públicas. No incorporar datos personales, rutas absolutas locales ni configuraciones reales en documentación o capturas.

## Revisión manual

Revisar inicio, catálogo, detalle, carrito y formularios en móvil/escritorio; navegación al hacer scroll, teclado, foco, movimiento reducido, carga real de imágenes y cotización por WhatsApp. Las compilaciones no sustituyen esa revisión.

### Galería por producto

El administrador puede añadir hasta ocho imágenes en una misma ficha, elegir la principal y quitar imágenes de la galería. El detalle ofrece miniaturas y el catálogo usa la principal. Las fotos pueden mostrar distintos modelos; esta galería no añade todavía selección de modelo/talla ni identifica variantes en WhatsApp. Quitar una foto de la ficha no elimina el objeto de R2.

Migración incremental: 20261005000000_product_gallery. Aplicar con pnpm db:migrate desde el runner autorizado antes de desplegar el backend actualizado. Los productos existentes conservan imageUrl y empiezan sin imágenes adicionales; no hay reset ni migración automática desde la aplicación.
