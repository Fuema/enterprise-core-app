import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { sessionSchema, type Session } from '@/features/auth/types/auth';
import { unwrapEnvelope } from '@/lib/apiClient';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import {
  temporaryPasswordSchema,
  userCreatedSchema,
  userSchema,
  type User,
  type UserCreate,
  type UserId,
  type UserUpdate,
} from '../types/user';

const sessionListSchema = z.array(sessionSchema);

/** Accounts: list, detail, update + account-security commands. Creation returns a temporary password. */
class UserService extends BaseApiService<User, UserId, never, UserUpdate> {
  constructor() {
    super('/users', { schema: userSchema });
  }

  async createUser(payload: UserCreate): Promise<{ user: User; temporaryPassword: string }> {
    const response = await this.http.post<unknown>(this.resourcePath, payload);
    return userCreatedSchema.parse(unwrapEnvelope(response.data));
  }

  /** New temporary password (shown once); the user must change it and is signed out everywhere. */
  async resetPassword(id: UserId): Promise<string> {
    const response = await this.http.post<unknown>(`${this.entityUrl(id)}/reset-password`);
    return temporaryPasswordSchema.parse(unwrapEnvelope(response.data)).temporaryPassword;
  }

  async unlock(id: UserId): Promise<void> {
    await this.http.post(`${this.entityUrl(id)}/unlock`);
  }

  async getSessions(id: UserId, signal?: AbortSignal): Promise<Session[]> {
    const response = await this.http.get<unknown>(`${this.entityUrl(id)}/sessions`, { signal });
    return sessionListSchema.parse(unwrapEnvelope(response.data));
  }

  async revokeSession(id: UserId, sessionId: string): Promise<void> {
    await this.http.delete(`${this.entityUrl(id)}/sessions/${encodeURIComponent(sessionId)}`);
  }

  async revokeAllSessions(id: UserId): Promise<void> {
    await this.http.delete(`${this.entityUrl(id)}/sessions`);
  }
}

export const userService = new UserService();

export const userQueries = {
  ...entityQueries(userService),
  sessions: (id: UserId) =>
    queryOptions({
      queryKey: [...userService.keys.detail(id), 'sessions'] as const,
      queryFn: ({ signal }) => userService.getSessions(id, signal),
    }),
};
