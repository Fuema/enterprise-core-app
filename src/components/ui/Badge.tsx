import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        muted: 'border-transparent bg-muted text-muted-foreground',
        destructive: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        warning: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
