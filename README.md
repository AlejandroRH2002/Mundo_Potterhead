# Mundo Potterhead

Una tienda de catálogo para descubrir productos de Harry Potter y otros universos y preparar una cotización por WhatsApp. La disponibilidad, entrega y precio final se confirman directamente con el negocio. **No hay pagos en línea.**

## Experiencia del cliente

- Buscar productos y filtrar por universo, categoría, subcategoría, ofertas y precio.
- Explorar una galería de hasta ocho imágenes por producto.
- Elegir diseño y talla para añadir un SKU a la cotización; la imagen identifica el diseño y las cantidades se agrupan por SKU.
- Ajustar cantidades, revisar el total estimado y abrir WhatsApp con productos e imágenes seleccionadas.
- Consultar información de contacto, aviso de privacidad y términos de cotización.

El carrito se conserva en el navegador. Antes de enviarlo se consultan nuevamente precios y productos; una imagen retirada de la galería requiere revisar esa selección. Abrir WhatsApp no crea una compra, reserva ni pedido en el servidor.

## Administración

El panel permite gestionar productos, galerías y cuentas de usuarios según los permisos asignados. En **Modelos e importación** se administran diseños, variantes de talla/color, borradores y cargas CSV/Excel con simulación y confirmación. Las imágenes PNG, JPEG y WebP se comprimen antes de subirlas; se puede elegir cuál aparece como principal y asociarlas a modelos o variantes.

Los modelos vendibles se identifican mediante un SKU estable y pueden tener existencias propias e historial de entradas, ventas y ajustes. La fotografía es una referencia visual, no una unidad de inventario. La incorporación es gradual: los conteos pendientes no se interpretan como cero y la restricción pública se activa por separado. Los SKU corresponden a diseño × talla; la imagen pertenece al diseño y cada SKU tiene su propio conteo. No hay reservas ni precios independientes por SKU.

Para reunir fichas compatibles en una familia con diseños y tallas independientes, consulta [Agrupar productos existentes](deploy/PRODUCT-FAMILIES.md). La operación se simula antes de confirmar y conserva pedidos e inventario históricos. La [guía de categorías y release](deploy/CATALOG-RELEASE.md) explica las clasificaciones antiguas, las fotografías de pruebas y el ensayo antes de producción.

## Diseño

Interfaz responsive en crema, burdeos y dorado, con fuentes autoalojadas, navegación por teclado y transiciones ligeras que respetan la preferencia de movimiento reducido.

## Tecnología y estructura

React, TypeScript, Vite, Tailwind CSS y Framer Motion en el frontend. API Node.js con Prisma y PostgreSQL; almacenamiento de imágenes S3 compatible.

| Carpeta | Responsabilidad |
| --- | --- |
| src/app | Rutas, navegación y guards |
| src/features | Funcionalidades, vistas, hooks y servicios |
| src/shared | Componentes y utilidades reutilizables |
| shared | Contratos y taxonomía compartidos |
| server | API, autenticación y persistencia |
| prisma | Esquema e historial de base de datos |
| functions | Integración de API e imágenes en Pages |
| deploy | Documentación operativa y plantillas |

## Desarrollo

Requiere Node.js 24.22.1, pnpm 11.21.0 y una base de desarrollo preparada. Instalar dependencias con pnpm install --frozen-lockfile y ejecutar pnpm dev. La configuración pública de ejemplo está en .env.example; no contiene credenciales reales.

| Comando | Uso |
| --- | --- |
| pnpm dev | Desarrollo local |
| pnpm lint | Revisión estática |
| pnpm typecheck | Comprobación de tipos |
| pnpm test | Pruebas |
| pnpm build:web | Compilar frontend |
| pnpm build:server | Compilar API |

## Documentación

- [Despliegue y operación: Pages, Render, Neon y R2](deploy/CLOUD.md).
- [Manual de inventario](docs/auditoria-inventario/08-manual-administrador-inventario.md).
- [Modelos, variantes, galerías e importación](docs/catalogo/ADMINISTRACION.md).
- [Validación en Neon, integración y despliegue del catálogo](docs/catalogo/DESPLIEGUE.md).
- [Preparación del despliegue de inventario](docs/auditoria-inventario/10-despliegue-seguro.md).
- [Referencia del diseño](deploy/design/FIGMA.md).

Las instrucciones de infraestructura y base de datos se mantienen en la guía operativa. Los entornos privados, claves, bases locales y configuraciones específicas de despliegue quedan fuera de Git.

## Diagnóstico local

Compose publica PostgreSQL en loopback:15432 para evitar reservas de puertos de Windows. Ejecuta pnpm dev:check antes de pnpm dev; el ajuste de puerto es solo en memoria y no modifica .env. No expongas Vite a redes ni túneles públicos.

[Informe de recuperación y revisión de dependencias](docs/security/2026-10-26.md).

[Administración y promociones: uso y despliegue](deploy/PROMOTIONS.md).
