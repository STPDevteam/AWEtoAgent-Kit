import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAgentHttpRuntime } from '@AWEtoAgent/core';
import {
  createAgentIdentity,
  generateAgentMetadata,
} from '@AWEtoAgent/identity';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

type ServiceType = 'API_ACCESS' | 'AI_AGENT' | 'MCP_SERVICE';

type WalletRecord = {
  privateKey: `0x${string}`;
  address: `0x${string}`;
};

type PaymentsConfigPayload = {
  network: string;
  facilitatorUrl?: string;
  payTo: string;
  defaultPrice?: string;
};

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const walletFile = path.join(projectRoot, '.agent-wallet.json');
const WELL_KNOWN_DIR = path.join(projectRoot, '.well-known');

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value.trim();
}

function optionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

function ensureWallet(): WalletRecord {
  if (existsSync(walletFile)) {
    try {
      const contents = JSON.parse(
        readFileSync(walletFile, 'utf8')
      ) as Partial<WalletRecord>;
      if (contents.privateKey && contents.address) {
        return {
          privateKey: contents.privateKey as `0x${string}`,
          address: contents.address as `0x${string}`,
        };
      }
    } catch (error) {
      console.warn(
        '[agent-onboard] Failed to read existing wallet. Generating a new one.',
        error
      );
    }
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const record: WalletRecord = {
    privateKey,
    address: account.address,
  };

  writeFileSync(walletFile, JSON.stringify(record, null, 2), 'utf8');
  console.log(`[agent-onboard] Generated new agent wallet: ${record.address}`);
  console.log(`[agent-onboard] Stored at ${walletFile}`);

  return record;
}

function buildBackendUrl(baseUrl: string, pathName: string): string {
  const normalizedBase = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBase}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
}

function resolveServiceType(): ServiceType {
  const raw = optionalEnv('AGENT_SERVICE_TYPE') ?? 'AI_AGENT';
  if (raw === 'API_ACCESS' || raw === 'AI_AGENT' || raw === 'MCP_SERVICE') {
    return raw;
  }
  throw new Error(
    `AGENT_SERVICE_TYPE must be one of API_ACCESS | AI_AGENT | MCP_SERVICE (received ${raw})`
  );
}

function resolvePaymentsConfig(): PaymentsConfigPayload | undefined {
  const network = optionalEnv('PAYMENTS_NETWORK');
  const payTo = optionalEnv('PAYMENTS_RECEIVABLE_ADDRESS');

  if (!network || !payTo) {
    return undefined;
  }

  return {
    network,
    payTo,
    facilitatorUrl: optionalEnv('PAYMENTS_FACILITATOR_URL'),
    defaultPrice: optionalEnv('PAYMENTS_DEFAULT_PRICE'),
  };
}

function parseCapabilities(
  fallbackDescription: string
): Array<{ name: string; description: string }> | undefined {
  const raw = optionalEnv('AGENT_CAPABILITIES');
  if (!raw) {
    return [
      {
        name: 'default',
        description: fallbackDescription,
      },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        entry =>
          entry &&
          typeof entry.name === 'string' &&
          typeof entry.description === 'string'
      );
    }
    throw new Error('Capabilities payload must be a JSON array');
  } catch (error) {
    console.warn(
      '[agent-onboard] Failed to parse AGENT_CAPABILITIES. Using fallback.',
      error
    );
    return [
      {
        name: 'default',
        description: fallbackDescription,
      },
    ];
  }
}

async function main() {
  const wallet = ensureWallet();

  const agentName = requireEnv('AGENT_NAME');
  const agentDescription = requireEnv('AGENT_DESCRIPTION');
  const agentVersion = optionalEnv('AGENT_VERSION') ?? '0.1.0';
  const agentDomain = requireEnv('AGENT_DOMAIN');
  const shortDescription =
    optionalEnv('AGENT_SHORT_DESCRIPTION') ?? agentDescription;
  const accessDetails = optionalEnv('AGENT_ACCESS_DETAILS');
  const resourceLink =
    optionalEnv('AGENT_RESOURCE_LINK') ?? `https://${agentDomain}`;
  const githubLink = optionalEnv('AGENT_GITHUB_LINK');
  const twitterLink = optionalEnv('AGENT_TWITTER_LINK');
  const documentLink = optionalEnv('AGENT_DOCUMENT_LINK');
  const backendBaseUrl = requireEnv('AGENT_BACKEND_BASE_URL');
  const tokenName = requireEnv('AGENT_TOKEN_NAME');
  const tokenSymbol = requireEnv('AGENT_TOKEN_SYMBOL');
  const rpcUrl = requireEnv('RPC_URL');
  const chainId = Number(requireEnv('CHAIN_ID'));

  if (!Number.isFinite(chainId)) {
    throw new Error('CHAIN_ID must be a valid number');
  }

  const autoRegister = optionalEnv('IDENTITY_AUTO_REGISTER') !== 'false';
  const metadataUri =
    optionalEnv('AGENT_METADATA_URI') ??
    `https://${agentDomain}/.well-known/agent-metadata.json`;
  const agentCardUri =
    optionalEnv('AGENT_CARD_URI') ??
    `https://${agentDomain}/.well-known/agent-card.json`;
  const serviceType = resolveServiceType();
  const payments = resolvePaymentsConfig();

  const runtime = createAgentHttpRuntime(
    {
      name: agentName,
      version: agentVersion,
      description: agentDescription,
    },
    {
      config: {
        wallets: {
          agent: {
            type: 'local',
            privateKey: wallet.privateKey,
          },
        },
      },
    }
  );

  console.log('[agent-onboard] Creating / checking ERC-8004 identity...');

  const identity = await createAgentIdentity({
    runtime,
    domain: agentDomain,
    autoRegister,
    chainId,
    rpcUrl,
    env: process.env,
  });

  if (!identity.record?.agentId) {
    throw new Error(
      'Failed to resolve agent ID from ERC-8004 registry. Check registration status.'
    );
  }

  console.log(
    `[agent-onboard] Identity ready. Agent ID: ${identity.record.agentId}`
  );

  const capabilities = parseCapabilities(agentDescription);
  const metadata = generateAgentMetadata(identity, {
    name: agentName,
    description: agentDescription,
    capabilities,
  });

  mkdirSync(WELL_KNOWN_DIR, { recursive: true });
  const metadataOutput =
    optionalEnv('AGENT_METADATA_OUTPUT_PATH') ??
    path.join(WELL_KNOWN_DIR, 'agent-metadata.json');
  writeFileSync(metadataOutput, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`[agent-onboard] Wrote metadata to ${metadataOutput}`);

  const timestamp = Date.now().toString();
  const message = [
    'AgentInit',
    agentName,
    agentDomain,
    payments?.network ?? 'base',
    timestamp,
  ].join('|');

  const account = privateKeyToAccount(wallet.privateKey);
  const signature = await account.signMessage({ message });

  const payload = {
    agentName,
    agentDescription,
    agentDomain,
    serviceType,
    shortDescription,
    accessDetails,
    resourceLink,
    githubLink,
    twitterLink,
    documentLink,
    tokenName,
    tokenSymbol,
    metadataUri,
    agentCardUri,
    payments,
    message,
  };

  console.log('[agent-onboard] Calling backend /agents/init endpoint...');

  const response = await fetch(
    buildBackendUrl(backendBaseUrl, '/agents/init'),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-address': wallet.address,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      body: JSON.stringify(payload),
    }
  );

  const result = (await response.json()) as {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    details?: unknown;
  };

  if (!response.ok || !result.success) {
    console.error(
      '[agent-onboard] Backend onboarding failed:',
      result.error,
      result.details
    );
    throw new Error(
      `Backend responded with ${response.status} ${response.statusText}`
    );
  }

  console.log('[agent-onboard] Backend onboarding complete.');
  console.log(JSON.stringify(result.data, null, 2));
}

await main().catch(error => {
  console.error('[agent-onboard] Failed to onboard agent:', error);
  process.exitCode = 1;
});

