import { zodResolver } from '@hookform/resolvers/zod';
import type { ComponentProps } from 'react';
import { useForm, useFormState, type FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Form } from '@/components/ui/Form';
import { ApiError } from '@/lib/apiError';
import { applyServerErrors } from '@/lib/formErrors';
import { cn } from '@/lib/utils';
import type { FormChildren, FormSchemaConfig } from '@/types/generic-form';

export type GenericFormElementProps<
  TFormValues extends FieldValues,
  TFormInput extends FieldValues = TFormValues,
> = FormSchemaConfig<TFormValues, TFormInput> & {
  children: FormChildren<TFormValues, TFormInput>;
  className?: string;
  /** Lets an external submit button target this form via `form="id"`. */
  id?: string;
};

/**
 * Schema-driven form orchestrator.
 *
 *  - Zod is the single validator (`schema`); field types are inferred from it.
 *  - React Hook Form is bound through context, so children are plain
 *    <FormField> / <FormItem> / <FormControl> compositions.
 *  - Uncontrolled inputs + per-field `useFormState` subscriptions: typing in
 *    one field does not re-render the form or its siblings.
 *  - An ApiError thrown from `onSubmit` is mapped onto fields automatically
 *    (ASP.NET ProblemDetails `errors` included).
 *
 * @example
 * <GenericFormElement schema={employeeSchema} defaultValues={{ name: '' }} onSubmit={save}>
 *   {(form) => <FormField control={form.control} name="name" render={...} />}
 * </GenericFormElement>
 */
export function GenericFormElement<TFormValues extends FieldValues, TFormInput extends FieldValues = TFormValues>({
  schema,
  defaultValues,
  onSubmit,
  mode = 'onTouched',
  mapServerErrors = true,
  children,
  className,
  id,
}: GenericFormElementProps<TFormValues, TFormInput>) {
  const form = useForm<TFormInput, unknown, TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });

  const submit = async (data: TFormValues) => {
    try {
      await onSubmit(data, form);
    } catch (error) {
      if (mapServerErrors && error instanceof ApiError) {
        applyServerErrors(form, error);
        return;
      }
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form
        id={id}
        noValidate
        className={cn('grid gap-4', className)}
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
      >
        {typeof children === 'function' ? children(form) : children}
      </form>
    </Form>
  );
}

/** Renders the form-level server error (`root.server`), if any. */
export function FormRootError({ className }: { className?: string }) {
  const { errors } = useFormState();
  const message = errors.root?.server?.message;
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn('rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive', className)}
    >
      {message}
    </div>
  );
}

/** Submit button that disables itself while the form is submitting. */
export function FormSubmitButton({ children, disabled, ...props }: ComponentProps<typeof Button>) {
  const { isSubmitting } = useFormState();
  return (
    <Button type="submit" disabled={Boolean(disabled) || isSubmitting} aria-busy={isSubmitting} {...props}>
      {children}
    </Button>
  );
}
