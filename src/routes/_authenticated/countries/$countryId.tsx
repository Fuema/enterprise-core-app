import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { Button } from '@/components/ui/Button';
import { CountryForm } from '@/features/locations/countries/forms/CountryForm';
import { toCountryFormValues } from '@/features/locations/countries/forms/countryFormSchema';
import { countryMutationOptions, countryQueries, countryService } from '@/features/locations/countries/services/countryService';
import { COUNTRY_PERMISSIONS, countrySchema } from '@/features/locations/countries/types/country';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/countries/$countryId')({
  params: {
    parse: ({ countryId }) => ({ countryId: Number(countryId) }),
    stringify: ({ countryId }) => ({ countryId: String(countryId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.countryId) || params.countryId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(countryQueries.detail(params.countryId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    breadcrumb: ({ loaderData }) => {
      const parsed = countrySchema.safeParse(loaderData);
      return parsed.success ? parsed.data.name : 'Country';
    },
    persistSearch: false,
  },
  notFoundComponent: CountryNotFound,
  component: CountryDetailPage,
});

function CountryDetailPage() {
  const { countryId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: entity } = useSuspenseQuery(countryQueries.detail(countryId));
  const updateMutation = useUpdateEntity(countryService, countryMutationOptions);

  const details = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      {([['States', entity.stateCount], ['Employees', entity.employeeCount]] as const).map(([label, value]) => (
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
          <Link to="/countries">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 rounded-lg border bg-card p-6">
        {details}
        <GenericActionGuard permissions={[COUNTRY_PERMISSIONS.write]}>
          <CountryForm
            key={entity.id}
            defaultValues={toCountryFormValues(entity)}
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
            service={countryService}
            entity={entity}
            label={entity.name}
            size="default"
            permissions={[COUNTRY_PERMISSIONS.delete]}
            mutationOptions={countryMutationOptions}
            onDeleted={() => void navigate({ to: '/countries' })}
          />
        </div>
      </div>
    </section>
  );
}

function CountryNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">Country not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <div>
        <Button variant="outline" asChild>
          <Link to="/countries">Back to countries</Link>
        </Button>
      </div>
    </div>
  );
}
