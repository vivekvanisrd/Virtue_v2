import { AsyncLocalStorage } from "async_hooks";

/**
 * Global tenancy storage for the current request.
 * Stores schoolId and branchId securely.
 */
export interface TenantStore {
  schoolId: string;
  branchId: string;
  role: string;
  isGlobalDev?: boolean;
}

export const tenancyStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Helper to get the current tenant context within a request.
 */
export function getCurrentTenant() {
  return tenancyStorage.getStore();
}

/**
 * Runs a function within a specific tenancy context.
 */
export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return tenancyStorage.run(store, fn);
}
