import type { Express, RequestHandler } from 'express';
import { paymentMiddleware } from 'x402-express';
import type { FacilitatorConfig } from 'x402/types';
import type { EntrypointDef } from '@aweto-agent/types/core';
import type { PaymentsConfig } from '@aweto-agent/types/payments';
import { resolvePrice, validatePaymentsConfig } from '@aweto-agent/payments';
import { toJsonSchemaOrUndefined } from '@aweto-agent/core/utils';

type PaymentMiddlewareFactory = typeof paymentMiddleware;

export type WithPaymentsParams = {
  app: Express;
  path: string;
  entrypoint: EntrypointDef;
  kind: 'invoke' | 'stream';
  payments?: PaymentsConfig;
  facilitator?: FacilitatorConfig;
  middlewareFactory?: PaymentMiddlewareFactory;
};

export function withPayments({
  app,
  path,
  entrypoint,
  kind,
  payments,
  facilitator,
  middlewareFactory = paymentMiddleware,
}: WithPaymentsParams): boolean {
  if (!payments) return false;

  const network = entrypoint.network ?? payments.network;
  const price = resolvePrice(entrypoint, payments, kind);

  validatePaymentsConfig(payments, network, entrypoint.key);

  if (!price) return false;
  if (!payments.payTo) return false;

  const requestSchema = toJsonSchemaOrUndefined(entrypoint.input);
  const responseSchema = toJsonSchemaOrUndefined(entrypoint.output);

  const description =
    entrypoint.description ??
    `${entrypoint.key}${kind === 'stream' ? ' (stream)' : ''}`;
  const postMimeType =
    kind === 'stream' ? 'text/event-stream' : 'application/json';
  const inputSchema = {
    bodyType: 'json' as const,
    ...(requestSchema ? { bodyFields: { input: requestSchema } } : {}),
  };
  const outputSchema =
    kind === 'invoke' && responseSchema
      ? { output: responseSchema }
      : undefined;

  const resolvedFacilitator: FacilitatorConfig =
    facilitator ??
    ({ url: payments.facilitatorUrl } satisfies FacilitatorConfig);

  const postRoute = {
    price,
    network,
    config: {
      description,
      mimeType: postMimeType,
      discoverable: true,
      inputSchema,
      outputSchema,
    },
  };

  const getRoute = {
    price,
    network,
    config: {
      description,
      mimeType: 'application/json',
      discoverable: true,
      inputSchema,
      outputSchema,
    },
  };

  const middleware = middlewareFactory(
    payments.payTo as Parameters<PaymentMiddlewareFactory>[0],
    {
      [`POST ${path}`]: postRoute,
      [`GET ${path}`]: getRoute,
    },
    resolvedFacilitator
  ) as unknown as RequestHandler;

  app.use((req, res, next) => {
    const reqPath = req.path ?? req.url ?? '';
    if (
      reqPath === path ||
      reqPath.startsWith(`${path}/`) ||
      req.originalUrl === path ||
      req.originalUrl?.startsWith(`${path}?`)
    ) {
      return middleware(req, res, next);
    }
    return next();
  });
  return true;
}
