import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createAgentHttpRuntime } from '@aweto-agent/core';
import {
  createAgentIdentity,
  generateAgentMetadata,
} from '@aweto-agent/identity';
import { createPublicClient, formatEther, http } from 'viem';
import { baseSepolia, base, sepolia, mainnet } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import type { RunLogger, WizardAnswers } from './types';

const CHAIN_MAP: Record<number, typeof baseSepolia> = {
  84532: baseSepolia,
  8453: base,
  11155111: sepolia,
  1: mainnet,
};

const WALLET_FILENAME = '.agent-wallet.json';
const WELL_KNOWN_DIR = '.well-known';
const AGENT_METADATA_FILENAME = 'agent-metadata.json';

type ServiceType = 'API_ACCESS' | 'AI_AGENT' | 'MCP_SERVICE';

type PaymentsPayload = {
  network: string;
  facilitatorUrl?: string;
  payTo: string;
  defaultPrice?: string;
};

export async function ensureAgentWalletConfig(params: {
  targetDir: string;
  wizardAnswers: WizardAnswers;
  agentName: string;
  logger: RunLogger;
}): Promise<void> {
  const { targetDir, wizardAnswers, logger } = params;
  const walletPath = path.join(targetDir, WALLET_FILENAME);
  const existingAnswer = getStringAnswer(wizardAnswers, 'PRIVATE_KEY');

  if (existingAnswer && existingAnswer.trim().length > 0) {
    const normalized = normalizePrivateKey(existingAnswer);
    wizardAnswers.set('PRIVATE_KEY', normalized);
    logger.log('[cli] Using agent wallet provided via wizard answers.');
    return;
  }

  const walletRecord = await loadOrCreateWallet(walletPath, logger);
  wizardAnswers.set('PRIVATE_KEY', walletRecord.privateKey);
}

export async function runAutoOnboarding(params: {
  targetDir: string;
  wizardAnswers: WizardAnswers;
  agentName: string;
  logger: RunLogger;
  skipErc8004Registration?: boolean;
}): Promise<void> {
  const { targetDir, wizardAnswers, agentName, logger, skipErc8004Registration } = params;
  const backendBaseUrl = getStringAnswer(wizardAnswers, 'AGENT_BACKEND_BASE_URL');

  logger.log('[cli] Starting auto onboarding...');

  if (!backendBaseUrl) {
    logger.warn(
      '[cli] Skipping auto onboarding – AGENT_BACKEND_BASE_URL is not set.'
    );
    return;
  }

  logger.log(`[cli] Backend URL: ${backendBaseUrl}`);

  const privateKey = getStringAnswer(wizardAnswers, 'PRIVATE_KEY');
  if (!privateKey) {
    throw new Error('Agent wallet private key not found.');
  }

  const agentDescription =
    getStringAnswer(wizardAnswers, 'AGENT_DESCRIPTION') ??
    'Agent with ERC-8004 identity';
  const agentVersion =
    getStringAnswer(wizardAnswers, 'AGENT_VERSION') ?? '0.1.0';
  const agentDomain = getStringAnswer(wizardAnswers, 'AGENT_DOMAIN');
  const rpcUrl = getStringAnswer(wizardAnswers, 'RPC_URL');
  const chainIdValue = getStringAnswer(wizardAnswers, 'CHAIN_ID');
  const autoRegister = getBooleanAnswer(
    wizardAnswers,
    'IDENTITY_AUTO_REGISTER',
    true
  );

  if (!agentDomain) {
    throw new Error('AGENT_DOMAIN is required for onboarding.');
  }

  if (!rpcUrl) {
    throw new Error('RPC_URL is required for onboarding.');
  }

  const chainId = Number(chainIdValue);
  if (!Number.isFinite(chainId)) {
    throw new Error('CHAIN_ID must be a valid number.');
  }

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
            privateKey: normalizePrivateKey(privateKey),
          },
        },
      },
    }
  );

  // Check wallet balance before attempting registration
  const signer = privateKeyToAccount(normalizePrivateKey(privateKey));
  const walletAddress = signer.address;

  let hasBalance = true;
  const chain = CHAIN_MAP[chainId];
  if (chain) {
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({ address: walletAddress });
    const balanceEth = formatEther(balance);

    if (balance === 0n) {
      hasBalance = false;
      logger.warn(`[cli] ⚠️  Wallet ${walletAddress} has 0 ETH balance.`);
      if (!skipErc8004Registration) {
      logger.warn(`[cli] Skipping ERC-8004 on-chain registration (requires gas fees).`);
      logger.warn(`[cli] To complete registration later:`);
      logger.warn(`[cli]   1. Fund the wallet with testnet ETH`);
      logger.warn(`[cli]      Faucets for Base Sepolia:`);
      logger.warn(`[cli]      - https://www.alchemy.com/faucets/base-sepolia`);
      logger.warn(`[cli]      - https://faucets.chain.link/base-sepolia`);
      logger.warn(`[cli]   2. Run: cd ${path.basename(params.targetDir)} && bun run agent:onboard`);
      }
    } else {
      logger.log(`[cli] Wallet ${walletAddress} balance: ${balanceEth} ETH`);
    }
  }

  let agentTokenId: string | undefined;

  // Skip ERC-8004 registration if requested (backend will handle it via createTokenWithIdentity)
  if (skipErc8004Registration) {
    logger.log('[cli] Skipping ERC-8004 registration (backend will handle via createTokenWithIdentity)...');
  } else {
  // If no balance, skip on-chain registration but still create the project
  if (!hasBalance) {
    logger.log('[cli] Project created successfully without ERC-8004 registration.');
    logger.log('[cli] Run `bun run agent:onboard` after funding the wallet to complete setup.');
    return;
  }

  logger.log('[cli] Registering / checking ERC-8004 identity...');

  const envRecord = convertWizardAnswersToEnv(wizardAnswers);
  const identity = await createAgentIdentity({
    runtime,
    domain: agentDomain,
    autoRegister,
    chainId,
    rpcUrl,
    env: envRecord,
  });

  if (identity.transactionHash) {
    logger.log(`[cli] Registration tx hash: ${identity.transactionHash}`);
  }

  if (!identity.record?.agentId) {
    throw new Error('ERC-8004 registry did not return an agentId.');
  }
    agentTokenId = identity.record.agentId.toString();
  logger.log(`[cli] Identity Agent ID: ${agentTokenId}`);

  const metadataDir = path.join(targetDir, WELL_KNOWN_DIR);
  await mkdir(metadataDir, { recursive: true });
  const metadataPath = path.join(metadataDir, AGENT_METADATA_FILENAME);

  const capabilities = parseCapabilities(
    wizardAnswers,
    agentDescription
  );

  const metadata = generateAgentMetadata(identity, {
    name: agentName,
    description: agentDescription,
    capabilities,
  });
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  logger.log(`[cli] Wrote ERC-8004 metadata to ${metadataPath}`);
  }

  const shortDescription =
    getStringAnswer(wizardAnswers, 'AGENT_SHORT_DESCRIPTION') ??
    agentDescription;
  // Access details defaults to agent domain if not provided
  const accessDetails = getStringAnswer(wizardAnswers, 'AGENT_ACCESS_DETAILS') || `https://${agentDomain}`;
  const resourceLink =
    getStringAnswer(wizardAnswers, 'AGENT_RESOURCE_LINK') ??
    `https://${agentDomain}`;
  const githubLink = getStringAnswer(wizardAnswers, 'AGENT_GITHUB_LINK');
  const twitterLink = getStringAnswer(wizardAnswers, 'AGENT_TWITTER_LINK');
  const documentLink = getStringAnswer(wizardAnswers, 'AGENT_DOCUMENT_LINK');
  const serviceType = resolveServiceType(
    getStringAnswer(wizardAnswers, 'AGENT_SERVICE_TYPE')
  );
  const tokenName =
    getStringAnswer(wizardAnswers, 'AGENT_TOKEN_NAME') ??
    `${agentName} Token`;
  const tokenSymbol =
    getStringAnswer(wizardAnswers, 'AGENT_TOKEN_SYMBOL') ?? 'AGENT';
  const metadataUri =
    getStringAnswer(wizardAnswers, 'AGENT_METADATA_URI') ??
    `https://${agentDomain}/.well-known/agent-metadata.json`;
  const agentCardUri =
    getStringAnswer(wizardAnswers, 'AGENT_CARD_URI') ??
    `https://${agentDomain}/.well-known/agent-card.json`;

  const payments = buildPaymentsPayload(wizardAnswers, walletAddress);
  const timestamp = Date.now().toString();
  const paymentNetwork =
    payments?.network ??
    getStringAnswer(wizardAnswers, 'PAYMENTS_NETWORK') ??
    'base';
  const message = [
    'AgentInit',
    agentName,
    agentDomain,
    paymentNetwork,
    timestamp,
  ].join('|');

  const signature = await signer.signMessage({ message });

  const payload: Record<string, unknown> = {
    agentName,
    agentDescription,
    agentDomain,
    serviceType,
    shortDescription,
    tokenName,
    tokenSymbol,
    metadataUri,
    // Pass metadataUri as agentCardUri (tokenURI) to backend for createTokenWithIdentityAndURI
    agentCardUri: metadataUri,
    message,
    // If we skipped ERC-8004 registration, tell backend to use createTokenWithIdentity
    registerIdentity: skipErc8004Registration === true,
  };

  // Only include agentTokenId if we registered it ourselves
  if (agentTokenId) {
    payload.agentTokenId = agentTokenId;
  }

  if (accessDetails) payload.accessDetails = accessDetails;
  if (resourceLink) payload.resourceLink = resourceLink;
  if (githubLink) payload.githubLink = githubLink;
  if (twitterLink) payload.twitterLink = twitterLink;
  if (documentLink) payload.documentLink = documentLink;
  if (payments) payload.payments = payments;

  const initUrl = buildBackendUrl(backendBaseUrl, '/api/agents/init');
  logger.log(`[cli] Calling backend /api/agents/init endpoint: ${initUrl}`);

  let response: Response;
  try {
    response = await fetch(initUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-agent-address': signer.address,
      'x-signature': signature,
      'x-timestamp': timestamp,
    },
    body: JSON.stringify(payload),
  });
  } catch (fetchError) {
    const errorMessage = (fetchError as Error).message;
    throw new Error(
      `Failed to connect to backend at ${initUrl}: ${errorMessage}. ` +
        'Make sure the backend server is running.'
    );
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok || !body?.success) {
    const details =
      body?.error ??
      `${response.status} ${response.statusText}` ??
      'Unknown error';
    throw new Error(
      `Backend onboarding failed: ${details}${
        body?.details ? ` (${JSON.stringify(body.details)})` : ''
      }`
    );
  }

  const contractAddress = body.data?.contractAddress ?? 'unknown';
  const txHash = body.data?.transactionHash;
  const agentId = body.data?.agentId;

  logger.log(`[cli] Backend onboarding complete.`);
  logger.log(`[cli]   Token Contract: ${contractAddress}`);

  if (txHash) {
    // Determine explorer URL based on network
    const explorerBaseUrl = paymentNetwork === 'base'
      ? 'https://basescan.org'
      : paymentNetwork === 'base-sepolia'
        ? 'https://sepolia.basescan.org'
        : 'https://basescan.org';

    logger.log(`[cli]   Transaction: ${explorerBaseUrl}/tx/${txHash}`);
  }

  if (agentId) {
    // Determine marketplace URL based on network
    const marketplaceBaseUrl = initUrl.includes('dev')
      ? 'https://x402-dev.world.fun'
      : 'https://x402.world.fun';

    logger.log(`[cli]   Agent ID: ${agentId}`);
    logger.log(`[cli]   You can view your service token at: ${marketplaceBaseUrl}/services?tokenId=${agentId}`);
  }
}

function getStringAnswer(
  answers: WizardAnswers,
  key: string
): string | undefined {
  const value = answers.get(key);
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

function getBooleanAnswer(
  answers: WizardAnswers,
  key: string,
  defaultValue: boolean
): boolean {
  const value = answers.get(key);
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true';
}

async function loadOrCreateWallet(
  walletPath: string,
  logger: RunLogger
): Promise<{ privateKey: `0x${string}`; address: `0x${string}` }> {
  if (existsSync(walletPath)) {
    try {
      const raw = await readFile(walletPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        privateKey?: string;
        address?: string;
      };
      if (parsed.privateKey && parsed.address) {
        logger.log('[cli] Reusing previously generated agent wallet.');
        return {
          privateKey: normalizePrivateKey(parsed.privateKey),
          address: parsed.address as `0x${string}`,
        };
      }
    } catch (error) {
      logger.warn(
        `[cli] Failed to read existing wallet file ${walletPath}: ${
          (error as Error).message
        }`
      );
    }
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const record = {
    privateKey,
    address: account.address,
  };
  await writeFile(walletPath, JSON.stringify(record, null, 2), 'utf8');
  logger.log(`[cli] Generated agent wallet:`);
  logger.log(`[cli]   Address: ${account.address}`);
  logger.log(`[cli]   Private Key: ${privateKey}`);
  logger.log(`[cli]   (Save this private key securely! It's also stored in ${walletPath})`);
  return record;
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Private key cannot be empty.');
  }
  return trimmed.startsWith('0x')
    ? (trimmed as `0x${string}`)
    : (`0x${trimmed}` as `0x${string}`);
}

function parseCapabilities(
  answers: WizardAnswers,
  fallbackDescription: string
): Array<{ name: string; description: string }> | undefined {
  const raw = getStringAnswer(answers, 'AGENT_CAPABILITIES');
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
  } catch {
    // fall through to fallback
  }

  return [
    {
      name: 'default',
      description: fallbackDescription,
    },
  ];
}

function resolveServiceType(value?: string): ServiceType {
  if (value === 'API_ACCESS' || value === 'AI_AGENT' || value === 'MCP_SERVICE') {
    return value;
  }
  return 'AI_AGENT';
}

function buildPaymentsPayload(
  answers: WizardAnswers,
  agentWalletAddress?: string
): PaymentsPayload | undefined {
  const network = getStringAnswer(answers, 'PAYMENTS_NETWORK');
  // Use PAYMENTS_RECEIVABLE_ADDRESS if provided, otherwise use agent wallet address
  const payTo = getStringAnswer(answers, 'PAYMENTS_RECEIVABLE_ADDRESS') || agentWalletAddress;

  if (!network || !payTo) {
    return undefined;
  }

  const payload: PaymentsPayload = {
    network,
    payTo,
  };

  const facilitatorUrl = getStringAnswer(answers, 'PAYMENTS_FACILITATOR_URL');
  if (facilitatorUrl) {
    payload.facilitatorUrl = facilitatorUrl;
  }

  const defaultPrice = getStringAnswer(answers, 'PAYMENTS_DEFAULT_PRICE');
  if (defaultPrice) {
    payload.defaultPrice = defaultPrice;
  }

  return payload;
}

function convertWizardAnswersToEnv(
  answers: WizardAnswers
): Record<string, string> {
  const env: Record<string, string> = {};
  answers.forEach((value, key) => {
    if (value === undefined || value === null) {
      return;
    }
    env[key] = String(value);
  });
  return env;
}

function buildBackendUrl(baseUrl: string, pathname: string): string {
  const normalizedBase = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedPath = pathname.startsWith('/')
    ? pathname
    : `/${pathname}`;
  return `${normalizedBase}${normalizedPath}`;
}
