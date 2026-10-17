import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { GenericDeleteButton } from '@/components/shared/GenericDeleteButton';
import { Button } from '@/components/ui/Button';
import { CityForm } from '@/features/locations/cities/forms/CityForm';
import { toCityFormValues, toCityInput } from '@/features/locations/cities/forms/cityFormSchema';
import { cityMutationOptions, cityQueries, cityService } from '@/features/locations/cities/services/cityService';
import { CITY_PERMISSIONS, citySchema } from '@/features/locations/cities/types/city';
import { useUpdateEntity } from '@/hooks/useEntityMutations';
import { ApiError } from '@/lib/apiError';

export const Route = createFileRoute('/_authenticated/cities/$cityId')({
  params: {
    parse: ({ cityId }) => ({ cityId: Number(cityId) }),
    stringify: ({ cityId }) => ({ cityId: String(cityId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.cityId) || params.cityId <= 0) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(cityQueries.detail(params.cityId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  staticData: {
    breadcrumb: ({ loaderData }) => {
      const parsed = citySchema.safeParse(loaderData);
      return parsed.success ? parsed.data.name : 'City';
    },
    persistSearch: false,
  },
  notFoundComponent: CityNotFound,
  component: CityDetailPage,
});

function CityDetailPage() {
  const { cityId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: entity } = useSuspenseQuery(cityQueries.detail(cityId));
  const updateMutation = useUpdateEntity(cityService, cityMutationOptions);

  const details = (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      {([['State', entity.stateName], ['Country', entity.countryName], ['Employees', entity.employeeCount]] as const).map(([label, value]) => (
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
          <Link to="/cities">
            <ArrowLeft />
            Back to list
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 rounded-lg border bg-card p-6">
        {details}
        <GenericActionGuard permissions={[CITY_PERMISSIONS.write]}>
          <CityForm
            key={entity.id}
            defaultValues={toCityFormValues(entity)}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({ id: entity.id, payload: toCityInput(values) });
            }}
            actions={
              updateMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>
            }
          />
        </GenericActionGuard>
        <div className="flex justify-end">
          <GenericDeleteButton
            service={cityService}
            entity={entity}
            label={entity.name}
            size="default"
            permissions={[CITY_PERMISSIONS.delete]}
            mutationOptions={cityMutationOptions}
            onDeleted={() => void navigate({ to: '/cities' })}
          />
        </div>
      </div>
    </section>
  );
}

function CityNotFound() {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-xl font-semibold">City not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <div>
        <Button variant="outline" asChild>
          <Link to="/cities">Back to cities</Link>
        </Button>
      </div>
    </div>
  );
}
