import { Prisma, type PrismaClient } from '@prisma/client';
import { hashPassword } from '../security/password.ts';
import { createUserSchema, changeUserSchema, type ChangeUser, type CreateUser, type ManagedUser, type UserPage, type UserList } from '../../shared/userSchema.ts';
export class UserManagementError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export interface UserRepository {
  list(page: UserPage): Promise<UserList>;
  create(actorId: string, input: CreateUser): Promise<ManagedUser>;
  change(actorId: string, id: string, input: ChangeUser): Promise<ManagedUser>;
}
const select = { id: true, name: true, email: true, role: true, isActive: true } as const;
const dto = (row: { id: string; name: string | null; email: string; role: string; isActive: boolean }): ManagedUser => ({
  id: row.id, name: row.name, email: row.email, role: row.role === 'ADMIN' ? 'admin' : 'user', isActive: row.isActive,
});
export function validateUserChange(actorId: string, target: ManagedUser, input: ChangeUser, activeAdmins: number) {
  if (actorId === target.id && (input.isActive === false || input.role === 'user')) throw new UserManagementError(409, 'No puedes desactivar ni degradar tu propia cuenta.');
  if (target.isActive && target.role === 'admin' && (input.isActive === false || input.role === 'user') && activeAdmins <= 1)
    throw new UserManagementError(409, 'Debe quedar al menos un administrador activo.');
}
export function createDatabaseUsers(db: PrismaClient): UserRepository {
  async function write<T>(actorId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await db.$transaction(async tx => {
        // Serialize user administration across replicas. Recheck the actor after taking the lock.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(73190421)`;
        const actor = await tx.user.findUnique({ where: { id: actorId }, select });
        if (!actor?.isActive || actor.role !== 'ADMIN') throw new UserManagementError(403, 'Se requiere administrador activo.');
        return operation(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new UserManagementError(409, 'Ya existe una cuenta con esos datos.');
      throw error;
    }
  }
  return {
    async list(page) {
      const [rows, total] = await Promise.all([
        db.user.findMany({ select, orderBy: { id: 'asc' }, skip: (page.page - 1) * page.pageSize, take: page.pageSize }), db.user.count(),
      ]);
      return { ...page, total, users: rows.map(dto) };
    },
    async create(actorId, input) {
      const data = createUserSchema.parse(input);
      const password = await hashPassword(data.password);
      return write(actorId, async tx => dto(await tx.user.create({ data: { ...data, password, role: data.role === 'admin' ? 'ADMIN' : 'CUSTOMER' }, select })));
    },
    async change(actorId, id, input) {
      const patch = changeUserSchema.parse(input);
      return write(actorId, async tx => {
        const row = await tx.user.findUnique({ where: { id }, select });
        if (!row) throw new UserManagementError(404, 'Usuario no encontrado.');
        const count = await tx.user.count({ where: { role: 'ADMIN', isActive: true } });
        validateUserChange(actorId, dto(row), patch, count);
        const result = await tx.user.update({ where: { id }, data: { ...patch, role: patch.role === undefined ? undefined : patch.role === 'admin' ? 'ADMIN' : 'CUSTOMER' }, select });
        if (patch.isActive === false || patch.role !== undefined) await tx.session.deleteMany({ where: { userId: id } });
        return dto(result);
      });
    },
  };
}
