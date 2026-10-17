import { Link, useMatches } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import type { BreadcrumbResolver } from '@/types/router-meta';

interface Crumb {
  id: string;
  label: string;
  pathname: string;
}

function resolveLabel(resolver: BreadcrumbResolver, params: Record<string, unknown>, loaderData: unknown): string {
  return typeof resolver === 'function' ? resolver({ params, loaderData }) : resolver;
}

/**
 * Meta-driven navigation trail. Each route opts in with
 *   staticData: { breadcrumb: 'Employees' }
 * or a resolver using params / loader data:
 *   staticData: { breadcrumb: ({ loaderData }) => (loaderData as Employee).fullName }
 *
 * Links carry no search params on purpose: the router's search memory restores
 * the user's last page/sort/filter for that list automatically.
 */
export function DynamicBreadcrumbs({ className }: { className?: string }) {
  const matches = useMatches();

  const crumbs: Crumb[] = matches.flatMap((match) => {
    const resolver = match.staticData.breadcrumb;
    if (resolver === undefined) return [];
    return [
      {
        id: match.id,
        label: resolveLabel(resolver, match.params, match.loaderData),
        pathname: match.pathname,
      },
    ];
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.id}>
              <li>
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  // Runtime path from route metadata: cannot be statically typed.
                  <Link to={crumb.pathname as '/'} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
