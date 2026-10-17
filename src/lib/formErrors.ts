import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ApiError } from './apiError';

/** Root error slot used for messages that do not belong to a specific field. */
export const SERVER_ERROR_KEY = 'root.server' as const;

function hasPath(source: unknown, path: string): boolean {
  let cursor: unknown = source;
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object' || !(segment in cursor)) return false;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return true;
}

/**
 * Projects a normalised ApiError onto React Hook Form:
 *  - field errors whose path exists in the form -> field-level messages
 *  - everything else (or a non-validation failure) -> `root.server`
 */
export function applyServerErrors<TInput extends FieldValues, TOutput>(
  form: UseFormReturn<TInput, unknown, TOutput>,
  error: ApiError,
): void {
  const unmatched: string[] = [];
  let focused = false;

  for (const [path, messages] of Object.entries(error.fieldErrors)) {
    const message = messages.join(' ');
    if (hasPath(form.formState.defaultValues, path)) {
      form.setError(path as Path<TInput>, { type: 'server', message }, { shouldFocus: !focused });
      focused = true;
    } else {
      unmatched.push(message);
    }
  }

  if (unmatched.length > 0 || !error.hasFieldErrors) {
    form.setError(SERVER_ERROR_KEY, {
      type: String(error.status),
      message: unmatched.length > 0 ? unmatched.join(' ') : (error.detail ?? error.title),
    });
  }
}
