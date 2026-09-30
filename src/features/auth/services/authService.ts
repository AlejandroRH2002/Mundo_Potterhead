import type { UserSession } from '@/types/auth';
import { requestJson } from '@/shared/lib/httpClient';

function parseSession(value: unknown): { user: UserSession | null } {
  if (!value || typeof value !== 'object' || !('user' in value)) throw new Error('Sesión inválida.');
  const user = value.user;
  if (user === null) return { user: null };
  if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !user.id ||
      !('name' in user) || typeof user.name !== 'string' || !('email' in user) || typeof user.email !== 'string' ||
      !('role' in user) || (user.role !== 'admin' && user.role !== 'user')) throw new Error('Sesión inválida.');
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
async function authenticatedRequest(path: string, init: RequestInit): Promise<{ user: UserSession }> {
  const session = parseSession(await requestJson<unknown>(path, init));
  if (!session.user) throw new Error('El servidor no devolvió una sesión autenticada.');
  return { user: session.user };
}
// Only server responses establish identity. No credentials, role selectors or tokens
// are stored in browser storage. This adapter can call a JWT-backed API unchanged.
export const authService = {
  getSession: async () => parseSession(await requestJson<unknown>('/auth/session')),
  login: (email: string, password: string) => authenticatedRequest('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  logout: () => requestJson<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (profile: Pick<UserSession, 'name' | 'email'>) => authenticatedRequest('/users/me', {
    method: 'PATCH', body: JSON.stringify(profile),
  }),
};
