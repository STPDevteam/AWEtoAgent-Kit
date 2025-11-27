import { resolvePrice } from '@aweto-agent/payments';
import type { AgentMeta } from '@aweto-agent/types/core';
import type { PaymentsConfig } from '@aweto-agent/types/payments';
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
  const entrypointLabel = entrypointCount === 1 ? 'Capability' : 'Capabilities';
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
        <meta name="theme-color" content="#0B0B0C" />
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
            color-scheme: dark;
            font-family:
              'JetBrains Mono', 'Fira Code', 'Roboto Mono', 'SFMono-Regular',
              Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
              monospace;
            background-color: #0B0B0C;
            color: #EAEAEA;
            
            /* Theme Colors */
            --bg-main: #0B0B0C;
            --bg-gradient-start: #161618;
            --bg-gradient-end: #0B0B0C;
            
            --surface: #121214;
            --surface-subtle: #18181A;
            --surface-hover: #1E1E20;
            
            --accent: #AB824F;
            --accent-glow: rgba(171, 130, 79, 0.15);
            --accent-dim: rgba(171, 130, 79, 0.6);
            
            --border: rgba(171, 130, 79, 0.25);
            --border-soft: rgba(171, 130, 79, 0.15);
            --border-hover: rgba(171, 130, 79, 0.4);
            
            --text-main: #EAEAEA;
            --text-muted: #A0A0A0;
            --text-dim: #666666;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 3rem 1.5rem 4rem;
            background: radial-gradient(circle at 50% 0%, var(--bg-gradient-start) 0%, var(--bg-main) 75%);
          }

          main {
            width: 100%;
            max-width: 1000px;
            display: flex;
            flex-direction: column;
            gap: 3rem;
          }

          section {
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--surface);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            padding: clamp(2rem, 5vw, 3rem);
            position: relative;
            overflow: hidden;
          }

          /* Hero Section */
          .hero {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            background: 
              linear-gradient(180deg, var(--surface) 0%, var(--bg-main) 100%),
              radial-gradient(circle at top right, var(--accent-glow), transparent 60%);
          }

          .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
            opacity: 0.5;
          }

          .hero-header {
            display: flex;
            align-items: flex-start;
            gap: 2rem;
            flex-wrap: wrap;
            justify-content: space-between;
          }

          .hero-content {
            flex: 1;
            min-width: 280px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .hero-logo-container {
             flex: 0 0 auto;
             display: flex;
             align-items: center;
             justify-content: center;
             background: var(--bg-main);
             border: 1px solid var(--border);
             border-radius: 12px;
             padding: 1rem;
             width: 80px;
             height: 80px;
             box-shadow: 0 0 20px var(--accent-glow);
          }

          .hero-logo {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          h1 {
            margin: 0;
            font-size: clamp(2.2rem, 5vw, 3rem);
            letter-spacing: -0.02em;
            font-weight: 700;
            background: linear-gradient(135deg, #FFFFFF 0%, #AB824F 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1.1;
          }

          .hero p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.7;
            max-width: 65ch;
            font-size: 1.05rem;
          }

          .hero-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }

          .hero-domain {
            display: inline-flex;
            align-items: center;
            padding: 0.4rem 0.85rem;
            border: 1px solid var(--border);
            background: rgba(11, 11, 12, 0.6);
            color: var(--accent);
            font-size: 0.85rem;
            text-decoration: none;
            letter-spacing: 0.05em;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          .hero-domain:hover {
            border-color: var(--accent);
            background: var(--accent-glow);
          }

          /* Stats Grid */
          .hero-stats {
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            list-style: none;
          }

          .hero-stats li {
            flex: 1;
            min-width: 140px;
            padding: 1rem 1.25rem;
            border-radius: 6px;
            border: 1px solid var(--border-soft);
            background: var(--surface-subtle);
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            transition: transform 0.2s ease, border-color 0.2s ease;
          }

          .hero-stats li:hover {
            transform: translateY(-2px);
            border-color: var(--accent);
          }

          .hero-stats .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-main);
          }

          .hero-stats .stat-label {
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--accent);
            font-weight: 500;
          }

          /* Actions */
          .hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            padding: 0.85rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            text-decoration: none;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            cursor: pointer;
            border: 1px solid var(--accent);
            background: var(--accent);
            color: #0B0B0C;
          }

          .button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 20px var(--accent-glow);
            filter: brightness(1.1);
          }

          .button--outline {
            background: transparent;
            border-color: var(--border);
            color: var(--accent);
          }

          .button--outline:hover {
            border-color: var(--accent);
            background: var(--accent-glow);
            color: #fff;
          }

          .button--small {
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }

          /* Capabilities / Entrypoints Section */
          .entrypoints header {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--border-soft);
            padding-bottom: 1.5rem;
          }

          .entrypoints h2 {
            margin: 0;
            font-size: clamp(1.6rem, 3vw, 2rem);
            color: var(--text-main);
            font-weight: 600;
          }

          .entrypoints p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.6;
            max-width: 70ch;
          }

          .entrypoint-grid {
            display: grid;
            gap: 1.5rem;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          .entrypoint-card {
            border-radius: 8px;
            border: 1px solid var(--border-soft);
            background: var(--surface-subtle);
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            padding: 1.75rem;
            position: relative;
            transition: all 0.2s ease;
          }

          .entrypoint-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }

          .entrypoint-card header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            margin: 0;
            border: none;
            padding: 0;
          }

          .entrypoint-card h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .badge {
            font-size: 0.7rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            border: 1px solid var(--border-soft);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-muted);
            font-weight: 600;
          }

          .badge--streaming {
            border-color: var(--accent);
            background: var(--accent-glow);
            color: var(--accent);
          }

          .card-meta {
            display: grid;
            gap: 0.85rem;
            padding: 1rem;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            border: 1px solid var(--border-soft);
          }

          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .meta-label {
            font-size: 0.7rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--accent);
            font-weight: 600;
            opacity: 0.9;
          }

          .meta-value {
            font-size: 0.9rem;
            color: var(--text-main);
            font-family: 'JetBrains Mono', monospace;
          }

          .meta-value code {
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          .card-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: auto;
          }

          /* Schemas */
          .schema-section {
            margin-top: 1.5rem;
            display: grid;
            gap: 0.75rem;
          }

          .schema-block {
            border: 1px solid var(--border-soft);
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
            overflow: hidden;
          }

          .schema-block summary {
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: rgba(255, 255, 255, 0.02);
            transition: background 0.2s;
          }

          .schema-block summary:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-main);
          }

          .schema-block summary::-webkit-details-marker {
            display: none;
          }

          .schema-block summary::after {
            content: '+';
            font-size: 1rem;
            font-weight: 400;
            color: var(--accent);
          }

          .schema-block[open] summary::after {
            content: '-';
          }

          .schema-block pre {
            margin: 0;
            padding: 1rem;
            background: #080808;
            border-top: 1px solid var(--border-soft);
            max-height: 300px;
            overflow: auto;
            font-size: 0.75rem;
            line-height: 1.6;
            color: #CCC;
          }

          .empty-state {
            padding: 3rem;
            border: 1px dashed var(--border);
            border-radius: 8px;
            text-align: center;
            color: var(--text-muted);
            background: var(--surface-subtle);
          }

          /* Footer */
          .footer {
            margin-top: 2rem;
            padding: 2rem;
            border-top: 1px solid var(--border-soft);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
          }

          .footer span {
            font-size: 0.85rem;
            color: var(--text-dim);
          }

          .footer-links a {
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.85rem;
            transition: color 0.2s;
            margin-left: 1.5rem;
          }

          .footer-links a:hover {
            color: var(--accent);
          }

          @media (max-width: 768px) {
            body {
              padding: 1.5rem 1rem;
            }
            .hero-header {
              flex-direction: column-reverse;
              align-items: flex-start;
            }
            .hero-logo-container {
              width: 60px;
              height: 60px;
            }
          }
        </style>
      </head>
      <body>
        <main>
          <section class="hero">
            <div class="hero-header">
              <div class="hero-content">
                <h1>${meta.name}</h1>
                ${meta.description
                  ? html`<p>${meta.description}</p>`
                  : html`<p>No description provided yet.</p>`}
                <div class="hero-links">
                  <a class="hero-domain" href="${origin}" target="_blank">
                    ${origin.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
              <div class="hero-logo-container">
                <img 
                  class="hero-logo" 
                  src="https://cdn.prod.website-files.com/67bf488beea10feff15c4fc5/67c1ab21ffee96ffe68ecce0_logo.svg" 
                  alt="${meta.name} Logo" 
                />
              </div>
            </div>

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
                <span class="stat-value">${hasPayments ? 'Enabled' : 'None'}</span>
                <span class="stat-label">Payments</span>
              </li>
            </ul>

            <div class="hero-actions">
              <a class="button" href="/.well-known/agent.json">
                <span>View Manifest</span>
              </a>
              <a class="button button--outline" href="/entrypoints">
                <span>List Capabilities</span>
              </a>
            </div>
          </section>

          <section class="entrypoints">
            <header>
              <h2>Capabilities</h2>
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
                    No capabilities registered yet. Call
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
