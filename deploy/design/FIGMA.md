# Adaptación de Figma: Mundo Potterhead

Fuente: https://www.figma.com/design/wcFDwnHoXVd0Xn9qkwK0TB/Mundo_Potterhead?node-id=0-1

## Frames inspeccionados

| Vista | Escritorio (1440 px) | Móvil (390 px) | Entrada de la SPA |
| --- | --- | --- | --- |
| Inicio | 5:13845 | 5:14098 | / sin filtros |
| Productos | 5:14280 | 5:14592 | /#catalogo y /?… |
| Otros universos | 5:14740 | 5:14916 | /otros-universos; sus query params conservan el catálogo |
| Contacto | 5:15042 | 5:15177 | /contact |

## Tokens y componentes

Fondo #f8f3ea, papel #ffffff, burdeos #65111a, oscuro #2a090d, dorado #d5a62e, texto #171315, texto secundario #6f6668 y borde #e7deda. El dorado de texto pequeño sobre crema se oscurece a #856109 para legibilidad. Cormorant Garamond Bold para títulos e Inter variable para texto, autoalojadas en public/fonts con sus licencias OFL; font-display: swap. No hay fuentes remotas durante la visita.

StorefrontShell limita los tokens a Inicio, Productos, Otros universos y Contacto. ResponsiveArtwork conserva imágenes distintas para móvil/escritorio, atributos de tamaño de la fuente y espacios reservados por los contenedores. Los SVG se sirven como archivos originales, sin modificar sus dimensiones raíz. figmaAssets registra los assets locales por frame; figmaAssetDimensions registra tamaños de fuente. El formato real de las fotos de Figma es JPEG aunque las URLs temporales terminaban en .png: se guardaron con extensión .jpg. Nunca se utiliza una captura del frame como página.

Se reutilizan ProductCard, useCatalog, CatalogFilters, Subscription, Button, Breadcrumbs, navegación, ScrollManager, auth y carrito. StorefrontHome es diferido. Las fotos de productos, precios, descuentos, conteos y disponibilidad se obtienen del contrato real de la API; no se insertan las muestras de producto de Figma. El filtro móvil conserva dialog, foco y Escape; las FAQ usan details/summary nativos.

## Adaptaciones de negocio

No se muestran Visa/Mastercard/PayPal, pagos protegidos, envío gratis, plazos garantizados, condiciones de cambios inventadas, favoritos sin funcionalidad ni búsqueda de pedidos inexistentes. Se conserva MXN. La suscripción sigue siendo una simulación local, explícita y sin envío de correos. ContactForm prepara un mensaje para WhatsApp, con correo opcional; no crea pedidos, no persiste consultas y no envía correo. Los datos de contacto reales proceden de VITE_*. El mapa configurado sigue visible en contacto. Las colecciones Star Wars/Marvel/etc. enlazan a la búsqueda existente dentro de otros universos; no se amplía la taxonomía del backend.

## Revisión manual pendiente

No se instaló ni utilizó un navegador para verificar el render. Las capturas de referencia de Figma sí se inspeccionaron. Revisar Inicio, Productos con filtros/búsqueda/orden/paginación, Otros universos y Contacto en 320, 360, 390, 768, 1024 y 1440 px. Comprobar ausencia de scroll horizontal, proporciones/crops desktop y móvil, estados carga/error/vacío con API real, formulario de consulta, mapa y enlaces configurados, drawer de filtros y carrito, Tab/Shift+Tab/Escape, foco visible, zoom 200%, movimiento reducido, navegación Atrás/Adelante y retorno al catálogo. Verificar además que login/admin/carrito mantienen sus funciones y presentación anterior fuera del alcance visual.

Las pruebas estáticas preexistentes sobre el hero con banner.jpg y la antigua portada necesitan revisarse antes de exigir identidad con ese diseño anterior. No se ejecutó la suite de tests en esta revisión. Lint, typecheck y build:web sí se comprobaron.

Fuentes originales: https://github.com/CatharsisFonts/Cormorant y https://github.com/rsms/inter. Las licencias distribuidas están en public/fonts.
