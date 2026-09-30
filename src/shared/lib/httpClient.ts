export const SESSION_INVALID = 'mp:session-invalid';
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Ruta API inválida.');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'MundoPotterhead');
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  if (base !== '/api') {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid public API URL.');
  }
  const response = await fetch(base + path, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
    credentials: 'include',
    cache: 'no-store',
    headers,
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event(SESSION_INVALID));
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message : 'No se pudo completar la solicitud.';
    throw new ApiError(response.status, message);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
