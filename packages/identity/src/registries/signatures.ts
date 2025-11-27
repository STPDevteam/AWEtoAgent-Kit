/**
 * ERC-8004 specific signature helpers
 * Uses wallet package utilities for standard signing operations
 */

import type { Hex, SignerWalletClient } from '@aweto-agent/wallet';
import { signMessageWithViem } from '@aweto-agent/wallet';
import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  stringToBytes,
} from 'viem';

/**
 * Build ERC-8004 domain ownership proof message
 */
export function buildDomainProofMessage(params: {
  domain: string;
  address: Hex;
  chainId: number;
  nonce?: string;
}): string {
  const lines = [
    'ERC-8004 Agent Ownership Proof',
    `Domain: ${params.domain}`,
    `Address: ${params.address.toLowerCase()}`,
    `ChainId: ${params.chainId}`,
  ];
  if (params.nonce) {
    lines.push(`Nonce: ${params.nonce}`);
  }
  return lines.join('\n');
}

/**
 * Sign ERC-8004 domain proof using Viem
 */
export async function signDomainProof(
  walletClient: SignerWalletClient,
  params: {
    domain: string;
    address: Hex;
    chainId: number;
    nonce?: string;
  }
): Promise<Hex> {
  const message = buildDomainProofMessage(params);
  return signMessageWithViem(walletClient, message);
}

/**
 * Hash ERC-8004 feedback authorization struct for signature verification
 * Matches the contract's _hashFeedbackAuth function which uses abi.encode()
 *
 * According to the reference implementation:
 * - Uses abi.encode() NOT abi.encodePacked() for type safety
 * - Fields must be in this exact order: agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress
 */
export function hashFeedbackAuthStruct(params: {
  agentId: bigint;
  clientAddress: Hex;
  indexLimit: bigint;
  expiry: number;
  chainId: number;
  identityRegistry: Hex;
  signerAddress: Hex;
}): Hex {
  // Encode the struct using abi.encode() (same as Solidity)
  // Order: agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress
  const encoded = encodeAbiParameters(
    parseAbiParameters(
      'uint256, address, uint64, uint256, uint256, address, address'
    ),
    [
      params.agentId,
      params.clientAddress,
      params.indexLimit,
      BigInt(params.expiry),
      BigInt(params.chainId),
      params.identityRegistry,
      params.signerAddress,
    ]
  );

  // Hash the encoded struct (same as keccak256(abi.encode(...)) in Solidity)
  return keccak256(encoded);
}

/**
 * Sign ERC-8004 feedback authorization using Viem
 *
 * According to the reference implementation, the contract expects:
 * feedbackAuth = ABI-encoded struct (224 bytes) + ECDSA signature (65 bytes)
 *
 * The contract:
 * 1. Extracts the struct from the first 224 bytes
 * 2. Encodes it with abi.encode() and hashes with keccak256()
 * 3. Verifies the signature (last 65 bytes) over that hash using EIP-191
 *
 * We need to:
 * 1. Encode the struct with abi.encode()
 * 2. Hash it with keccak256()
 * 3. Sign the hash with EIP-191 (personal_sign)
 * 4. Concatenate: encoded struct + signature = feedbackAuth bytes
 */
export async function signFeedbackAuth(
  walletClient: SignerWalletClient,
  params: {
    fromAddress: Hex;
    toAgentId: bigint;
    chainId: number;
    expiry: number;
    indexLimit: bigint;
    identityRegistry: Hex;
    signerAddress?: Hex; // Optional - defaults to walletClient.account.address
  }
): Promise<Hex> {
  const signerAddress = params.signerAddress ?? walletClient.account.address;

  // Step 1: Encode the struct with abi.encode() (this is what gets sent to the contract)
  const encodedStruct = encodeAbiParameters(
    parseAbiParameters(
      'uint256, address, uint64, uint256, uint256, address, address'
    ),
    [
      params.toAgentId,
      params.fromAddress,
      params.indexLimit,
      BigInt(params.expiry),
      BigInt(params.chainId),
      params.identityRegistry,
      signerAddress,
    ]
  );

  // Step 2: Hash the encoded struct (same as contract's _hashFeedbackAuth)
  const structHash = keccak256(encodedStruct);

  // Debug logging
  if (typeof process !== 'undefined' && process.env?.DEBUG) {
    console.log('[signFeedbackAuth] Encoded struct:', encodedStruct);
    console.log('[signFeedbackAuth] Struct hash:', structHash);
    console.log('[signFeedbackAuth] Params:', params);
  }

  // Step 3: Sign the hash using EIP-191 (personal_sign)
  const signature = await signMessageWithViem(walletClient, structHash);

  if (typeof process !== 'undefined' && process.env?.DEBUG) {
    console.log('[signFeedbackAuth] Signature:', signature);
  }

  // Step 4: Concatenate encoded struct + signature
  // feedbackAuth = struct bytes (224 bytes) + signature bytes (65 bytes)
  const feedbackAuth = (encodedStruct + signature.slice(2)) as Hex; // Remove 0x from signature before concatenating

  if (typeof process !== 'undefined' && process.env?.DEBUG) {
    console.log(
      '[signFeedbackAuth] Final feedbackAuth length:',
      feedbackAuth.length
    );
  }

  return feedbackAuth;
}

/**
 * Hash a validation request URI or content to create a request hash
 * This is used to uniquely identify validation requests on-chain
 */
export function hashValidationRequest(content: string): Hex {
  return keccak256(stringToBytes(content));
}

/**
 * Build ERC-8004 validation request message
 */
export function buildValidationRequestMessage(params: {
  agentId: bigint;
  requestHash: Hex;
  validator: Hex;
  chainId: number;
  timestamp: number;
}): string {
  return [
    'ERC-8004 Validation Request',
    `Agent ID: ${params.agentId.toString()}`,
    `Request Hash: ${params.requestHash}`,
    `Validator: ${params.validator.toLowerCase()}`,
    `Chain ID: ${params.chainId}`,
    `Timestamp: ${params.timestamp}`,
  ].join('\n');
}

/**
 * Sign ERC-8004 validation request using Viem
 */
export async function signValidationRequest(
  walletClient: SignerWalletClient,
  params: {
    agentId: bigint;
    requestHash: Hex;
    validator: Hex;
    chainId: number;
    timestamp: number;
  }
): Promise<Hex> {
  const message = buildValidationRequestMessage(params);
  return signMessageWithViem(walletClient, message);
}
