import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional class names and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Compile-time exhaustiveness guard for discriminated unions. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

/** Open-redirect guard: only same-origin, app-relative paths are allowed. */
export function isSafeRelativePath(path: string | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}
