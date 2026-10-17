import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';

export const Route = createFileRoute('/forbidden')({
  staticData: { persistSearch: false },
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="mx-auto my-16 grid max-w-md gap-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">403</p>
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-muted-foreground">Your account does not have permission to view this page.</p>
      <div>
        <Button asChild variant="outline">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
