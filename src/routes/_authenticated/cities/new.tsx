import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { requirePermissions } from '@/features/auth/guards';
import { CityForm } from '@/features/locations/cities/forms/CityForm';
import { emptyCityForm, toCityInput } from '@/features/locations/cities/forms/cityFormSchema';
import { cityMutationOptions, cityService } from '@/features/locations/cities/services/cityService';
import { CITY_PERMISSIONS } from '@/features/locations/cities/types/city';
import { useCreateEntity } from '@/hooks/useEntityMutations';

export const Route = createFileRoute('/_authenticated/cities/new')({
  staticData: { breadcrumb: 'New city', persistSearch: false },
  beforeLoad: requirePermissions([CITY_PERMISSIONS.write]),
  component: NewCityPage,
});

function NewCityPage() {
  const navigate = Route.useNavigate();
  const createMutation = useCreateEntity(cityService, cityMutationOptions);

  return (
    <section className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New city</h1>
      <div className="rounded-lg border bg-card p-6">
        <CityForm
          defaultValues={emptyCityForm}
          submitLabel="Create city"
          onSubmit={async (values) => {
            const created = await createMutation.mutateAsync(toCityInput(values));
            await navigate({ to: '/cities/$cityId', params: { cityId: created.id } });
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/cities">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
