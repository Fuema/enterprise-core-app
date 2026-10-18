import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { unwrapEnvelope } from '@/lib/apiClient';
import { BaseApiService } from '@/services/BaseApiService';
import { entityQueries } from '@/services/entityQueries';
import { auditEntrySchema, type AuditEntry } from '../types/audit';

/** Read-only: list (and the action names for the filter). */
class AuditService extends BaseApiService<AuditEntry, number, never, never> {
  constructor() {
    super('/audit', { schema: auditEntrySchema });
  }

  async getActions(signal?: AbortSignal): Promise<string[]> {
    const response = await this.http.get<unknown>(`${this.resourcePath}/actions`, { signal });
    return z.array(z.string()).parse(unwrapEnvelope(response.data));
  }
}

export const auditService = new AuditService();
export const auditQueries = {
  ...entityQueries(auditService),
  actions: () =>
    queryOptions({
      queryKey: [...auditService.keys.all, 'actions'] as const,
      queryFn: ({ signal }) => auditService.getActions(signal),
      staleTime: Infinity,
    }),
};
