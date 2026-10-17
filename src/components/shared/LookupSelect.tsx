import type { ComponentProps } from 'react';
import { NativeSelect } from '@/components/ui/NativeSelect';
import type { LookupItem } from '@/services/lookupService';

type NativeSelectProps = Omit<ComponentProps<typeof NativeSelect>, 'value' | 'onChange' | 'children'>;

export interface LookupSelectProps extends NativeSelectProps {
  /** Items from lookupQueries.list(...). `undefined` while loading. */
  items: readonly LookupItem[] | undefined;
  /** Selected id; 0 / undefined means "nothing selected". */
  value: number | undefined;
  onValueChange: (id: number) => void;
  /** First, empty option ("Select a country…", "All countries"). */
  placeholder: string;
  isLoading?: boolean;
}

/**
 * Native <select> bound to a numeric id. Works inside <FormControl> (React Hook
 * Form) and as a stand-alone toolbar filter. Emits 0 for the empty option.
 */
export function LookupSelect({ items, value, onValueChange, placeholder, isLoading = false, disabled, ...props }: LookupSelectProps) {
  return (
    <NativeSelect
      {...props}
      disabled={disabled ?? false}
      aria-busy={isLoading}
      value={value && value > 0 ? String(value) : ''}
      onChange={(event) => onValueChange(Number(event.target.value) || 0)}
    >
      <option value="">{isLoading ? 'Loading…' : placeholder}</option>
      {items?.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </NativeSelect>
  );
}
