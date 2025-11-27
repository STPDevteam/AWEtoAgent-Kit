/**
 * ERC-8004 Reputation Registry Client
 * Handles peer feedback system for agent reputation
 */

import type { Hex, SignerWalletClient } from '@aweto-agent/wallet';
import { normalizeAddress } from '@aweto-agent/wallet';

import { REPUTATION_REGISTRY_ABI } from '../abi/types';
import type { PublicClientLike, WalletClientLike } from './identity';
import { signFeedbackAuth } from './signatures';
import { stringToBytes32, waitForConfirmation } from './utils';

export type ReputationRegistryClientOptions<
  PublicClient extends PublicClientLike,
  WalletClient extends WalletClientLike | undefined = undefined,
> = {
  address: Hex;
  chainId: number;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  identityRegistryAddress: Hex;
};

export type FeedbackEntry = {
  agentId: bigint;
  clientAddress: Hex;
  feedbackIndex: bigint;
  score: number; // 0-100
  tag1: Hex;
  tag2: Hex;
  isRevoked: boolean;
  responseCount?: bigint;
};

export type GiveFeedbackInput = {
  toAgentId: bigint;
  score: number; // 0-100
  tag1?: string | Hex;
  tag2?: string | Hex;
  feedbackUri?: string;
  feedbackHash?: Hex;
  feedbackAuth?: Hex; // Pre-signed authorization, or we'll sign it
  expiry?: number; // Unix timestamp for signature expiry
  indexLimit?: bigint; // Max feedback index this signature is valid for
};

export type RevokeFeedbackInput = {
  agentId: bigint;
  feedbackIndex: bigint;
};

export type AppendResponseInput = {
  agentId: bigint;
  clientAddress: Hex;
  feedbackIndex: bigint;
  responseUri: string;
  responseHash: Hex;
};

export type ReputationSummary = {
  count: bigint;
  averageScore: number; // 0-100
};

export type ReputationRegistryClient = {
  readonly address: Hex;
  readonly chainId: number;

  getFeedback(
    agentId: bigint,
    clientAddress: Hex,
    feedbackIndex: bigint
  ): Promise<FeedbackEntry | null>;
  getAllFeedback(
    agentId: bigint,
    options?: {
      clientAddresses?: Hex[];
      tag1?: Hex;
      tag2?: Hex;
      includeRevoked?: boolean;
    }
  ): Promise<FeedbackEntry[]>;
  getSummary(
    agentId: bigint,
    options?: {
      clientAddresses?: Hex[];
      tag1?: Hex;
      tag2?: Hex;
    }
  ): Promise<ReputationSummary>;
  getClients(agentId: bigint): Promise<Hex[]>;
  getLastIndex(agentId: bigint, clientAddress: Hex): Promise<bigint>;
  getResponseCount(
    agentId: bigint,
    clientAddress: Hex,
    feedbackIndex: bigint,
    responders: Hex[]
  ): Promise<bigint>;
  giveFeedback(input: GiveFeedbackInput): Promise<Hex>;
  revokeFeedback(input: RevokeFeedbackInput): Promise<Hex>;
  appendResponse(input: AppendResponseInput): Promise<Hex>;
};

export function createReputationRegistryClient<
  PublicClient extends PublicClientLike,
  WalletClient extends WalletClientLike | undefined = undefined,
>(
  options: ReputationRegistryClientOptions<PublicClient, WalletClient>
): ReputationRegistryClient {
  const {
    address,
    chainId,
    publicClient,
    walletClient,
    identityRegistryAddress,
  } = options;

  const ZERO_BYTES32 =
    '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

  async function getFeedback(
    agentId: bigint,
    clientAddress: Hex,
    feedbackIndex: bigint
  ): Promise<FeedbackEntry | null> {
    try {
      const result = (await publicClient.readContract({
        address,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'readFeedback',
        args: [agentId, clientAddress, feedbackIndex],
      })) as [number, Hex, Hex, boolean];

      const [score, tag1, tag2, isRevoked] = result;

      return {
        agentId,
        clientAddress,
        feedbackIndex,
        score,
        tag1,
        tag2,
        isRevoked,
      };
    } catch {
      return null;
    }
  }

  async function getAllFeedback(
    agentId: bigint,
    options: {
      clientAddresses?: Hex[];
      tag1?: Hex;
      tag2?: Hex;
      includeRevoked?: boolean;
    } = {}
  ): Promise<FeedbackEntry[]> {
    const clientAddresses = options.clientAddresses ?? [];
    const tag1 = options.tag1 ?? ZERO_BYTES32;
    const tag2 = options.tag2 ?? ZERO_BYTES32;
    const includeRevoked = options.includeRevoked ?? false;

    const result = (await publicClient.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'readAllFeedback',
      args: [agentId, clientAddresses, tag1, tag2, includeRevoked],
    })) as [Hex[], number[], Hex[], Hex[], boolean[]];

    const [clients, scores, tag1s, tag2s, revokedStatuses] = result;

    return clients.map((client, i) => ({
      agentId,
      clientAddress: client,
      feedbackIndex: BigInt(i),
      score: scores[i],
      tag1: tag1s[i],
      tag2: tag2s[i],
      isRevoked: revokedStatuses[i],
    }));
  }

  async function getSummary(
    agentId: bigint,
    options: {
      clientAddresses?: Hex[];
      tag1?: Hex;
      tag2?: Hex;
    } = {}
  ): Promise<ReputationSummary> {
    const clientAddresses = options.clientAddresses ?? [];
    const tag1 = options.tag1 ?? ZERO_BYTES32;
    const tag2 = options.tag2 ?? ZERO_BYTES32;

    const result = (await publicClient.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getSummary',
      args: [agentId, clientAddresses, tag1, tag2],
    })) as [bigint, number];

    const [count, averageScore] = result;

    return {
      count,
      averageScore,
    };
  }

  async function getClients(agentId: bigint): Promise<Hex[]> {
    const result = (await publicClient.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getClients',
      args: [agentId],
    })) as Hex[];

    return result;
  }

  async function getLastIndex(
    agentId: bigint,
    clientAddress: Hex
  ): Promise<bigint> {
    const result = (await publicClient.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getLastIndex',
      args: [agentId, clientAddress],
    })) as bigint;

    return result;
  }

  async function getResponseCount(
    agentId: bigint,
    clientAddress: Hex,
    feedbackIndex: bigint,
    responders: Hex[]
  ): Promise<bigint> {
    const result = (await publicClient.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getResponseCount',
      args: [agentId, clientAddress, feedbackIndex, responders],
    })) as bigint;

    return result;
  }

  async function giveFeedback(input: GiveFeedbackInput): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for giveFeedback');
    }
    if (!walletClient.account?.address) {
      throw new Error('Wallet account address is required');
    }

    const clientAddress = normalizeAddress(walletClient.account.address);

    // Normalize tags
    const tag1 = input.tag1
      ? typeof input.tag1 === 'string'
        ? stringToBytes32(input.tag1)
        : input.tag1
      : ZERO_BYTES32;

    const tag2 = input.tag2
      ? typeof input.tag2 === 'string'
        ? stringToBytes32(input.tag2)
        : input.tag2
      : ZERO_BYTES32;

    // Generate feedback authorization signature if not provided
    let feedbackAuth = input.feedbackAuth;
    if (!feedbackAuth) {
      const expiry = input.expiry ?? Math.floor(Date.now() / 1000) + 3600; // 1 hour default
      const indexLimit = input.indexLimit ?? 1000n;

      feedbackAuth = await signFeedbackAuth(
        walletClient as unknown as SignerWalletClient,
        {
          fromAddress: clientAddress,
          toAgentId: input.toAgentId,
          chainId,
          expiry,
          indexLimit,
          identityRegistry: identityRegistryAddress,
        }
      );
    }

    const txHash = await walletClient.writeContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'giveFeedback',
      args: [
        input.toAgentId,
        input.score,
        tag1,
        tag2,
        input.feedbackUri ?? '',
        input.feedbackHash ?? ZERO_BYTES32,
        feedbackAuth,
      ],
    });

    await waitForConfirmation(publicClient, txHash);

    return txHash;
  }

  async function revokeFeedback(input: RevokeFeedbackInput): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for revokeFeedback');
    }

    const txHash = await walletClient.writeContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'revokeFeedback',
      args: [input.agentId, input.feedbackIndex],
    });

    await waitForConfirmation(publicClient, txHash);

    return txHash;
  }

  async function appendResponse(input: AppendResponseInput): Promise<Hex> {
    if (!walletClient) {
      throw new Error('Wallet client required for appendResponse');
    }

    const txHash = await walletClient.writeContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'appendResponse',
      args: [
        input.agentId,
        input.clientAddress,
        input.feedbackIndex,
        input.responseUri,
        input.responseHash,
      ],
    });

    await waitForConfirmation(publicClient, txHash);

    return txHash;
  }

  return {
    address,
    chainId,
    getFeedback,
    getAllFeedback,
    getSummary,
    getClients,
    getLastIndex,
    getResponseCount,
    giveFeedback,
    revokeFeedback,
    appendResponse,
  };
}
