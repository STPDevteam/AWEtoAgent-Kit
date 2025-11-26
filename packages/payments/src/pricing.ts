import type { EntrypointDef } from '@AWEtoAgent/types/core';
import type { PaymentsConfig } from '@AWEtoAgent/types/payments';

/**
 * Resolves the price for an entrypoint.
 * Returns null if no price is explicitly set on the entrypoint.
 */
export function resolvePrice(
  entrypoint: EntrypointDef,
  payments: PaymentsConfig | undefined,
  which: 'invoke' | 'stream'
): string | null {
  if (!entrypoint.price) {
    return null;
  } else if (typeof entrypoint.price === 'string') {
    return entrypoint.price;
  } else {
    return entrypoint.price[which] ?? null;
  }
}
