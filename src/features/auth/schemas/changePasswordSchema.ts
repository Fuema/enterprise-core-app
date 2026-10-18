import { z } from 'zod';

/** Mirrors ChangePasswordRequest in the API (same rules and messages). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(100, 'Max 100 characters')
      .refine(
        (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value),
        'Include an uppercase letter, a lowercase letter and a digit',
      ),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'Choose a password different from the current one',
    path: ['newPassword'],
  });

export type ChangePasswordRequest = z.output<typeof changePasswordSchema>;

export const emptyChangePasswordForm: ChangePasswordRequest = { currentPassword: '', newPassword: '', confirmPassword: '' };
