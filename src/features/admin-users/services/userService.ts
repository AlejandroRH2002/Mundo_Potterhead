import { requestJson } from '@/shared/lib/httpClient';
import { createUserSchema, changeUserSchema, managedUserSchema, userListSchema, type CreateUser, type ChangeUser } from '../../../../shared/userSchema';
export const userService = {
  list: async (page: number, signal?: AbortSignal) => userListSchema.parse(await requestJson<unknown>('/admin/users?page=' + page + '&pageSize=20', { signal })),
  create: async (input: CreateUser) => managedUserSchema.parse(await requestJson<unknown>('/admin/users', { method: 'POST', body: JSON.stringify(createUserSchema.parse(input)) })),
  change: async (id: string, input: ChangeUser) => managedUserSchema.parse(await requestJson<unknown>('/admin/users/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(changeUserSchema.parse(input)) })),
};
