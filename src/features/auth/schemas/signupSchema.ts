import { z } from 'zod';

/** Mirrors RegisterRequest in the API (same rules and messages). */
export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use 3 to 64 characters')
      .max(64, 'Use 3 to 64 characters')
      .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dots, dashes or underscores'),
    displayName: z.string().trim().min(1, 'Full name is required').max(100, 'Max 100 characters'),
    email: z.email('Enter a valid email address').max(256, 'Max 256 characters'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(100, 'Max 100 characters')
      .refine(
        (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value),
        'Include an uppercase letter, a lowercase letter and a digit',
      ),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupRequest = z.output<typeof signupSchema>;

export const emptySignupForm: SignupRequest = {
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};
