import { NextResponse } from 'next/server';
import { validateSession } from './auth';
import type { User, UserRole } from '@/types/database';

type RoleCheck = Pick<User, 'role' | 'is_admin'>;

/**
 * True if the user is an effective admin. Honors both the legacy `is_admin`
 * flag and the newer `role` column, since a user may have only one of the two
 * set (e.g. role changed via the admin panel without is_admin being synced).
 */
export function isAdmin(user: RoleCheck | null | undefined): boolean {
  return !!user && (user.is_admin === true || user.role === 'admin');
}

/**
 * True if the user's role is one of `allowed`. Admins always pass, regardless
 * of `allowed`, since admin is the superset role.
 */
export function hasRole(user: RoleCheck | null | undefined, allowed: UserRole[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return !!user.role && allowed.includes(user.role);
}

type AuthResult = { user: User; response?: undefined } | { user?: undefined; response: NextResponse };

/**
 * Validate the session and require the caller's role to be one of `allowed`.
 * Callers should check `if (auth.response) return auth.response;` then use
 * `auth.user`.
 */
export async function requireRole(request: Request, allowed: UserRole[]): Promise<AuthResult> {
  const user = await validateSession(request);
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasRole(user, allowed)) {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { user };
}

/** Shorthand for admin-only endpoints. */
export function requireAdmin(request: Request): Promise<AuthResult> {
  return requireRole(request, ['admin']);
}
