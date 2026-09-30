import { randomUUID } from 'node:crypto';
import type { MediaStorage } from '../media.ts';
import { uploadInputSchema } from '../../shared/mediaSchema.ts';
import { Prisma } from '@prisma/client';
import { isIP } from 'node:net';
import { loginSchema, registerSchema, profileSchema } from '../validation/auth.ts';
import { audit, type AuditEntry } from '../logger.ts';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Auth } from '../security/auth.ts';
import { createLoginLimiter } from '../security/rateLimit.ts';
import type { ProductRepository } from './products.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';

class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
async function body(request: IncomingMessage, limit = 16 * 1024): Promise<Record<string, unknown>> {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Se requiere JSON.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > limit) throw new HttpError(413, 'La solicitud es demasiado grande.');
    chunks.push(buffer);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new HttpError(400, 'JSON inválido.'); }
}
function json(response: ServerResponse, status: number, value?: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(value === undefined ? undefined : JSON.stringify(value));
}
export function createApi({ auth, products, origin, secureCookies = false, sameSite = 'Strict', trustProxy = false,
  registrationEnabled = false, limiter = createLoginLimiter(), ready = async () => {}, logger = audit, media,
}: { auth: Auth; products: ProductRepository; origin: string; secureCookies?: boolean;
  media?: MediaStorage; sameSite?: 'Strict' | 'Lax' | 'None'; trustProxy?: boolean; registrationEnabled?: boolean;
  limiter?: (key: string) => boolean | Promise<boolean>; ready?: () => Promise<void>; logger?: (entry: AuditEntry) => void;
}) {
  if (sameSite === 'None' && !secureCookies) throw new Error('SameSite=None requires Secure.');
  const cookieName = secureCookies ? '__Host-mp_session' : 'mp_session';
  const cookie = (token: string, seconds: number) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`;
  const tokenFrom = (request: IncomingMessage) => request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);

  return createServer((request, response) => {
    const started = Date.now();
    const requestId = randomUUID();
    let route = 'unknown';
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (secureCookies) response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    response.setHeader('Vary', 'Origin');
    response.on('finish', () => {
      if (route.startsWith('/health/') && response.statusCode === 200) return;
      logger({ event: 'request', requestId, route, method: request.method, status: response.statusCode, durationMs: Date.now() - started });
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const handle = async () => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      const method = request.method ?? 'GET';
      route = /^\/api\/products(?:\/[^/]+)?$/.test(path) ? '/api/products/:id?' :
        ['/api/media/config', '/api/media/upload', '/api/auth/session', '/api/auth/login', '/api/auth/logout', '/api/auth/register', '/api/users/me', '/health/live', '/health/ready'].includes(path) ? path : 'unknown';
      const requestOrigin = request.headers.origin;
      if (requestOrigin && requestOrigin !== origin) throw new HttpError(403, 'Origen no autorizado.');
      if (requestOrigin === origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      if (method === 'OPTIONS') {
        if (requestOrigin !== origin) throw new HttpError(403, 'Origen no autorizado.');
        const requestedMethod = request.headers['access-control-request-method'];
        const requestedHeaders = String(request.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(requestedMethod)) || requestedHeaders.some(value => !['content-type', 'x-requested-with'].includes(value))) throw new HttpError(403, 'Preflight no autorizado.');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
        response.setHeader('Access-Control-Max-Age', '600');
        json(response, 204); return;
      }
      if (path === '/health/live' && ['GET', 'HEAD'].includes(method)) { json(response, 200, { status: 'ok' }); return; }
      if (path === '/health/ready' && ['GET', 'HEAD'].includes(method)) {
        try { await ready(); } catch { throw new HttpError(503, 'Servicio no disponible.'); }
        json(response, 200, { status: 'ok' }); return;
      }
      const token = tokenFrom(request);
      const user = await auth.session(token);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        if (request.headers.origin !== origin || request.headers['x-requested-with'] !== 'MundoPotterhead') throw new HttpError(403, 'Origen de solicitud no autorizado.');
      }
      if (path === '/api/media/config' || path === '/api/media/upload') {
        if (!user) throw new HttpError(401, 'Inicia sesion para continuar.');
        if (user.role !== 'admin') throw new HttpError(403, 'Se requiere administrador.');
        if (path.endsWith('/config') && method === 'GET') { json(response, 200, { enabled: !!media, maxBytes: media?.maxBytes ?? 2 * 1024 * 1024 }); return; }
        if (path.endsWith('/upload') && method === 'POST') {
          if (!media) throw new HttpError(503, 'La carga de archivos no esta configurada.');
          const input = uploadInputSchema.safeParse(await body(request));
          if (!input.success) throw new HttpError(400, 'Selecciona una imagen PNG, JPEG o WebP de hasta 10 MB.');
          json(response, 200, await media.sign(input.data)); return;
        }
      }
      if (path === '/api/auth/session' && method === 'GET') {
        json(response, 200, { user }); return;
      }
      if ((path === '/api/auth/login' || path === '/api/auth/register') && method === 'POST') {
        if (path.endsWith('/register') && (!registrationEnabled || !auth.register)) throw new HttpError(404, 'Ruta no encontrada.');
        let address = request.socket.remoteAddress ?? 'unknown';
        if (trustProxy) {
          // Only enable behind a proxy that overwrites X-Real-IP and blocks direct access.
          const forwarded = request.headers['x-real-ip'];
          if (typeof forwarded !== 'string' || !isIP(forwarded)) throw new HttpError(400, 'Proxy no configurado.');
          address = forwarded;
        }
        if (!await limiter(address)) {
          response.setHeader('Retry-After', '900');
          throw new HttpError(429, 'Demasiados intentos. Intenta más tarde.');
        }
        const value = await body(request);
        if (path.endsWith('/register')) {
          const input = registerSchema.safeParse(value);
          if (!input.success) throw new HttpError(400, 'Datos de registro no validos.');
          await auth.register!(input.data);
          json(response, 202, { message: 'Solicitud procesada. Si la cuenta es nueva, ya puedes iniciar sesion.' }); return;
        }
        const input = loginSchema.safeParse(value);
        if (!input.success) throw new HttpError(401, 'Credenciales incorrectas.');
        const session = await auth.authenticate(input.data.email, input.data.password);
        if (!session) throw new HttpError(401, 'Credenciales incorrectas.');
        await auth.revoke(token);
        response.setHeader('Set-Cookie', cookie(session.token, Math.floor(auth.ttlMs / 1000)));
        json(response, 200, { user: session.user }); return;
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        await auth.revoke(token);
        response.setHeader('Set-Cookie', cookie('', 0));
        json(response, 204); return;
      }
      if (path === '/api/users/me' && method === 'PATCH') {
        if (!user) throw new HttpError(401, 'Inicia sesión para continuar.');
        const value = await body(request);
        if (!profileSchema.safeParse(value).success) throw new HttpError(400, 'Perfil no valido.');
        // Identity and role are controlled by the server. No mass assignment.
        if (Object.keys(value).some(key => !['name', 'email'].includes(key))) throw new HttpError(400, 'Campo de perfil no permitido.');
        if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 150 || value.email !== user.email) throw new HttpError(400, 'Solo puedes cambiar el nombre. El correo de acceso se administra en el servidor.');
        json(response, 200, { user: await auth.updateName(user.id, value.name.trim()) }); return;
      }
      if (path === '/api/products' || /^\/api\/products\/[^/]+$/.test(path)) {
        let id: string | undefined;
        try { id = path === '/api/products' ? undefined : decodeURIComponent(path.slice('/api/products/'.length)); }
        catch { throw new HttpError(400, 'Identificador inválido.'); }
        if (method === 'GET') {
          const result = id ? await products.get(id) : await products.list();
          if (!result) throw new HttpError(404, 'Producto no encontrado.');
          json(response, 200, result); return;
        }
        // Check authorization before parsing input or accessing mutation handlers.
        if (!user) throw new HttpError(401, 'Inicia sesión para continuar.');
        if (user.role !== 'admin') throw new HttpError(403, 'Esta operación requiere administrador.');
        if (method === 'DELETE' && id) {
          if (!await products.remove(id)) throw new HttpError(404, 'Producto no encontrado.');
          json(response, 204); return;
        }
        if ((method === 'POST' && !id) || (method === 'PUT' && id)) {
          const value = await body(request, 3 * 1024 * 1024);
          // Schema strips IDs/unknown fields and validates before persistence.
          const parsed = productDraftSchema.safeParse(value);
          if (!parsed.success) throw new HttpError(400, 'Datos de producto inválidos.');
          const draft = parsed.data;
          const product = id ? await products.update(id, draft) : await products.create(draft);
          if (!product) throw new HttpError(404, 'Producto no encontrado.');
          json(response, id ? 200 : 201, product); return;
        }
      }
      throw new HttpError(404, 'Ruta no encontrada.');
    };
    void handle().catch((error: unknown) => {
      let status = error instanceof HttpError ? error.status : 500;
      let message = error instanceof HttpError ? error.message : 'No se pudo completar la solicitud.';
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003'].includes(error.code)) {
        status = 409; message = 'La operación entra en conflicto con datos existentes.';
      }
      if (error instanceof Prisma.PrismaClientInitializationError ||
        (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P2024'].includes(error.code))) {
        status = 503; message = 'Servicio temporalmente no disponible.';
      }
      if (!(error instanceof HttpError)) logger({ event: 'failure', requestId, route, status, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'REQUEST_FAILED' });
      if (!response.headersSent) json(response, status, { message });
      else response.end();
    });
  });
}
