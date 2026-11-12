import type { Locator, Page } from '@playwright/test';

type SgeRole = Parameters<Page['getByRole']>[0];
type SgeRoleOptions = NonNullable<Parameters<Page['getByRole']>[1]>;

/**
 * Finds a role in SGE even when a parent is marked aria-hidden by the page.
 * Callers must still assert visibility before interacting with the element.
 */
export function getByRoleSge(
  scope: Page | Locator,
  role: SgeRole,
  options: SgeRoleOptions = {},
): Locator {
  return scope.getByRole(role, { ...options, includeHidden: true });
}
