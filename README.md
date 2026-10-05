# Mundo Potterhead

Una tienda de catálogo para descubrir productos de Harry Potter y otros universos y preparar una cotización por WhatsApp. La disponibilidad, entrega y precio final se confirman directamente con el negocio. **No hay pagos en línea.**

## Experiencia del cliente

- Buscar productos y filtrar por universo, categoría, subcategoría, ofertas y precio.
- Explorar una galería de hasta ocho imágenes por producto.
- Elegir una imagen de referencia y añadirla a la cotización: distintas imágenes de una misma ficha se conservan como líneas separadas.
- Ajustar cantidades, revisar el total estimado y abrir WhatsApp con productos e imágenes seleccionadas.
- Consultar información de contacto, aviso de privacidad y términos de cotización.

El carrito se conserva en el navegador. Antes de enviarlo se consultan nuevamente precios y productos; una imagen retirada de la galería requiere revisar esa selección. Abrir WhatsApp no crea una compra, reserva ni pedido en el servidor.

## Administración

El panel permite gestionar productos, galerías y cuentas de usuarios según los permisos asignados. Las imágenes PNG, JPEG y WebP se comprimen antes de subirlas; se puede elegir cuál aparece como principal en el catálogo.

La elección por imagen permite reconocer visualmente un diseño. Todavía no existe inventario por modelo, selección de talla ni precios independientes por variante. Para esa siguiente etapa se recomiendan modelos con nombres estables y tallas asociadas.

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

Requiere Node.js 24, pnpm 11.21.0 y una base de desarrollo preparada. Instalar dependencias con pnpm install --frozen-lockfile y ejecutar pnpm dev. La configuración pública de ejemplo está en .env.example; no contiene credenciales reales.

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
- [Referencia del diseño](deploy/design/FIGMA.md).

Las instrucciones de infraestructura y base de datos se mantienen en la guía operativa. Los entornos privados, claves, bases locales y configuraciones específicas de despliegue quedan fuera de Git.
