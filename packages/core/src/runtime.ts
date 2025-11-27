import { createA2ARuntime } from '@aweto-agent/a2a';
import { createAgentCardWithAP2, createAP2Runtime } from '@aweto-agent/ap2';
import { createAgentCardWithIdentity } from '@aweto-agent/identity';
import {
  createAgentCardWithPayments,
  createPaymentsRuntime,
} from '@aweto-agent/payments';
import type { AP2Config } from '@aweto-agent/types/ap2';
import type {
  AgentCardWithEntrypoints,
  AgentKitConfig,
  AgentMeta,
  AgentRuntime,
} from '@aweto-agent/types/core';
import type { TrustConfig } from '@aweto-agent/types/identity';
import type {
  PaymentsConfig,
  PaymentsRuntime,
} from '@aweto-agent/types/payments';
import { createWalletsRuntime } from '@aweto-agent/wallet';

import { getAgentKitConfig, setActiveInstanceConfig } from './config/config';
import { type AgentCore, createAgentCore } from './core/agent';
import type { Network } from './core/types';
import type { EntrypointDef } from './http/types';

export type CreateAgentRuntimeOptions = {
  payments?: PaymentsConfig | false;
  ap2?: AP2Config;
  trust?: TrustConfig;
  entrypoints?: Iterable<EntrypointDef>;
  config?: AgentKitConfig;
};

function addEntrypoint(
  def: EntrypointDef,
  payments: PaymentsRuntime | undefined,
  agent: AgentCore,
  invalidateManifestCache: () => void
) {
  if (!def.key) throw new Error('entrypoint.key required');

  if (payments) {
    payments.activate(def);
    if (payments.isActive && payments.config) {
      (agent.config as { payments?: PaymentsConfig | false }).payments =
        payments.config;
    }
  }
  agent.addEntrypoint(def);
  invalidateManifestCache();
}

function createEntrypoints(
  entrypoints: Iterable<EntrypointDef>,
  payments: PaymentsRuntime | undefined,
  agent: AgentCore,
  invalidateManifestCache: () => void
) {
  for (const entrypoint of entrypoints) {
    addEntrypoint(entrypoint, payments, agent, invalidateManifestCache);
  }
}

export function createAgentRuntime(
  meta: AgentMeta,
  opts: CreateAgentRuntimeOptions = {}
): AgentRuntime {
  setActiveInstanceConfig(opts?.config);
  const config = getAgentKitConfig(opts?.config);

  const wallets = createWalletsRuntime(config);
  const payments = createPaymentsRuntime(opts?.payments, config);

  const agent = createAgentCore({
    meta,
    wallets,
    payments: opts?.payments === false ? false : undefined,
  });

  const manifestCache = new Map<string, AgentCardWithEntrypoints>();

  const snapshotEntrypoints = (): EntrypointDef[] =>
    agent.listEntrypoints().map(entry => ({
      ...entry,
      network: entry.network as Network | undefined,
    })) as EntrypointDef[];

  const listEntrypoints = () =>
    snapshotEntrypoints().map(entry => ({
      key: entry.key,
      description: entry.description,
      streaming: Boolean(entry.stream ?? entry.streaming),
    }));

  // Create runtime object (will be used to create A2A runtime)
  const runtimeObj = {
    agent,
    config,
    wallets,
    payments,
    entrypoints: {
      add: () => {},
      list: listEntrypoints,
      snapshot: snapshotEntrypoints,
    },
    manifest: {
      build: () => ({}) as AgentCardWithEntrypoints,
      invalidate: () => {},
    },
  } as AgentRuntime;

  const a2a = createA2ARuntime(runtimeObj);
  const ap2 = createAP2Runtime(opts?.ap2);

  // Update runtime object with A2A and AP2
  (runtimeObj as AgentRuntime).a2a = a2a;
  (runtimeObj as AgentRuntime).ap2 = ap2;

  const buildManifestForOrigin = (origin: string) => {
    const cached = manifestCache.get(origin);
    if (cached) {
      return cached;
    }

    // Build base A2A card (no pricing, no payments, no identity, no AP2)
    let card = a2a.buildCard(origin);

    // Apply enhancements immutably (each returns new card)
    // Payments enhancement needs entrypoints to resolve pricing
    if (payments?.config) {
      card = createAgentCardWithPayments(
        card,
        payments.config,
        snapshotEntrypoints()
      );
    }
    if (opts?.trust) {
      card = createAgentCardWithIdentity(card, opts.trust);
    }

    // AP2 auto-enables with merchant role when payments are enabled (unless explicitly disabled)
    const resolvedAp2Config =
      opts?.ap2 ??
      (payments?.config ? { roles: ['merchant'], required: true } : undefined);
    if (resolvedAp2Config) {
      card = createAgentCardWithAP2(card, resolvedAp2Config);
    }

    // Cache the final enhanced card
    manifestCache.set(origin, card);
    return card;
  };

  const invalidateManifestCache = () => {
    manifestCache.clear();
  };

  if (opts?.entrypoints) {
    createEntrypoints(
      opts.entrypoints,
      payments,
      agent,
      invalidateManifestCache
    );
  }

  runtimeObj.entrypoints = {
    add(def: EntrypointDef) {
      addEntrypoint(def, payments, agent, invalidateManifestCache);
    },
    list: listEntrypoints,
    snapshot: snapshotEntrypoints,
  };

  runtimeObj.manifest = {
    build: buildManifestForOrigin,
    invalidate: invalidateManifestCache,
  };

  return runtimeObj;
}
