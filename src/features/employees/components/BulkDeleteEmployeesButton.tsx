import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/lib/apiError';
import { employeeService } from '../services/employeeService';
import { EMPLOYEE_PERMISSIONS, type EmployeeId } from '../types/employee';

interface BulkDeleteEmployeesButtonProps {
  /** Selected ids (from the table's URL `selected` param). Hidden when empty. */
  ids: readonly EmployeeId[];
  /** Called after a successful delete, e.g. to clear the selection. */
  onDeleted: (deletedCount: number) => void;
}

/** "Delete selected" with inline confirmation; requires `employees:delete`. */
export function BulkDeleteEmployeesButton({ ids, onDeleted }: BulkDeleteEmployeesButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation<number, ApiError, readonly EmployeeId[]>({
    mutationFn: (selected) => employeeService.deleteMany(selected),
    onSuccess: async (deletedCount, selected) => {
      for (const id of selected) queryClient.removeQueries({ queryKey: employeeService.keys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: employeeService.keys.lists() });
      setConfirming(false);
      onDeleted(deletedCount);
    },
  });

  if (ids.length === 0) return null;
  const label = `Delete selected (${String(ids.length)})`;

  return (
    <GenericActionGuard permissions={[EMPLOYEE_PERMISSIONS.delete]}>
      {confirming ? (
        <span className="inline-flex items-center gap-1">
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate(ids)}>
            Confirm delete {ids.length}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          {mutation.isError && <span className="text-xs text-destructive">{mutation.error.detail ?? mutation.error.title}</span>}
        </span>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          <Trash2 />
          {label}
        </Button>
      )}
    </GenericActionGuard>
  );
}
