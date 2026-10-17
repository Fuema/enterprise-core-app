import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { GenericActionGuard } from '@/components/shared/GenericActionGuard';
import { Button } from '@/components/ui/Button';
import { useDeleteEntity } from '@/hooks/useEntityMutations';
import { employeeService } from '../services/employeeService';
import { EMPLOYEE_PERMISSIONS, employeeFullName, type Employee } from '../types/employee';

interface DeleteEmployeeButtonProps {
  employee: Employee;
  onDeleted?: () => void;
  size?: 'sm' | 'default';
}

/**
 * Two-step inline confirmation (no blocking window.confirm), visible only to
 * users holding `employees:delete`.
 */
export function DeleteEmployeeButton({ employee, onDeleted, size = 'sm' }: DeleteEmployeeButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const deleteMutation = useDeleteEntity(employeeService);

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync(employee.id);
    setConfirming(false);
    onDeleted?.();
  };

  return (
    <GenericActionGuard permissions={[EMPLOYEE_PERMISSIONS.delete]}>
      {confirming ? (
        <span className="inline-flex items-center gap-1">
          <Button
            variant="destructive"
            size={size}
            disabled={deleteMutation.isPending}
            onClick={() => void confirmDelete()}
            aria-label={`Confirm delete ${employeeFullName(employee)}`}
          >
            Confirm
          </Button>
          <Button variant="ghost" size={size} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          {deleteMutation.isError && <span className="text-xs text-destructive">{deleteMutation.error.detail ?? deleteMutation.error.title}</span>}
        </span>
      ) : (
        <Button
          variant="ghost"
          size={size}
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${employeeFullName(employee)}`}
        >
          <Trash2 />
          {size === 'default' && 'Delete'}
        </Button>
      )}
    </GenericActionGuard>
  );
}
