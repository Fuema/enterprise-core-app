import { delay, http } from 'msw';
import { auditLog } from '../db';
import { api, ok, queryParam } from '../http';
import { listPage } from '../paging';
import { authorize } from './auth';

/** Mock audit log (read-only), mirroring Endpoint/AuditEndpoints.cs. */
const ACTIONS = [
  'auth.login', 'auth.login_failed', 'auth.locked_out', 'auth.signup', 'auth.password_changed', 'auth.session_revoked',
  'user.created', 'user.updated', 'user.password_reset', 'user.unlocked', 'user.sessions_revoked',
  'role.created', 'role.updated', 'role.deleted',
];

export const auditHandlers = [
  http.get(api('/audit/actions'), async ({ request }) => {
    await delay(100);
    const auth = authorize(request, ['audit:read']);
    if (auth instanceof Response) return auth;
    return ok(ACTIONS);
  }),

  http.get(api('/audit'), async ({ request }) => {
    await delay(250);
    const auth = authorize(request, ['audit:read']);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const action = queryParam(url, 'action');
    const targetType = queryParam(url, 'targetType');
    const from = queryParam(url, 'from');
    const to = queryParam(url, 'to');
    const rows = auditLog
      .filter((a) => !action || a.action === action)
      .filter((a) => !targetType || a.targetType === targetType)
      .filter((a) => !from || a.occurredAtUtc.slice(0, 10) >= from)
      .filter((a) => !to || a.occurredAtUtc.slice(0, 10) <= to)
      .map((a) => ({ ...a, actorText: a.actorName ?? '', targetText: a.targetName ?? '' }));
    const url2 = new URL(url);
    if (!url2.searchParams.get('sort')) url2.searchParams.set('sort', 'occurredAtUtc.desc');
    const page = listPage(rows, url2, {
      sortable: ['id', 'occurredAtUtc', 'action', 'actorName', 'targetName'],
      searchable: ['actorText', 'targetText', 'action'],
      defaultSort: 'occurredAtUtc',
    });
    return ok({ ...page, data: page.data.map(({ actorText: _a, targetText: _t, ...entry }) => entry) });
  }),
];
