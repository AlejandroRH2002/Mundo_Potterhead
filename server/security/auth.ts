import type { UserSession } from '../../src/types/auth.ts';
type Result<T> = T | Promise<T>;
export interface Auth {
  ttlMs: number;
  authenticate(email: string, password: string): Promise<{ token: string; user: UserSession } | null>;
  session(token: string | undefined, activity?: boolean): Result<UserSession | null>;
  remainingMs?(token: string): Result<number>;
  revoke(token: string | undefined): Result<void>;
  updateName(id: string, name: string): Result<UserSession>;
  register?(input: { name: string; email: string; password: string }): Promise<void>;
}
