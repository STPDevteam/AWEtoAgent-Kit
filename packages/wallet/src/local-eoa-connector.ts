import type {
  AgentChallengeResponse,
  LocalEoaSigner,
  TypedDataPayload,
  WalletConnector,
  WalletMetadata,
} from '@aweto-agent/types/wallets';

import {
  detectMessageEncoding,
  normalizeChallenge,
} from './base-connector';

export interface LocalEoaWalletConnectorOptions {
  signer: LocalEoaSigner;
  address?: string | null;
  caip2?: string | null;
  chain?: string | null;
  chainType?: string | null;
  provider?: string | null;
  label?: string | null;
}

export class LocalEoaWalletConnector implements WalletConnector {
  private readonly signer: LocalEoaSigner;
  private metadata: WalletMetadata | null;

  constructor(options: LocalEoaWalletConnectorOptions) {
    if (!options?.signer) {
      throw new Error("LocalEoaWalletConnector requires a signer instance");
    }

    this.signer = options.signer;
    this.metadata = {
      address: options.address ?? null,
      caip2: options.caip2 ?? null,
      chain: options.chain ?? null,
      chainType: options.chainType ?? null,
      provider: options.provider ?? "local",
      label: options.label ?? null,
    };
  }

  async signChallenge(
    challenge: AgentChallengeResponse["challenge"],
  ): Promise<string> {
    const normalized = normalizeChallenge(challenge);
    const typedData = extractTypedDataPayload(normalized.payload);

    if (typedData) {
      if (!this.signer.signTypedData) {
        throw new Error(
          "Challenge payload requires typed-data signing but signer does not expose signTypedData()",
        );
      }
      const signature = await this.signer.signTypedData(typedData);
      await this.refreshMetadataFromSigner();
      return signature;
    }

    const message = normalized.message ?? normalized.payloadHash;
    if (!message) {
      throw new Error(
        "Challenge payload does not include a signable message or payload hash",
      );
    }

    const signature = await this.signer.signMessage(
      coerceMessageForSigning(message),
    );
    await this.refreshMetadataFromSigner();
    return signature;
  }

  async getWalletMetadata(): Promise<WalletMetadata | null> {
    if (!this.metadata?.address && this.signer.getAddress) {
      await this.refreshMetadataFromSigner();
    }
    return this.metadata;
  }

  async getAddress(): Promise<string | null> {
    const metadata = await this.getWalletMetadata();
    return metadata?.address ?? null;
  }

  supportsCaip2(caip2: string): boolean {
    if (!caip2) return false;
    if (!this.metadata?.caip2) return true;
    return this.metadata.caip2.toLowerCase() === caip2.toLowerCase();
  }

  private async refreshMetadataFromSigner(): Promise<void> {
    if (!this.signer.getAddress) {
      return;
    }

    try {
      const address = await this.signer.getAddress();
      if (!address) {
        return;
      }

      this.metadata = {
        ...this.metadata,
        address,
      };
    } catch {
      // ignore metadata refresh failures – signing already succeeded
    }
  }
}

const coerceMessageForSigning = (message: string): string | Uint8Array => {
  const encoding = detectMessageEncoding(message);
  if (encoding === "utf-8") {
    return message;
  }

  const hex = message.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
};

const extractTypedDataPayload = (
  payload: unknown,
): TypedDataPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidate = record.typedData;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const typed = candidate as Record<string, unknown>;
  if (
    typeof typed.primaryType !== "string" ||
    !typed.types ||
    typeof typed.types !== "object" ||
    !typed.domain ||
    typeof typed.domain !== "object" ||
    !typed.message ||
    typeof typed.message !== "object"
  ) {
    return null;
  }

  return {
    primaryType: typed.primaryType,
    types: typed.types as TypedDataPayload["types"],
    domain: typed.domain as TypedDataPayload["domain"],
    message: typed.message as TypedDataPayload["message"],
  };
};

