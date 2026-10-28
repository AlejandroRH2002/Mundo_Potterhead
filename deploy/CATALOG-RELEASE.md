# Categorías y familias: prueba y release de la PR #3

## Clasificación sin reclasificar datos existentes

La lista administrada vive en `shared/catalogTaxonomy.ts`, compartida por formularios, API, importador y filtros. Las once categorías son Ropa, Calzado, Mochilas y bolsos, Joyería, Hogar, Accesorios, Coleccionables y juguetes, Regalos y novedades, Papelería, Cocina y bebidas y Otros productos. Cada una incluye Otros y subcategorías dependientes. Tipo de artículo y universo son datos distintos; no usar personajes o casas como categorías.

Se conservan los identificadores `clothing`, `footwear`, `bags`, `accessories`, `toys`, todas sus subcategorías anteriores y las subcategorías nulas. `toys` se amplía como Coleccionables y juguetes; no se crea una categoría duplicada. Algunas clasificaciones antiguas de Accesorios se señalan como anteriores y siguen siendo editables. Cambiar una clasificación exige revisión expresa del empleado; no se ejecuta backfill automático.

PostgreSQL almacena categoría y subcategoría como TEXT, sin enum ni CHECK de categorías. Las reglas SQL de talla admiten Única para cualquier categoría y conservan tallas específicas para Ropa/Calzado. Por ello no se necesita otra migración. Los validadores compartidos rechazan categorías desconocidas y combinaciones inválidas. La compatibilidad de programas anteriores con las categorías nuevas no está garantizada: no crear productos en ellas mientras se esté desplegando una versión mixta.

## Flujo del empleado

1. Crear o elegir el producto padre con precio, descripción y clasificación compartidos.
2. Abrir Agrupar productos existentes y elegir ese destino. Se filtran candidatos por clasificación, universo, precio/oferta y existencias antiguas. Desmarcar Solo compatibles permite ver los motivos de exclusión; los incompatibles no se pueden seleccionar. La simulación comprueba además diseños, fotografías, opciones e historial.
3. Revisar Conflictos que impiden agrupar y Advertencias e información. No hay cambios hasta la confirmación explícita. Modificar destino/orígenes borra las autorizaciones anteriores; modificar el plan requiere otra simulación.
4. Puede agruparse en borrador sin subir fotografías. Sigue oculto del catálogo. Publicar es una decisión separada y exige fotografías y opciones activas completas. Las reglas de existencias vigentes se conservan; no se activa enforce.
5. Abrir la familia resultante y administrar sus diseños y tallas. El precio se almacena en el padre y se consulta desde todos los diseños; cambiarlo no actualiza precios de pedidos antiguos ni cantidades. Los registros de origen se conservan como compatibilidad histórica.

La simulación no convierte imágenes ni hace llamadas a R2. No combina tallas por coincidencia de nombre. No hay desagrupación automática; ver [reglas y límites](PRODUCT-FAMILIES.md).

## Fotografías locales: diagnóstico y prueba aislada

La configuración local revisada tiene MEDIA_STORAGE=inline y no contiene S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PUBLIC_BASE_URL ni credenciales AWS. `/api/media/config`, protegido por sesión administrativa, devuelve enabled=false. La galería necesita almacenamiento de objetos; no sustituye las fotos por Base64. No se intentó subir a un bucket real ni se usaron credenciales productivas.

Preparar un bucket R2 exclusivo de desarrollo y credenciales limitadas a ese bucket. Mantenerlo privado, incluidos los temporales _pending/. Configurar un proyecto Pages de pruebas con la Function existente y el binding PRODUCT_IMAGES apuntando únicamente al bucket de desarrollo. Su API_ORIGIN debe apuntar a una API de pruebas; nunca a producción.

| Variables | Configuración aislada |
| --- | --- |
| MEDIA_STORAGE | s3 en la API local/de pruebas |
| S3_ENDPOINT, S3_REGION, S3_BUCKET | Endpoint S3 HTTPS, región auto y bucket de desarrollo |
| S3_PUBLIC_BASE_URL | Base HTTPS del proyecto Pages de pruebas, terminada en /media |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY | Solo API; credenciales del bucket de desarrollo |
| S3_FORCE_PATH_STYLE | Estilo admitido por el endpoint; no modificar producción para probar |
| AWS_SESSION_TOKEN | Opcional si se usan credenciales temporales |
| SESSION_SECRET, DATABASE_URL | Propios del entorno aislado, sin reutilizar producción |
| APP_ORIGIN | Origen exacto usado por el navegador; localmente, http://127.0.0.1:5173 si se abre esa dirección |
| VITE_API_URL | /api, usando el proxy local existente |
| VITE_IMAGE_ORIGINS | Origen HTTPS del proyecto Pages de pruebas, para admitir sus imágenes en la política del frontend |
| PRODUCT_IMAGES | Binding R2 de Pages al bucket de desarrollo |

No colocar credenciales en variables VITE_. Cambiar las variables públicas exige reiniciar Vite/reconstruir. Guardar los valores privados mediante el gestor del entorno de pruebas, sin sustituir el archivo .env habitual ni subirlos a Git. Estas variables ya existen: no se añaden secretos o variables nuevos.

Configurar CORS del bucket de desarrollo con AllowedOrigins igual a APP_ORIGIN, AllowedMethods con PUT y AllowedHeaders con Content-Type. La autorización y confirmación de la API conservan sesión, Origin y X-Requested-With; el PUT firmado no lleva cookies. Las credenciales necesitan Head/Get, Put/Copy y Delete para validación, publicación y limpieza de temporales. La lectura se hace mediante Pages, que solo sirve products/, no _pending/. [Documentación oficial de CORS R2](https://developers.cloudflare.com/r2/buckets/cors/).

Prueba manual: abrir como administrador, subir PNG/JPEG a un diseño, comprobar miniatura, guardar, recargar, reemplazar y verificar que otro diseño y todas las tallas/conteos/historial siguen iguales. Revisar Network: configuración habilitada, autorización, PUT y confirmación correctos, lectura de miniatura y foto 200. No compartir cookies, tickets ni URLs firmadas en capturas. Limpiar solo objetos desechables identificados que no estén referenciados. Las pruebas automatizadas usan mocks de carga/lectura y referencias de prueba en PostgreSQL; eso no acredita una conexión R2 real.

## Procedimiento controlado: Neon → Render → Pages

Las pruebas de esta ampliación cubren las once categorías y sus subcategorías, clasificaciones antiguas, importaciones CSV/XLSX, candidatos compatibles, borradores sin fotografías, conservación de pedidos y movimientos, precios heredados y rollback. Los mocks de imágenes comprueban permisos, PUT, lectura, miniaturas y fallos. La asignación de fotografías usa la identidad estable del diseño para no sobrescribir otro diseño si cambia el orden durante la carga. No se ejecutaron pruebas end-to-end con navegador ni cargas reales a R2; revisar esos dos puntos manualmente en el entorno aislado.

Nada de lo siguiente se ejecuta automáticamente por esta PR.

1. Antes de fusionar, revisar CI y CodeQL. Desactivar temporalmente los despliegues automáticos de producción para coordinar el orden: Render Settings → Auto-Deploy → Off; Pages Settings → Build → Branch control → desmarcar Enable automatic production branch deployments. No modificar bindings ni secretos productivos para hacer pruebas. Consultar [Render](https://render.com/docs/deploys) y [Pages](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).
2. En Neon, crear una rama aislada desde el punto que se desea ensayar; verificar explícitamente proyecto, rama y base antes de copiar la conexión. Una rama copiada puede contener datos personales: restringir acceso y no usarla en demos públicas. Usar credenciales y R2 de pruebas; comprobar respaldo y restauración. [Administración de ramas Neon](https://neon.com/docs/manage/branches).
3. Configurar el environment staging de GitHub con DIRECT_DATABASE_URL de esa rama aislada: conexión directa con sslmode=require. No pegarla en documentación, issues ni logs. La Actions existente ejecuta solo migrate deploy, con NODE_ENV=production y DB_TLS_MODE=require. El workflow actual solo permite ejecutar migrate desde la rama predeterminada main. Elegir feat/group-existing-products hará que migrate se omita aunque verify pase; no se relaja esa protección.
4. Para ensayar antes de fusionar, usar un runner o terminal privado en el checkout de feat/group-existing-products, con secretos explícitos de la rama aislada de Neon. Ejecutar pnpm install --frozen-lockfile y, con NODE_ENV=production, DIRECT_DATABASE_URL de staging y DB_TLS_MODE=require, pnpm db:migrate. No usar el environment production. Ejemplo PowerShell al final; no modifica .env.
5. Validar en esa rama la migración 20261027000000_product_families y cualquier migración anterior pendiente. No volver a crearla ni editar sus checksums; ya aplicada localmente según lo informado por el propietario. Este cambio no añade migraciones. `pnpm catalog:check` puede contrastar el estado en modo lectura; requiere DATABASE_URL explícita del mismo entorno aislado y NODE_ENV=production para no cargar .env. Nunca reset, db push o seed sobre datos existentes.
6. Desplegar el mismo SHA en una API y frontend de pruebas, con APP_ORIGIN y API_ORIGIN del entorno aislado. Probar categorías antiguas/nuevas, CSV/XLSX, familias, cancelación, precios, fotografías y permisos. No apuntar un preview a la API o R2 de producción.
7. Tras aprobación, fusionar manualmente la PR con auto-deploy aún detenido. Registrar el SHA aprobado. Antes de producción, disponer de respaldo/restauración probada y ventana controlada sin agrupaciones ni escrituras administrativas durante el despliegue mixto.
8. Configurar/verificar DIRECT_DATABASE_URL exclusivamente en el environment production del runner. Ejecutar el mismo workflow desde main, activar migraciones y elegir production. Requiere autorización del responsable. Confirmar verify y migrate verdes, y comprobar las migraciones aplicadas. No volver a ejecutar bootstrap si ya existe administrador; no ejecutar seed.
9. Render: desplegar manualmente el SHA aprobado. Build: pnpm install --frozen-lockfile && pnpm build:server. Start: pnpm start:api. Mantener configuración privada existente y comprobar /health/live, /health/ready y sesión. No mezclar backend antiguo con categorías nuevas o familias ya agrupadas.
10. Pages: desplegar el mismo SHA de main con pnpm install --frozen-lockfile && pnpm build:web, salida dist y Functions incluidas. Mantener VITE_API_URL=/api, API_ORIGIN de Render y PRODUCT_IMAGES del bucket de producción. La API usa APP_ORIGIN del origen público de Pages. Verificar fotos y cotización por WhatsApp.
11. Ejecutar pnpm smoke -- --url <origen-publico-pages> --api-url <origen-api-render> desde un equipo autorizado. Revisar manualmente login/cookies/guard, categorías, familias y carritos previos que requieran elegir de nuevo el diseño. Solo después habilitar la operación a empleados y decidir si se reactivan auto-deploys.

Si falla una migración, detener el release y revisar su estado privadamente: no resetear ni editar _prisma_migrations a mano. Si falla un despliegue, no revertir a ciegas un backend que desconozca categorías nuevas o familias agrupadas. La tabla y el vínculo añadidos son aditivos, pero la compatibilidad funcional de una versión anterior necesita evaluación específica.


### Ensayo de migración pre-merge en PowerShell (ejecución manual)

Abrir una terminal privada nueva en el checkout de la rama de la PR. Completar primero la instalación con pnpm install --frozen-lockfile. Verificar en Neon que se está copiando la conexión **de la rama aislada**, directa y con sslmode=require. No utilizar este bloque para producción. Pegar la conexión únicamente cuando Read-Host la solicite y pulsar Enter; no colocarla como comando, en el historial ni en el chat.

~~~powershell
# En una terminal nueva y privada, tras verificar proyecto/rama/base aislados.
$catalogSecret = Read-Host 'Conexión DIRECTA de la rama Neon de PRUEBAS' -AsSecureString
$catalogPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($catalogSecret)
try {
    $env:NODE_ENV = 'production'
    $env:DB_TLS_MODE = 'require'
    $env:DIRECT_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($catalogPointer)
    if ([string]::IsNullOrWhiteSpace($env:DIRECT_DATABASE_URL)) { throw 'No se recibió la conexión.' }
    pnpm db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'Migración fallida; detener y revisar el estado privadamente.' }
    $env:DATABASE_URL = $env:DIRECT_DATABASE_URL
    pnpm catalog:check
    if ($LASTEXITCODE -ne 0) { throw 'Revisión fallida; no continuar al despliegue.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($catalogPointer)
    $catalogSecret.Dispose()
    Remove-Item Env:DIRECT_DATABASE_URL,Env:DATABASE_URL,Env:NODE_ENV,Env:DB_TLS_MODE -ErrorAction SilentlyContinue
}
~~~

El bloque limpia sus variables: ejecutarlo en una terminal nueva, sin configuración de trabajo que se necesite conservar. Los comandos de este repositorio ocultan conexiones en las salidas, pero no compartir la terminal ni capturas. Si catalog:check detecta un problema, no aplicar correcciones destructivas ni volver a crear migraciones: revisar primero el informe.
