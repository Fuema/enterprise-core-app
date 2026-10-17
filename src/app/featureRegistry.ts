import { useQuery } from '@tanstack/react-query';
import type { LinkProps } from '@tanstack/react-router';
import { Building2, Globe2, Map as MapIcon, UserCog, Users, type LucideIcon } from 'lucide-react';
import { EMPLOYEE_PERMISSIONS } from '@/features/employees/types/employee';
import { employeeQueries } from '@/features/employees/services/employeeService';
import { cityQueries } from '@/features/locations/cities/services/cityService';
import { CITY_PERMISSIONS } from '@/features/locations/cities/types/city';
import { countryQueries } from '@/features/locations/countries/services/countryService';
import { COUNTRY_PERMISSIONS } from '@/features/locations/countries/types/country';
import { stateQueries } from '@/features/locations/states/services/stateService';
import { STATE_PERMISSIONS } from '@/features/locations/states/types/state';
import { userQueries } from '@/features/users/services/userService';
import { USER_PERMISSIONS } from '@/features/users/types/user';

/** Smallest page: we only need `totalCount`. */
const COUNT_FILTER = { page: 1, pageSize: 1 } as const;

export interface FeaturePermissions {
  read: string;
  write: string;
  /** Omitted when the feature has no delete (e.g. users are deactivated instead). */
  delete?: string;
}

export interface FeatureEntry {
  key: string;
  label: string;
  description: string;
  to: LinkProps['to'];
  icon: LucideIcon;
  permissions: FeaturePermissions;
  /** Total records (only called where the user holds `permissions.read`). */
  useCount: () => number | undefined;
}

/**
 * Composition root for navigation and the dashboard: ONE entry per feature.
 * Header links, dashboard cards and the access matrix are all generated from
 * this list, each guarded by the feature's own permission scopes.
 * Adding a feature = add its routes + one entry here (see agents.md procedure).
 */
export const FEATURES: readonly FeatureEntry[] = [
  {
    key: 'employees',
    label: 'Employees',
    description: 'Browse, search and manage employee records.',
    to: '/employees',
    icon: Users,
    permissions: EMPLOYEE_PERMISSIONS,
    useCount: () => useQuery({ ...employeeQueries.list(COUNT_FILTER), select: (page) => page.totalCount }).data,
  },
  {
    key: 'countries',
    label: 'Countries',
    description: 'Countries available to states, cities and employees.',
    to: '/countries',
    icon: Globe2,
    permissions: COUNTRY_PERMISSIONS,
    useCount: () => useQuery({ ...countryQueries.list(COUNT_FILTER), select: (page) => page.totalCount }).data,
  },
  {
    key: 'states',
    label: 'States',
    description: 'States and provinces, grouped by country.',
    to: '/states',
    icon: MapIcon,
    permissions: STATE_PERMISSIONS,
    useCount: () => useQuery({ ...stateQueries.list(COUNT_FILTER), select: (page) => page.totalCount }).data,
  },
  {
    key: 'cities',
    label: 'Cities',
    description: 'Cities, grouped by state and country.',
    to: '/cities',
    icon: Building2,
    permissions: CITY_PERMISSIONS,
    useCount: () => useQuery({ ...cityQueries.list(COUNT_FILTER), select: (page) => page.totalCount }).data,
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Accounts, roles and per-feature permissions.',
    to: '/users',
    icon: UserCog,
    permissions: USER_PERMISSIONS,
    useCount: () => useQuery({ ...userQueries.list(COUNT_FILTER), select: (page) => page.totalCount }).data,
  },
];
