import { privateKeyToAccount } from 'viem/accounts';

import type {
  LocalEoaSigner,
  TypedDataPayload,
} from '@aweto-agent/types/wallets';

const normalizePrivateKey = (key: string): `0x${string}` => {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error('privateKey must be a non-empty string');
  }
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`;
};

export const createPrivateKeySigner = (privateKey: string): LocalEoaSigner => {
  const account = privateKeyToAccount(normalizePrivateKey(privateKey));

  return {
    async signMessage(message) {
      const payload =
        typeof message === 'string'
          ? { message }
          : { message: { raw: message } };
      return account.signMessage(
        payload as Parameters<typeof account.signMessage>[0]
      );
    },
    async signTypedData(payload: TypedDataPayload) {
      return account.signTypedData({
        domain: payload.domain,
        message: payload.message,
        types: payload.types,
        primaryType: payload.primaryType,
      });
    },
    async signTransaction(transaction) {
      return account.signTransaction(transaction);
    },
    async getAddress() {
      return account.address;
    },
  };
};
