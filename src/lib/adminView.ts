/**
 * Admin View Mode helpers
 * 
 * When admin clicks "Lihat sebagai User" from the admin dashboard,
 * we set sessionStorage flag `adminViewMode = 'true'`.
 * This gives admin a read-only view of the whole app (no buy/sell),
 * showing ALL products from all campuses without filtering.
 */

export const ADMIN_VIEW_KEY = 'adminViewMode';
export const ADMIN_AUTH_KEY = 'adminAuth';

export function isAdminViewMode(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_VIEW_KEY) === 'true';
}

export function enterAdminViewMode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_VIEW_KEY, 'true');
}

export function exitAdminViewMode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_VIEW_KEY);
}
