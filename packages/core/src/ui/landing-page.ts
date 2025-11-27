import { resolvePrice } from '@AWEtoAgent/payments';
import type { AgentMeta } from '@AWEtoAgent/types/core';
import type { PaymentsConfig } from '@AWEtoAgent/types/payments';
import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';

import type { EntrypointDef } from '../http/types';
import { toJsonSchemaOrUndefined } from '../utils';

type LandingPageOptions = {
  meta: AgentMeta;
  origin: string;
  entrypoints: EntrypointDef[];
  activePayments?: PaymentsConfig;
  manifestPath: string;
  faviconDataUrl: string;
  x402ClientExample: string;
};

const sampleFromJsonSchema = (
  schema: any,
  root: any,
  stack: Set<unknown>
): unknown => {
  if (!schema || typeof schema !== 'object') return undefined;
  if (stack.has(schema)) {
    return undefined;
  }
  stack.add(schema);

  const { type } = schema;
  let result: unknown;

  if (schema.const !== undefined) {
    result = schema.const;
  } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    result = schema.enum[0];
  } else if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const resolved = schema.anyOf.find((item: unknown) => item !== schema);
    result = resolved
      ? sampleFromJsonSchema(resolved, root, stack)
      : sampleFromJsonSchema(schema.anyOf[0], root, stack);
  } else if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const part = schema.oneOf.find((item: unknown) => item !== schema);
    result = part
      ? sampleFromJsonSchema(part, root, stack)
      : sampleFromJsonSchema(schema.oneOf[0], root, stack);
  } else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const composite = schema.allOf.reduce(
      (acc: any, current: any) => {
        if (current && typeof current === 'object') {
          Object.assign(acc, current);
        }
        return acc;
      },
      {} as Record<string, unknown>
    );
    result = sampleFromJsonSchema(composite, root, stack);
  } else if (schema.$ref && typeof schema.$ref === 'string') {
    const refPath = schema.$ref.replace(/^#\//, '').split('/');
    let resolved: any = root;
    for (const segment of refPath) {
      if (!resolved || typeof resolved !== 'object') break;
      resolved = resolved[segment];
    }
    result = sampleFromJsonSchema(resolved, root, stack);
  } else if (Array.isArray(schema.type)) {
    result = sampleFromJsonSchema(
      { ...schema, type: schema.type[0] },
      root,
      stack
    );
  } else if (schema.properties && typeof schema.properties === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === 'object') {
        const optional = Array.isArray(schema.required)
          ? !schema.required.includes(key)
          : false;
        if (optional) continue;
        obj[key] = sampleFromJsonSchema(propSchema, root, stack);
      }
    }
    if (
      schema.additionalProperties === true &&
      schema.patternProperties === undefined
    ) {
      obj.example = 'value';
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      obj.example = sampleFromJsonSchema(
        schema.additionalProperties,
        root,
        stack
      );
    }
    result = obj;
  } else if (schema.items) {
    const itemsSchema = Array.isArray(schema.items)
      ? schema.items[0]
      : schema.items;
    result = [sampleFromJsonSchema(itemsSchema ?? {}, root, stack) ?? 'value'];
  } else {
    switch (type) {
      case 'array': {
        result = ['example'];
        break;
      }
      case 'object': {
        result = {};
        break;
      }
      case 'string': {
        if (Array.isArray(schema.examples) && schema.examples.length) {
          result = schema.examples[0];
          break;
        }
        if (schema.format === 'email') {
          result = 'agent@example.com';
        } else if (schema.format === 'uri' || schema.format === 'url') {
          result = 'https://example.com';
        } else {
          result = schema.description ? `<${schema.description}>` : 'string';
        }
        break;
      }
      case 'integer':
      case 'number': {
        if (typeof schema.minimum === 'number') {
          result = schema.minimum;
        } else if (typeof schema.maximum === 'number') {
          result = schema.maximum;
        } else if (Array.isArray(schema.examples) && schema.examples.length) {
          result = schema.examples[0];
        } else {
          result = 0;
        }
        break;
      }
      case 'boolean':
        result = true;
        break;
      case 'null':
        result = null;
        break;
      default:
        result = schema.description
          ? `<${schema.description}>`
          : schema.type === 'null'
            ? null
            : 'value';
    }
  }

  stack.delete(schema);
  return result;
};

const buildExampleFromJsonSchema = (schema: unknown): unknown => {
  if (!schema || typeof schema !== 'object') return undefined;
  return sampleFromJsonSchema(schema, schema, new Set());
};

export const renderLandingPage = ({
  meta,
  origin,
  entrypoints,
  activePayments,
  manifestPath,
  faviconDataUrl,
  x402ClientExample,
}: LandingPageOptions): HtmlEscapedString | Promise<HtmlEscapedString> => {
  const entrypointCount = entrypoints.length;
  const entrypointLabel = entrypointCount === 1 ? 'Entrypoint' : 'Entrypoints';
  const hasPayments = Boolean(activePayments);
  const defaultNetwork = activePayments?.network;

  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#0c2713" />
        <link rel="icon" type="image/svg+xml" href="${faviconDataUrl}" />
        <title>${meta.name}</title>

        <!-- Open Graph tags for social sharing and x402scan discovery -->
        <meta property="og:title" content="${meta.name}" />
        ${meta.description
          ? html`<meta
              property="og:description"
              content="${meta.description}"
            />`
          : ''}
        ${meta.image
          ? html`<meta property="og:image" content="${meta.image}" />`
          : ''}
        <meta property="og:url" content="${meta.url || origin}" />
        <meta property="og:type" content="${meta.type || 'website'}" />

        <style>
          :root {
            color-scheme: light dark;
            font-family:
              'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'SFMono-Regular',
              Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
              monospace;
            background-color: #0c2713;
            color: #e6f4ea;
            --surface: rgba(10, 31, 17, 0.95);
            --surface-subtle: rgba(10, 31, 17, 0.85);
            --border: rgba(118, 173, 139, 0.3);
            --border-soft: rgba(118, 173, 139, 0.18);
            --accent: #6de8a5;
            --accent-soft: rgba(109, 232, 165, 0.18);
            --muted: rgba(211, 237, 221, 0.72);
            --muted-strong: rgba(211, 237, 221, 0.87);
          }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 3rem 1.5rem 4rem;
            background: radial-gradient(circle at top, #154725 0%, #0c2713 60%);
          }
          main {
            width: 100%;
            max-width: 1000px;
            display: flex;
            flex-direction: column;
            gap: 2.75rem;
          }
          section {
            border-radius: 0;
            border: 1px solid var(--border);
            background: var(--surface);
            box-shadow: 0 34px 60px rgba(6, 18, 11, 0.35);
            padding: clamp(1.75rem, 4vw, 2.75rem);
          }
          .hero {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            background:
              linear-gradient(135deg, rgba(17, 51, 29, 0.92), #0c2713),
              radial-gradient(
                circle at top right,
                rgba(109, 232, 165, 0.22),
                transparent 45%
              );
            border: 1px solid var(--border);
          }
          .hero-header {
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .hero-logo {
            flex: 0 0 auto;
            width: 84px;
            height: 84px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 0.65rem;
            color: var(--accent);
          }
          .hero-logo span {
            pointer-events: none;
          }
          .hero-meta {
            display: grid;
            gap: 0.85rem;
          }
          h1 {
            margin: 0;
            font-size: clamp(2rem, 5vw, 2.85rem);
            letter-spacing: -0.03em;
            font-weight: 600;
          }
          .hero p {
            margin: 0;
            color: var(--muted-strong);
            line-height: 1.7;
            max-width: 60ch;
          }
          .hero-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          .hero-domain {
            display: inline-flex;
            align-items: center;
            padding: 0.45rem 0.75rem;
            border: 1px solid rgba(109, 232, 165, 0.4);
            background: rgba(12, 39, 19, 0.55);
            color: var(--accent);
            font-size: 0.85rem;
            text-decoration: none;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .hero-domain:hover,
          .hero-domain:focus-visible {
            border-color: rgba(109, 232, 165, 0.7);
          }
          .hero-stats {
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            list-style: none;
          }
          .hero-stats li {
            min-width: 160px;
            padding: 0.9rem 1rem;
            border-radius: 0;
            border: 1px solid var(--border-soft);
            background: rgba(23, 63, 36, 0.6);
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .hero-stats .stat-value {
            font-size: 1.35rem;
            font-weight: 600;
          }
          .hero-stats .stat-label {
            font-size: 0.82rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8rem;
          }
          .button {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.75rem 1.15rem;
            border-radius: 0;
            font-weight: 500;
            text-decoration: none;
            font-size: 0.95rem;
            transition:
              transform 150ms ease,
              box-shadow 150ms ease;
            border: 1px solid rgba(109, 232, 165, 0.4);
            background: rgba(12, 39, 19, 0.75);
            color: #cff9dd;
          }
          .button:hover,
          .button:focus-visible {
            transform: translateY(-1px);
            box-shadow: 0 16px 32px rgba(6, 18, 11, 0.35);
            border-color: rgba(109, 232, 165, 0.7);
          }
          .button--outline {
            background: transparent;
            border-color: rgba(109, 232, 165, 0.32);
            color: var(--muted-strong);
          }
          .button--outline:hover,
          .button--outline:focus-visible {
            background: rgba(12, 39, 19, 0.65);
          }
          .button--small {
            padding: 0.55rem 0.9rem;
            font-size: 0.85rem;
          }
          .entrypoints header {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            margin-bottom: 1.5rem;
          }
          .entrypoints h2 {
            margin: 0;
            font-size: clamp(1.5rem, 3vw, 1.9rem);
            letter-spacing: -0.02em;
          }
          .entrypoints p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
          }
          .entrypoint-grid {
            display: grid;
            gap: 1.5rem;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          .entrypoint-card {
            border-radius: 0;
            border: 1px solid var(--border);
            background: var(--surface-subtle);
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1.4rem 1.5rem 1.6rem;
            position: relative;
            overflow: hidden;
          }
          .entrypoint-card::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            border-radius: inherit;
            border: 1px solid transparent;
            background: linear-gradient(
                120deg,
                rgba(109, 232, 165, 0.3),
                rgba(109, 232, 165, 0)
              )
              border-box;
            mask:
              linear-gradient(#fff, #fff) padding-box,
              linear-gradient(#fff, #fff);
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 200ms ease;
          }
          .entrypoint-card:hover::after,
          .entrypoint-card:focus-within::after {
            opacity: 1;
          }
          .entrypoint-card header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
          }
          .entrypoint-card h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: -0.01em;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #f8fafc;
          }
          .entrypoint-card p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
          }
          .badge {
            font-size: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 0.35rem 0.7rem;
            border-radius: 0;
            border: 1px solid rgba(148, 163, 184, 0.3);
            background: rgba(148, 163, 184, 0.12);
            color: var(--muted-strong);
            white-space: nowrap;
          }
          .badge--streaming {
            border-color: rgba(109, 232, 165, 0.4);
            background: var(--accent-soft);
            color: var(--accent);
          }
          .card-meta {
            margin-top: auto;
            display: grid;
            gap: 0.75rem;
          }
          .card-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            margin-top: 1rem;
          }
          .schema-section {
            margin-top: 1rem;
            display: grid;
            gap: 0.75rem;
          }
          .schema-block {
            border: 1px solid var(--border);
            background: rgba(12, 39, 19, 0.7);
            padding: 0.9rem 1rem 1rem;
          }
          .schema-block summary {
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 1rem;
            font-size: 0.85rem;
            color: var(--muted-strong);
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .schema-block summary::-webkit-details-marker {
            display: none;
          }
          .schema-block summary::after {
            content: '⌄';
            font-size: 0.75rem;
            transform: rotate(-90deg);
            transition: transform 200ms ease;
            opacity: 0.6;
          }
          .schema-block[open] summary::after {
            transform: rotate(0deg);
          }
          .schema-block pre {
            margin: 0.9rem 0 0;
            padding: 0.85rem 0.75rem;
            background: rgba(7, 21, 12, 0.9);
            border: 1px solid rgba(118, 173, 139, 0.28);
            max-height: 220px;
            overflow: auto;
            font-size: 0.75rem;
            line-height: 1.55;
          }
          .schema-note {
            margin: 0;
            font-size: 0.8rem;
            color: var(--muted);
          }
          .example-section {
            display: grid;
            gap: 1.25rem;
          }
          .example-section h2 {
            margin: 0;
            font-size: clamp(1.4rem, 3vw, 1.8rem);
            letter-spacing: -0.02em;
            color: var(--muted-strong);
          }
          .example-section p {
            margin: 0;
            color: var(--muted);
            line-height: 1.6;
          }
          .example-section pre {
            margin: 0;
            padding: 1.35rem;
            border: 1px solid rgba(118, 173, 139, 0.35);
            background: rgba(7, 21, 12, 0.88);
            font-size: 0.78rem;
            line-height: 1.6;
            overflow-x: auto;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }
          .meta-label {
            font-size: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .meta-value {
            font-size: 0.9rem;
            color: var(--muted-strong);
          }
          .meta-value code {
            font-family:
              'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular,
              Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
              monospace;
            font-size: 0.82rem;
            padding: 0.25rem 0.45rem;
            border-radius: 0;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(148, 163, 184, 0.2);
            color: #e2e8f0;
          }
          .empty-state {
            margin: 0;
            padding: 1.5rem;
            border-radius: 0;
            border: 1px dashed rgba(118, 173, 139, 0.4);
            background: rgba(12, 39, 19, 0.55);
            color: var(--muted);
            text-align: center;
          }
          .manifest {
            display: grid;
            gap: 0.75rem;
          }
          .manifest header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .manifest h2 {
            margin: 0;
            font-size: clamp(1.4rem, 3vw, 1.8rem);
            letter-spacing: -0.02em;
          }
          .manifest-status {
            font-size: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .manifest pre {
            margin: 1.2rem 0 0;
            padding: 1.25rem;
            border-radius: 0;
            border: 1px solid rgba(118, 173, 139, 0.3);
            background: rgba(7, 21, 12, 0.86);
            overflow-x: auto;
            max-height: 420px;
            color: #e2e8f0;
            font-size: 0.8rem;
            line-height: 1.6;
          }
          a {
            color: var(--accent);
          }
          .footer {
            margin-top: 2rem;
            padding: 1.5rem 2rem;
            border: 1px solid var(--border);
            background: rgba(10, 31, 17, 0.65);
            display: flex;
            flex-wrap: wrap;
            gap: 1.25rem;
            justify-content: space-between;
            align-items: center;
          }
          .footer span {
            font-size: 0.85rem;
            color: var(--muted);
          }
          .footer-links {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .footer-links a {
            font-size: 0.85rem;
            text-decoration: none;
            border-bottom: 1px solid transparent;
          }
          .footer-links a:hover,
          .footer-links a:focus-visible {
            border-color: var(--accent);
          }
          @media (max-width: 640px) {
            body {
              padding: 2.5rem 1rem 3rem;
            }
            .hero-stats li {
              min-width: 45%;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              transition-duration: 0.01ms !important;
              animation-duration: 0.01ms !important;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <section class="hero">
                <h1>${meta.name}</h1>
                ${meta.description
                  ? html`<p>${meta.description}</p>`
                  : html`<p>No description provided yet.</p>`}
                <ul class="hero-stats">
                  <li>
                    <span class="stat-value">${entrypointCount}</span>
                    <span class="stat-label">${entrypointLabel}</span>
                  </li>
                  <li>
                    <span class="stat-value">v${meta.version ?? '0.0.0'}</span>
                    <span class="stat-label">Version</span>
                  </li>
                  <li>
                    <span class="stat-value"
                      >${hasPayments ? 'Enabled' : 'None'}</span
                    >
                    <span class="stat-label">Payments</span>
                  </li>
                </ul>
              </div>
              <a class="hero-domain" href="${origin}" target="_blank"
                >${origin.replace(/^https?:\/\//, '')}</a
              >
            </div>
            <div class="hero-actions">
              <a class="button" href="/.well-known/agent.json">
                <span>View Manifest</span>
              </a>
              <a class="button button--outline" href="/entrypoints">
                <span>List Entrypoints</span>
              </a>
            </div>
          </section>

          <section class="entrypoints">
            <header>
              <h2>Entrypoints</h2>
              <p>
                Explore the capabilities exposed by this agent. Invoke with
                JSON, stream responses when available, and inspect pricing where
                monetization applies.
              </p>
            </header>
            <div class="entrypoint-grid">
              ${entrypoints.length
                ? entrypoints.map(entrypoint => {
                    const streaming = Boolean(
                      entrypoint.stream ?? entrypoint.streaming
                    );
                    const description =
                      entrypoint.description ?? 'No description provided yet.';
                    const invokePrice = resolvePrice(
                      entrypoint,
                      activePayments,
                      'invoke'
                    );
                    const streamPrice = streaming
                      ? resolvePrice(entrypoint, activePayments, 'stream')
                      : undefined;
                    const hasPricing = Boolean(invokePrice || streamPrice);
                    const network = entrypoint.network ?? defaultNetwork;
                    const priceLabel = hasPricing
                      ? `Invoke: ${invokePrice ?? '—'}${
                          streamPrice && streamPrice !== invokePrice
                            ? ` · Stream: ${streamPrice}`
                            : streamPrice && !invokePrice
                              ? ` · Stream: ${streamPrice}`
                              : ''
                        }`
                      : 'Free';
                    const invokePath = `/entrypoints/${entrypoint.key}/invoke`;
                    const streamPath = `/entrypoints/${entrypoint.key}/stream`;
                    const inputSchema = toJsonSchemaOrUndefined(
                      entrypoint.input
                    );
                    const outputSchema = toJsonSchemaOrUndefined(
                      entrypoint.output
                    );
                    const exampleInputValue = inputSchema
                      ? buildExampleFromJsonSchema(inputSchema)
                      : undefined;
                    const exampleInputPayload = JSON.stringify(
                      { input: exampleInputValue ?? {} },
                      null,
                      2
                    );
                    const payloadIndented = exampleInputPayload
                      .split('\n')
                      .map(line => `    ${line}`)
                      .join('\n');
                    const inputSchemaJson = inputSchema
                      ? JSON.stringify(inputSchema, null, 2)
                      : undefined;
                    const outputSchemaJson = outputSchema
                      ? JSON.stringify(outputSchema, null, 2)
                      : undefined;
                    const invokeCurl = [
                      'curl -s -X POST \\',
                      `  '${origin}${invokePath}' \\`,
                      "  -H 'Content-Type: application/json' \\",
                      "  -d '",
                      payloadIndented,
                      "  '",
                    ].join('\n');
                    const streamCurl = streaming
                      ? [
                          'curl -sN -X POST \\',
                          `  '${origin}${streamPath}' \\`,
                          "  -H 'Content-Type: application/json' \\",
                          "  -H 'X-Payment: {{paymentHeader}}' \\",
                          "  -H 'Accept: text/event-stream' \\",
                          "  -d '",
                          payloadIndented,
                          "  '",
                        ].join('\n')
                      : undefined;
                    return html`<article class="entrypoint-card">
                      <header>
                        <h3>${entrypoint.key}</h3>
                        <span
                          class="badge ${streaming ? 'badge--streaming' : ''}"
                          >${streaming ? 'Streaming' : 'Invoke'}</span
                        >
                      </header>
                      <p>${description}</p>
                      <div class="card-meta">
                        <div class="meta-item">
                          <span class="meta-label">Pricing</span>
                          <span class="meta-value">${priceLabel}</span>
                        </div>
                        ${network
                          ? html`<div class="meta-item">
                              <span class="meta-label">Network</span>
                              <span class="meta-value">${network}</span>
                            </div>`
                          : ''}
                        <div class="meta-item">
                          <span class="meta-label">Invoke Endpoint</span>
                          <span class="meta-value"
                            ><code>POST ${invokePath}</code></span
                          >
                        </div>
                        ${streaming
                          ? html`<div class="meta-item">
                              <span class="meta-label">Stream Endpoint</span>
                              <span class="meta-value"
                                ><code>POST ${streamPath}</code></span
                              >
                            </div>`
                          : ''}
                      </div>
                      <div class="card-actions">
                        <a class="button button--small" href="${invokePath}">
                          Invoke
                        </a>
                        ${streaming
                          ? html`<a
                              class="button button--small button--outline"
                              href="${streamPath}"
                            >
                              Stream
                            </a>`
                          : ''}
                      </div>
                      <div class="schema-section">
                        ${inputSchemaJson
                          ? html`<details class="schema-block" open>
                              <summary>Input Schema</summary>
                              <pre>${inputSchemaJson}</pre>
                            </details>`
                          : html`<p class="schema-note">
                              No input schema provided. Expect bare JSON
                              payload.
                            </p>`}
                        ${outputSchemaJson
                          ? html`<details class="schema-block">
                              <summary>Output Schema</summary>
                              <pre>${outputSchemaJson}</pre>
                            </details>`
                          : ''}
                        <details class="schema-block" open>
                          <summary>Invoke with curl</summary>
                          <pre>${invokeCurl}</pre>
                        </details>
                        ${streamCurl
                          ? html`<details class="schema-block">
                              <summary>Stream with curl</summary>
                              <pre>${streamCurl}</pre>
                            </details>`
                          : ''}
                      </div>
                    </article>`;
                  })
                : html`<p class="empty-state">
                    No entrypoints registered yet. Call
                    <code>addEntrypoint()</code> to get started.
                  </p>`}
            </div>
          </section>

        </main>
        <script>
          const manifestUrl = ${JSON.stringify(manifestPath)};
          document.addEventListener('DOMContentLoaded', () => {
            const pre = document.getElementById('agent-manifest');
            const status = document.getElementById('manifest-status');
            if (!pre || !status) return;
            fetch(manifestUrl)
              .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
              })
              .then(card => {
                pre.textContent = JSON.stringify(card, null, 2);
                status.textContent = 'Loaded';
              })
              .catch(error => {
                console.error('[agent-kit] failed to load agent card', error);
                pre.textContent =
                  'Unable to load the agent card manifest. Check the console for details.';
                status.textContent = 'Unavailable';
              });
          });
        </script>
      </body>
    </html>`;
};
