import { useQuery } from '@tanstack/react-query';
import { getMe, type Role } from '../api/client';

export function useSession() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  });
}

/** Roles that may access courier rate cards + reports/audit + user admin. */
export const canManage = (role?: Role) => role === 'ADMIN' || role === 'MANAGEMENT';
export const isAdmin = (role?: Role) => role === 'ADMIN';
