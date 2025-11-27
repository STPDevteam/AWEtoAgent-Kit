import type {
  AgentWalletConfig,
  DeveloperWalletConfig,
  LocalWalletWithPrivateKeyOptions,
  WalletsConfig,
} from '@aweto-agent/types/wallets';

type EnvRecord = Record<string, string | undefined>;

const DEFAULT_ENV: EnvRecord =
  typeof process !== 'undefined' && process.env
    ? (process.env as EnvRecord)
    : {};

const hasWallets = (
  wallets: WalletsConfig | undefined
): wallets is WalletsConfig => Boolean(wallets?.agent || wallets?.developer);

export function walletsFromEnv(
  overrides?: WalletsConfig,
  env: EnvRecord = DEFAULT_ENV
): WalletsConfig | undefined {
  const envWallets = resolveWalletsFromEnv(env);
  const merged: WalletsConfig = {};

  if (envWallets?.agent) {
    merged.agent = envWallets.agent;
  }
  if (envWallets?.developer) {
    merged.developer = envWallets.developer;
  }

  if (overrides?.agent) {
    merged.agent = overrides.agent;
  }
  if (overrides?.developer) {
    merged.developer = overrides.developer;
  }

  return hasWallets(merged) ? merged : undefined;
}

export function resolveWalletsFromEnv(
  env?: EnvRecord
): WalletsConfig | undefined {
  if (!env) return undefined;
  const agent = resolveAgentWalletFromEnv(env);
  const developer = resolveDeveloperWalletFromEnv(env);
  if (!agent && !developer) {
    return undefined;
  }
  const wallets: WalletsConfig = {};
  if (agent) {
    wallets.agent = agent;
  }
  if (developer) {
    wallets.developer = developer;
  }
  return wallets;
}

export function resolveAgentWalletFromEnv(
  env: EnvRecord
): AgentWalletConfig | undefined {
  const type = env.AGENT_WALLET_TYPE?.toLowerCase();
  const privateKey = env.AGENT_WALLET_PRIVATE_KEY;

  if (type === 'local' || (privateKey && !type)) {
    if (!privateKey) {
      return undefined;
    }
    return {
      type: 'local',
      privateKey,
      ...extractLocalMetadata(env, 'AGENT_WALLET_'),
    };
  }

  if (type === 'lucid' || env.AGENT_WALLET_AGENT_REF) {
    const baseUrl =
      env.AGENT_WALLET_BASE_URL ??
      env.LUCID_BASE_URL ??
      env.LUCID_API_URL ??
      undefined;
    const agentRef = env.AGENT_WALLET_AGENT_REF;
    if (!baseUrl || !agentRef) {
      return undefined;
    }

    const headers = parseHeaderRecord(env.AGENT_WALLET_HEADERS);
    const authorizationContext = parseJsonObject(
      env.AGENT_WALLET_AUTHORIZATION_CONTEXT
    );

    return {
      type: 'lucid',
      baseUrl,
      agentRef,
      headers,
      accessToken: env.AGENT_WALLET_ACCESS_TOKEN ?? undefined,
      authorizationContext,
    };
  }

  return undefined;
}

export function resolveDeveloperWalletFromEnv(
  env: EnvRecord
): DeveloperWalletConfig | undefined {
  const privateKey = env.DEVELOPER_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    return undefined;
  }
  return {
    type: 'local',
    privateKey,
    ...extractLocalMetadata(env, 'DEVELOPER_WALLET_'),
  };
}

function extractLocalMetadata(
  env: EnvRecord,
  prefix: string
): Partial<LocalWalletWithPrivateKeyOptions> {
  const metadata: Partial<LocalWalletWithPrivateKeyOptions> = {};
  const map: Record<string, keyof LocalWalletWithPrivateKeyOptions> = {
    ADDRESS: 'address',
    CAIP2: 'caip2',
    CHAIN: 'chain',
    CHAIN_TYPE: 'chainType',
    PROVIDER: 'provider',
    LABEL: 'label',
  };

  for (const [envKey, targetKey] of Object.entries(map)) {
    const value = env[`${prefix}${envKey}`];
    if (value && value.trim()) {
      metadata[targetKey] = value.trim() as never;
    }
  }

  return metadata;
}

function parseHeaderRecord(
  payload?: string
): Record<string, string> | undefined {
  if (!payload) return undefined;
  const parsed = parseJsonObject(payload);
  if (!parsed) return undefined;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    headers[key] = String(value);
  }
  return headers;
}

function parseJsonObject(
  payload?: string
): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}
