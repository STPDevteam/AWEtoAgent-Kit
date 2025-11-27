/**
 * ERC-8004 v1.0 Configuration
 * Contract addresses and constants
 */

import type { Hex } from '@aweto-agent/wallet';

/**
 * Official ERC-8004 registry addresses by chain
 *
 * Reference: https://github.com/erc-8004/erc-8004-contracts
 */
type RegistryAddresses = {
  IDENTITY_REGISTRY: Hex;
  REPUTATION_REGISTRY: Hex;
  VALIDATION_REGISTRY: Hex;
};

const CHAIN_ADDRESSES: Record<number, RegistryAddresses> = {
  // ETH Sepolia (11155111)
  11155111: {
    IDENTITY_REGISTRY: '0x8004a6090Cd10A7288092483047B097295Fb8847' as Hex,
    REPUTATION_REGISTRY: '0x8004B8FD1A363aa02fDC07635C0c5F94f6Af5B7E' as Hex,
    VALIDATION_REGISTRY: '0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5' as Hex,
  },
  // Base Sepolia (84532)
  84532: {
    IDENTITY_REGISTRY: '0x8004AA63c570c570eBF15376c0dB199918BFe9Fb' as Hex,
    REPUTATION_REGISTRY: '0x8004bd8daB57f14Ed299135749a5CB5c42d341BF' as Hex,
    VALIDATION_REGISTRY: '0x8004C269D0A5647E51E121FeB226200ECE932d55' as Hex,
  },
  // Linea Sepolia (59141)
  59141: {
    IDENTITY_REGISTRY: '0x8004aa7C931bCE1233973a0C6A667f73F66282e7' as Hex,
    REPUTATION_REGISTRY: '0x8004bd8483b99310df121c46ED8858616b2Bba02' as Hex,
    VALIDATION_REGISTRY: '0x8004c44d1EFdd699B2A26e781eF7F77c56A9a4EB' as Hex,
  },
  // Polygon Amoy (80002)
  80002: {
    IDENTITY_REGISTRY: '0x8004ad19E14B9e0654f73353e8a0B600D46C2898' as Hex,
    REPUTATION_REGISTRY: '0x8004B12F4C2B42d00c46479e859C92e39044C930' as Hex,
    VALIDATION_REGISTRY: '0x8004C11C213ff7BaD36489bcBDF947ba5eee289B' as Hex,
  },
  // Hedera Testnet (296)
  296: {
    IDENTITY_REGISTRY: '0x4c74ebd72921d537159ed2053f46c12a7d8e5923' as Hex,
    REPUTATION_REGISTRY: '0xc565edcba77e3abeade40bfd6cf6bf583b3293e0' as Hex,
    VALIDATION_REGISTRY: '0x18df085d85c586e9241e0cd121ca422f571c2da6' as Hex,
  },
  // HyperEVM Testnet (998)
  998: {
    IDENTITY_REGISTRY: '0x8004A9560C0edce880cbD24Ba19646470851C986' as Hex,
    REPUTATION_REGISTRY: '0x8004b490779A65D3290a31fD96471122050dF671' as Hex,
    VALIDATION_REGISTRY: '0x8004C86198fdB8d8169c0405D510EC86cc7B0551' as Hex,
  },
  // SKALE Base Sepolia Testnet (202402221200)
  202402221200: {
    IDENTITY_REGISTRY: '0x4fa7900596c9830664406d3796952c59ec4133d9' as Hex,
    REPUTATION_REGISTRY: '0x9b9d23a47697691ef1016906d1f8ddfc009e6a69' as Hex,
    VALIDATION_REGISTRY: '0x34ae1196b1609e01ebc90b75c802b2ea87203f13' as Hex,
  },
} as const;

/**
 * Supported chain IDs for ERC-8004 registries
 * Based on official deployments: https://github.com/erc-8004/erc-8004-contracts
 */
export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: 84532,
  ETHEREUM_SEPOLIA: 11155111,
  LINEA_SEPOLIA: 59141,
  POLYGON_AMOY: 80002,
  HEDERA_TESTNET: 296,
  HYPEREVM_TESTNET: 998,
  SKALE_BASE_SEPOLIA: 202402221200,
  ETHEREUM_MAINNET: 1,
  BASE_MAINNET: 8453,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  POLYGON: 137,
} as const;

export type SupportedChainId =
  (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

/**
 * Default network configuration
 */
export const DEFAULT_NAMESPACE = 'eip155'; // EVM chains

/**
 * Default trust models supported by ERC-8004
 */
export const DEFAULT_TRUST_MODELS: string[] = [
  'feedback',
  'inference-validation',
];

/**
 * Get all registry addresses for a specific chain
 * Throws an error if the chain is not supported
 */
export function getRegistryAddresses(chainId: number): RegistryAddresses {
  const addresses = CHAIN_ADDRESSES[chainId];
  if (!addresses) {
    const supportedChains = Object.keys(CHAIN_ADDRESSES)
      .map(id => `${id}`)
      .join(', ');
    throw new Error(
      `Chain ID ${chainId} is not supported. Supported chains: ${supportedChains}. ` +
        `See https://github.com/erc-8004/erc-8004-contracts for official deployments.`
    );
  }
  return addresses;
}

/**
 * Get a specific registry address for a chain
 */
export function getRegistryAddress(
  registry: 'identity' | 'reputation' | 'validation',
  chainId: number
): Hex {
  const addresses = getRegistryAddresses(chainId);

  switch (registry) {
    case 'identity':
      return addresses.IDENTITY_REGISTRY;
    case 'reputation':
      return addresses.REPUTATION_REGISTRY;
    case 'validation':
      return addresses.VALIDATION_REGISTRY;
  }
}

/**
 * Check if a chain ID is supported by the ERC-8004 registries
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_ADDRESSES;
}

/**
 * Verify if an address is a valid ERC-8004 registry on any supported chain
 */
export function isERC8004Registry(address: Hex, chainId?: number): boolean {
  const normalized = address.toLowerCase();

  if (chainId !== undefined) {
    // Check if chain is supported first
    if (!isChainSupported(chainId)) {
      return false;
    }
    // Check specific chain
    const addresses = getRegistryAddresses(chainId);
    return Object.values(addresses).some(
      addr => addr.toLowerCase() === normalized
    );
  }

  // Check all supported chains
  const supportedChainIds = Object.keys(CHAIN_ADDRESSES).map(Number);
  return supportedChainIds.some(cid => {
    const addresses = getRegistryAddresses(cid);
    return Object.values(addresses).some(
      addr => addr.toLowerCase() === normalized
    );
  });
}
