import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { Button } from '@/components/ui/Button';
import { StateForm } from '@/features/locations/states/forms/StateForm';
import { toStateFormValues } from '@/features/locations/states/forms/stateFormSchema';
import { stateMutationOptions, stateQueries, stateService } from '@/features/locations/states/services/stateService';
import { STATE_PERMISSIONS, stateSchema } from '@/features/locations/states/types/state';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/states/$stateId')({
  params: {
    parse: ({ stateId }) => ({ stateId: Number(stateId) }),
    stringify: ({ stateId }) => ({ stateId: String(stateId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.stateId) || params.stateId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(stateQueries.detail(params.stateId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    breadcrumb: ({ loaderData }) => {
      const parsed = stateSchema.safeParse(loaderData);
      return parsed.success ? parsed.data.name : 'State';
    },
    persistSearch: false,
  },
  notFoundComponent: StateNotFound,
  component: StateDetailPage,
});

function StateDetailPage() {
  const { stateId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: entity } = useSuspenseQuery(stateQueries.detail(stateId));
  const updateMutation = useUpdateEntity(stateService, stateMutationOptions);

  const details = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      {([['Country', entity.countryName], ['Cities', entity.cityCount], ['Employees', entity.employeeCount]] as const).map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section className="grid max-w-2xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{entity.name}</h1>
        <Button variant="ghost" asChild>
          <Link to="/states">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 rounded-lg border bg-card p-6">
        {details}
        <GenericActionGuard permissions={[STATE_PERMISSIONS.write]}>
          <StateForm
            key={entity.id}
            defaultValues={toStateFormValues(entity)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: entity.id, payload: values });
            }}
            actions={
              updateMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>
            }
          />
        </GenericActionGuard>
        <div className="flex justify-end">
          <GenericDeleteButton
            service={stateService}
            entity={entity}
            label={entity.name}
            size="default"
            permissions={[STATE_PERMISSIONS.delete]}
            mutationOptions={stateMutationOptions}
            onDeleted={() => void navigate({ to: '/states' })}
          />
        </div>
      </div>
    </section>
  );
}

function StateNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">State not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <div>
        <Button variant="outline" asChild>
          <Link to="/states">Back to states</Link>
        </Button>
      </div>
    </div>
  );
}
