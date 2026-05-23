export const SUPERADMIN_EMAIL = 'vjuanan@gmail.com';

export type AppRole = 'superadmin' | 'admin' | 'nutritionist' | 'patient';
export type LegacyRole = 'admin' | 'coach' | 'athlete' | 'gym' | 'nutritionist' | 'patient' | null | undefined;

export function normalizeRole(role: LegacyRole): Exclude<AppRole, 'superadmin'> {
  if (role === 'admin') return 'admin';
  if (role === 'patient' || role === 'athlete') return 'patient';
  return 'nutritionist';
}

export function isSuperAdminEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === SUPERADMIN_EMAIL;
}

export function resolveAppRole(email: string | null | undefined, role: LegacyRole): AppRole {
  if (isSuperAdminEmail(email)) return 'superadmin';
  return normalizeRole(role);
}

