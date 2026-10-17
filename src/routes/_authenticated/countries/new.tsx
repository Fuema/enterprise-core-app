import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';
import { requirePermissions } from '@/features/auth/guards';
import { CountryForm } from '@/features/locations/countries/forms/CountryForm';
import { emptyCountryForm } from '@/features/locations/countries/forms/countryFormSchema';
import { countryMutationOptions, countryService } from '@/features/locations/countries/services/countryService';
import { COUNTRY_PERMISSIONS } from '@/features/locations/countries/types/country';
import { useCreateEntity } from '@/hooks/useEntityMutations';

export const Route = createFileRoute('/_authenticated/countries/new')({
  staticData: { breadcrumb: 'New country', persistSearch: false },
  beforeLoad: requirePermissions([COUNTRY_PERMISSIONS.write]),
  component: NewCountryPage,
});

function NewCountryPage() {
  const navigate = Route.useNavigate();
  const createMutation = useCreateEntity(countryService, countryMutationOptions);

  return (
    <section className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">New country</h1>
      <div className="rounded-lg border bg-card p-6">
        <CountryForm
          defaultValues={emptyCountryForm}
          submitLabel="Create country"
          onSubmit={async (values) => {
            const created = await createMutation.mutateAsync(values);
            await navigate({ to: '/countries/$countryId', params: { countryId: created.id } });
          }}
          actions={
            <Button variant="ghost" asChild>
              <Link to="/countries">Cancel</Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}
