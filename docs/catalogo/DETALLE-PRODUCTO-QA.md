# Detalle de producto: diseño y auditoría enfocada

## Cambios visibles

- Selector de diseños con cuadrícula uniforme, fotografía cuadrada sin deformación, dos líneas de nombre y nombre completo en la etiqueta accesible y ayuda nativa. Borde, marca, hover y foco distinguen la selección. Los diseños sin foto muestran su propio placeholder, sin tomar la foto de otro diseño.
- Relacionados usa las tarjetas existentes en una rejilla independiente, limitada a 280 px por tarjeta. El encuadre mantiene proporción y `object-fit: scale-down` evita ampliar imágenes pequeñas. Se prefieren las miniaturas existentes. Sin resultados no aparece una sección vacía.
- El título comercial combina el nombre del padre y el diseño elegido. General/Único y nombres idénticos no repiten el nombre. El nombre del padre y el diseño siguen identificados por separado. La galería, título de página y Open Graph responden a la selección; canonical, URL e identificadores no cambian.
- En Información general del administrador se aclara cómo editar el nombre del padre sin renombrar diseños ni pedidos históricos. No se cambian nombres reales automáticamente.

## Auditoría y decisiones

| Hallazgo comprobado | Mejora acotada |
| --- | --- |
| Botones flexibles crecen según el nombre del diseño | Componente DesignPicker con pistas uniformes y texto limitado visualmente; nombre completo accesible |
| Rejilla general estira un único relacionado | Rejilla específica acotada; reutiliza ProductCard y su navegación/precios |
| Galería mantiene estado interno aunque el padre ya controla la selección | Galería controlada; una sola selección de imagen |
| Selección, galería y habilitación de los dos CTA viven mezcladas con el marcado | Resolver puro con las mismas reglas de diseño/talla/existencias, probado sin modificar el producto |
| El estado anterior puede aparecer un instante al cambiar el ID de ruta | Estado del hook vinculado al ID solicitado; conserva AbortController |
| Miniaturas de galería usan el archivo grande aun existiendo miniatura | Reutiliza imageThumbnails, conservando el original al elegirlo |
| React 18 avisa por el atributo camelCase fetchPriority | SafeImage emite fetchpriority; política de URL y orígenes intacta |
| El watcher de Windows intenta vigilar las cookies de un perfil de QA bajo .tools y falla con EBUSY | Excluir esa carpeta local del watcher, sin ampliar permisos de archivos o interfaces de red |
| Estilos model-picker sin consumidor tras extraer el selector | Sustituirlos por los estilos específicos; mantener la matriz de inventario |

No se encontraron consultas adicionales de relacionados al cambiar diseño: el navegador lo verifica y se conserva la petición abortable por producto/categoría/universo. No se añaden memoizaciones, dependencias ni cambios de backend. No se eliminan módulos ajenos ni se alteran validaciones, cantidades o reglas de venta.

## Pruebas reproducibles

`pnpm test` incluye tests/product-detail.test.mjs: diseño único/múltiple, nombres largos, selección de talla/SKU, galería, títulos, productos antiguos, agotados, relacionados 0/1/2/4 y accesibilidad del marcado. La suite existente conserva pruebas de carrito y WhatsApp.

Con Chrome o Edge **ya instalado**, ejecutar:

```powershell
pnpm test:product-ui -- --browser "<ruta al ejecutable instalado>"
```

El script no descarga navegadores ni usa una base de datos. Arranca Vite con API e imágenes sintéticas locales en un puerto efímero; bloquea peticiones externas y no abre WhatsApp. Usa un perfil desechable bajo .tools, ajeno al perfil personal, y lo retira al terminar. No carga fotografías de R2 ni modifica productos reales o .env.

La prueba en Chrome verifica 320, 360, 390, 768, 1024 y 1440 px: dimensiones uniformes, ausencia de desbordamiento horizontal, relacionados con 0/1/2/4 resultados, imagen sintética de 24 px sin ampliación, foco visible, Enter/Tab, cambio de diseño/galería, talla, SKU correcto y texto de WhatsApp. Comprueba también la persistencia del carrito al recargar, canonical estable y Open Graph/título actualizados. Las excepciones de aplicación hacen fallar el test; solo se exceptúa la cancelación conocida del socket de desarrollo de /@vite/client durante las recargas forzadas con HMR deshabilitado. Es una comprobación real del DOM y geometría en navegador; no una comparación de capturas ni una medición de rendimiento de producción.

## Antes de publicar

Revisar el preview de la PR en móvil y escritorio con fotografías reales: legibilidad de nombres largos, selección, tallas, galería, tamaño de una sola tarjeta relacionada y cotización. Confirmar el nombre comercial deseado editando el padre desde Información general; esa decisión no la realiza este cambio.

Ejecutar lint, typecheck, test, build y build:web, revisar CI/CodeQL y aprobar la PR. Después, fusionar y publicar el frontend mediante el proceso habitual de Pages. No hay migraciones, semillas ni cambios de API necesarios. El agente no fusiona ni despliega producción. Los metadatos por selección siguen siendo propios de la SPA y requieren JavaScript, como antes.
