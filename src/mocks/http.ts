import { createCasingMapper } from '@/lib/casing';
import { env } from '@/lib/env';

/**
 * Helpers that make the mock behave like a real, configurable backend:
 * responses use the configured wire casing (VITE_API_PROPERTY_CASING) and the
 * optional ApiResponse envelope (VITE_API_RESPONSE_ENVELOPE), so the app's
 * real network layer (casing, envelope, ProblemDetails mapping) is exercised.
 */
const casing = createCasingMapper(env.VITE_API_PROPERTY_CASING);

/** Absolute URL for an API path, e.g. api('/employees') -> https://host/api/employees */
export function api(path: string): string {
  return env.VITE_API_BASE_URL.replace(/\/+$/, '') + path;
}

function json(body: unknown, status: number, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
}

/** Success response in backend casing, wrapped in the envelope when configured. */
export function ok(body: unknown, status = 200): Response {
  const payload = env.VITE_API_RESPONSE_ENVELOPE ? { data: body, success: true } : body;
  return json(casing.toApi(payload), status);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** RFC 7807 ProblemDetails, shaped like ASP.NET Core output (camelCase envelope, field keys in wire casing). */
export function problem(status: number, title: string, errors?: Record<string, string[]>): Response {
  return json(
    {
      type: `https://httpstatuses.io/${String(status)}`,
      title,
      status,
      traceId: `mock-${Math.random().toString(16).slice(2, 10)}`,
      ...(errors ? { errors: casing.toApi(errors) } : {}),
    },
    status,
    'application/problem+json',
  );
}

/** Request body converted from backend casing to camelCase. */
export async function readBody(request: Request): Promise<unknown> {
  const raw: unknown = await request.json().catch(() => undefined);
  return casing.fromApi(raw);
}

/** Reads a query-string parameter by its camelCase name, whatever the wire casing. */
export function queryParam(url: URL, name: string): string | null {
  const wire = casing.toApi({ [name]: true });
  const wireName = wire !== null && typeof wire === 'object' ? (Object.keys(wire)[0] ?? name) : name;
  return url.searchParams.get(wireName);
}
