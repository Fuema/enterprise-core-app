import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { requirePermissions } from '@/features/auth/guards';
import { StateForm } from '@/features/locations/states/forms/StateForm';
import { emptyStateForm } from '@/features/locations/states/forms/stateFormSchema';
import { stateMutationOptions, stateService } from '@/features/locations/states/services/stateService';
import { STATE_PERMISSIONS } from '@/features/locations/states/types/state';
import { useCreateEntity } from '@/hooks/useEntityMutations';

export const Route = createFileRoute('/_authenticated/states/new')({
  staticData: { breadcrumb: 'New state', persistSearch: false },
  beforeLoad: requirePermissions([STATE_PERMISSIONS.write]),
  component: NewStatePage,
});

function NewStatePage() {
  const navigate = Route.useNavigate();
  const createMutation = useCreateEntity(stateService, stateMutationOptions);

  return (
    <section className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New state</h1>
      <div className="rounded-lg border bg-card p-6">
        <StateForm
          defaultValues={emptyStateForm}
          submitLabel="Create state"
          onSubmit={async (values) => {
            const created = await createMutation.mutateAsync(values);
            await navigate({ to: '/states/$stateId', params: { stateId: created.id } });
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/states">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
