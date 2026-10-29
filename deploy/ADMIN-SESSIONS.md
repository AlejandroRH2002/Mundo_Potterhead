# Sesiones administrativas y errores de publicación

## Diagnóstico comprobado

El aviso «No se pudo confirmar la publicación» no identificaba una causa HTTP:
el hook de catálogo capturaba el error original y devolvía `undefined`.
Publicación lo interpretaba como una respuesta inválida. Además, un 403
invalidaba la identidad en el cliente y podía desmontar el editor, aunque
significara permisos insuficientes o rechazo de Origin, no una sesión vencida.

Se reprodujeron 401, rechazo de guardado, ausencia de respuesta y recuperación.
No se consultaron Neon, Render ni registros de producción. Sin el estado HTTP
y la hora del incidente original no se puede afirmar que aquel caso concreto
fuera expiración, validación, conflicto o conexión. Para investigarlo basta el
estado de `POST /api/admin/catalog` y la hora; no compartir cuerpos, cookies,
contraseñas, cadenas de conexión ni cabeceras de autorización.

## Política aplicada en el servidor

| Cuenta | Inactividad anterior | Inactividad nueva | Tope absoluto |
| --- | --- | --- | --- |
| Administrador | 30 minutos | 4 horas | 8 horas desde login |
| Cliente | 30 minutos | 30 minutos | 8 horas desde login |

Continúan el token aleatorio, digest HMAC, sesión persistida por usuario,
rotación en login, revocación y comprobación de cuenta activa. Se reutilizan
`createdAt` y `expiresAt`; no se añaden columnas ni migraciones. La renovación
usa CAS y persiste como máximo una vez por minuto por sesión. Una sesión
vencida o revocada nunca se renueva. Cambiar rol o desactivar cuenta sigue
revocando sus sesiones.

Para administradores, leer la sesión, abrir un endpoint o recibir un sondeo de
salud no renueva la expiración ni la cookie. El frontend envía
`POST /api/auth/activity` solo ante `pointerdown` o `keydown` confiables del
navegador, con la pestaña visible y como máximo una solicitud por minuto.
No hay intervalo, heartbeat ni renovación al enfocar la ventana. El servidor
exige sesión administrativa vigente, Origin correcto, X-Requested-With y un
cuerpo JSON vacío estricto; calcula todos los tiempos con su propio reloj.
La señal de interacción evita renovaciones accidentales de la aplicación: no
es una prueba criptográfica de presencia humana frente a scripts del mismo origen.

Las cookies conservan HttpOnly, Secure en producción, prefijo `__Host-`, Path=/,
SameSite configurado y ausencia de Domain. Su Max-Age se limita a la expiración
real persistida y al tope absoluto. Pages conserva Cookie, Set-Cookie, Origin y
X-Requested-With mediante el proxy existente. No requiere ampliar CORS.

## Formularios y reautenticación

- Un 401 conserva **solo la pantalla ya autorizada** del administrador, bloqueada
  con `inert` y un diálogo de login. No permite abrir otra vista privada sin
  una nueva validación. Un visitante inicial sin sesión nunca monta el editor.
- Reautenticar la misma cuenta mantiene el formulario en memoria de la pestaña.
  La contraseña se limpia al terminar; no se almacena en borradores ni se
  persisten tokens. Cerrar sesión o cambiar identidad desmonta el editor y
  elimina esos datos temporales. Recargar/cerrar la pestaña pierde el borrador
  no guardado: no se añadió almacenamiento persistente de formularios.
- No se repite una publicación al iniciar sesión. Primero se consulta el estado
  guardado: por ID, o por código estable si se perdió la respuesta de creación.
  Una versión distinta exige revisar la ficha guardada antes de reintentar.
  Los códigos únicos del backend siguen evitando creaciones duplicadas.
- Un 403 conserva la sesión y muestra el rechazo; 409 muestra el conflicto;
  5xx, timeout o conexión fallida indican resultado no confirmado. Los errores
  HTTP ya no se sustituyen por el resultado `undefined` del hook.
- Si se perdió una respuesta, un GET comprueba qué quedó publicado sin reemplazar
  las modificaciones locales. Si tampoco puede comprobarse, el reintento queda
  bloqueado. No se supone rollback ni éxito. Las respuestas 401 de solicitudes
  anteriores a un nuevo login no invalidan la identidad recién establecida.
- Un fallo de red al comprobar sesión no se presenta como expiración. Una nueva
  navegación protegida cuya validación falle queda cerrada con opción de repetir
  la comprobación; no se autoriza usando una identidad antigua.

## Despliegue y comprobación

1. Revisar la PR y CI. No hay migraciones nuevas ni variables nuevas/modificadas.
2. Desplegar **primero la API** de esta revisión en Render, en todas las réplicas.
   Mantener el mismo SESSION_SECRET y los valores actuales de APP_ORIGIN y cookies.
   No rotar el secreto para cambiar la duración: invalidaría sesiones existentes.
3. Desplegar después el frontend de la misma revisión en Pages. API_ORIGIN y
   VITE_API_URL=/api no cambian. No se modifica la configuración cloud desde el código.
4. Probar con una cuenta administrativa de pruebas: login, edición, borrador,
   publicación y logout. Comprobar los atributos de cookie a través del host Pages.
   Un nuevo login recibe la duración nueva; sesiones antiguas válidas se actualizan
   al registrar actividad, antes de que expire su cookie anterior.
5. Simular ausencia de cookie en la sesión de pruebas: el editor debe permanecer
   bloqueado, permitir reautenticación y exigir comprobar estado antes de publicar.
   No repetir operaciones reales para comprobar errores de forma automática.

## Pruebas

Reloj simulado: 31 minutos y 3 horas válidos, 4 horas vencidas, renovación legítima,
sondeos sin renovación, concurrencia de CAS, límite de 8 horas, rotación y revocación.
HTTP: cookies, permisos y CSRF. Chrome: formulario retenido, login sin replay,
verificación antes del reintento, publicación posterior, cambio de cuenta, logout
y rechazo de una ruta protegida nueva con identidad expirada.

La integración se ejecuta con `node scripts/test-product-history.mjs --persistence`:
copia únicamente el esquema PostgreSQL local, en modo lectura, a un contenedor
desechable; no ejecuta migraciones ni copia filas ni escribe en la base de origen.
Requiere el contenedor local ya preparado y rechaza conexiones remotas. El runner
normal de integración permanece disponible para CI. En navegador, API y R2 son
simulados; no se afirma una prueba contra R2 ni producción real.

Resultado de esta entrega: lint, typecheck, 168 pruebas unitarias, 45 pruebas de
integración, build y build:web aprobados. Chrome instalado verifica escritorio y
móvil, el formulario retenido, reautenticación sin replay, comprobación antes de
reintentar, actividad confiable limitada, cambio de cuenta, logout y bloqueo de
otra ruta protegida cuando la identidad expiró. El control de secretos del bundle
también pasó. No se aplicaron migraciones ni se escribieron datos en la base local
de origen o en producción.
