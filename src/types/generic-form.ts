import type { ReactNode } from 'react';
import type { DefaultValues, FieldValues, Mode, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

/** Server-side validation messages keyed by camelCase field path ("address.city"). */
export type FieldErrorMap = Record<string, string[]>;

/** Declarative rule set for a single field (UI hints; Zod remains the validator). */
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Configuration accepted by `GenericFormElement`.
 * `TFormValues` is the parsed (output) type handed to `onSubmit`;
 * `TFormInput` is the raw field type (differs only when the schema transforms).
 */
export interface FormSchemaConfig<
  TFormValues extends FieldValues,
  TFormInput extends FieldValues = TFormValues,
> {
  schema: z.ZodType<TFormValues, TFormInput>;
  defaultValues: DefaultValues<TFormInput>;
  onSubmit: (data: TFormValues, form: UseFormReturn<TFormInput, unknown, TFormValues>) => void | Promise<void>;
  /** Validation trigger. Defaults to "onTouched" for the least re-rendering. */
  mode?: Mode;
  /** Map ProblemDetails field errors from the server onto form fields. Default true. */
  mapServerErrors?: boolean;
}

export type FormChildren<TFormValues extends FieldValues, TFormInput extends FieldValues> =
  | ReactNode
  | ((form: UseFormReturn<TFormInput, unknown, TFormValues>) => ReactNode);
