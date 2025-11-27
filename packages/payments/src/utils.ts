import type { PaymentsConfig } from '@aweto-agent/types/payments';

/**
 * Creates PaymentsConfig from environment variables and optional overrides.
 *
 * @param configOverrides - Optional config overrides from agent-kit config
 * @returns PaymentsConfig resolved from env + overrides
 */
export function paymentsFromEnv(configOverrides?: Partial<PaymentsConfig>): PaymentsConfig {
  return {
    payTo: configOverrides?.payTo ?? (process.env.PAYMENTS_RECEIVABLE_ADDRESS as any),
    facilitatorUrl: configOverrides?.facilitatorUrl ?? (process.env.FACILITATOR_URL as any),
    network: configOverrides?.network ?? (process.env.NETWORK as any),
  };
}

