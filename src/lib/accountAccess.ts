import type { User } from '@/types/database';

type Account = Pick<User, 'role' | 'is_admin' | 'is_approved' | 'stripe_customer_id' | 'subscription_status'>;

export function getEffectiveRole(user: Pick<Account, 'role' | 'is_admin'> | null | undefined): User['role'] {
  return user?.is_admin === true ? 'admin' : user?.role || 'viewer';
}

export function hasAdminConsoleAccess(user: Pick<Account, 'role' | 'is_admin'>): boolean {
  return ['admin', 'opportunity_manager', 'sales_member'].includes(getEffectiveRole(user));
}

/** Dashboard entitlement is separate from a paid Stripe subscription. */
export function hasDashboardAccess(user: Account, hasSubscriptionRecord: boolean): boolean {
  if (user.is_admin === true || user.role === 'admin') return true;
  if (user.is_approved !== true) return false;
  if (hasAdminConsoleAccess(user)) return true;
  if (user.subscription_status === 'active') return true;

  // Public registration is closed: approved accounts without any billing
  // relationship are managed by the admin. Existing/canceled billing accounts
  // must still go through the subscription renewal flow.
  return !hasSubscriptionRecord && !user.stripe_customer_id &&
    (user.subscription_status == null || user.subscription_status === 'inactive');
}

export function getLoginDestination(
  user: Pick<Account, 'role' | 'is_admin'>,
  access: { hasDashboardAccess: boolean; hasAnySubscription: boolean },
): string {
  if (hasAdminConsoleAccess(user)) return '/admin';
  if (access.hasDashboardAccess) return '/dashboard';
  return access.hasAnySubscription ? '/dashboard/settings' : '/membership';
}
