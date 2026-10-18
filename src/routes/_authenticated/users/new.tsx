import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserCreateForm } from '@/features/access/users/forms/UserForm';
import { emptyUserCreateForm, toUserCreate, type UserCreateFormValues } from '@/features/access/users/forms/userFormSchema';
import { userService } from '@/features/access/users/services/userService';
import { USER_PERMISSIONS, type User } from '@/features/access/users/types/user';
import { requirePermissions } from '@/features/auth/guards';
import type { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/users/new')({
  staticData: { breadcrumb: 'New user', persistSearch: false },
  beforeLoad: requirePermissions([USER_PERMISSIONS.write]),
  component: NewUserPage,
});

function NewUserPage() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ user: User; temporaryPassword: string } | null>(null);
  const create = useMutation<{ user: User; temporaryPassword: string }, ApiError, UserCreateFormValues>({
    mutationFn: (values) => userService.createUser(toUserCreate(values)),
    onSuccess: async (result) => {
      setCreated(result);
      await queryClient.invalidateQueries({ queryKey: userService.keys.lists() });
    },
  });

  if (created) {
    return (
      <section className="grid max-w-2xl gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">User created</h1>
        <div role="status" className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
          <p>
            Give <strong>{created.user.username}</strong> this temporary password. It is shown only once; they must change
            it at their first sign-in.
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-base" aria-label="Temporary password">
              {created.temporaryPassword}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(created.temporaryPassword)}
              aria-label="Copy temporary password"
            >
              <Copy />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/users/$userId" params={{ userId: created.user.id }}>
              Open {created.user.username}
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => setCreated(null)}>
            Create another
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="grid max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
      <div className="rounded-lg border bg-card p-6">
        <UserCreateForm
          defaultValues={emptyUserCreateForm}
          onSubmit={async (values) => {
            await create.mutateAsync(values);
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/users">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
