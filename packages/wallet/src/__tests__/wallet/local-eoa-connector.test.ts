import { describe, expect, it } from 'bun:test';

import type {
  AgentChallengeResponse,
  LocalEoaSigner,
} from '@aweto-agent/types/wallets';

import { LocalEoaWalletConnector } from '../../local-eoa-connector';

const baseChallenge: AgentChallengeResponse['challenge'] = {
  id: 'challenge-1',
  credential_id: 'cred-1',
  payload: 'Sign this message',
  payload_hash: '0x1234',
  nonce: 'nonce-1',
  scopes: ['wallet.sign'],
  issued_at: new Date('2024-01-01T00:00:00Z').toISOString(),
  expires_at: new Date('2024-01-01T00:05:00Z').toISOString(),
  server_signature: '0xserver',
};

describe('LocalEoaWalletConnector', () => {
  it('signs messages and resolves metadata', async () => {
    let signedPayload: string | Uint8Array | null = null;
    const signer: LocalEoaSigner = {
      async signMessage(payload) {
        signedPayload = payload;
        return '0xsigned';
      },
      async getAddress() {
        return '0xabc';
      },
    };

    const connector = new LocalEoaWalletConnector({
      signer,
      caip2: 'eip155:8453',
    });

    const signature = await connector.signChallenge(baseChallenge);
    expect(signature).toBe('0xsigned');
    expect(signedPayload).toBe('Sign this message');

    const metadata = await connector.getWalletMetadata();
    expect(metadata).toEqual(
      expect.objectContaining({ address: '0xabc', caip2: 'eip155:8453' })
    );
    expect(connector.supportsCaip2('eip155:8453')).toBe(true);
  });

  it('converts hex payloads into byte arrays before signing', async () => {
    let isUint8Array = false;
    const signer: LocalEoaSigner = {
      async signMessage(payload) {
        isUint8Array = payload instanceof Uint8Array;
        return '0xdead';
      },
    };

    const connector = new LocalEoaWalletConnector({ signer });
    await connector.signChallenge({
      ...baseChallenge,
      payload: '0xdeadbeef',
    });

    expect(isUint8Array).toBe(true);
  });

  it('delegates to signTypedData when typed payload provided', async () => {
    let typedDataInvoked = false;
    const typedPayload = {
      primaryType: 'Mail',
      types: {
        EIP712Domain: [{ name: 'name', type: 'string' }],
        Mail: [
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
        ],
      },
      domain: { name: 'Example' },
      message: { from: 'a', to: 'b' },
    } as const;

    const signer: LocalEoaSigner = {
      async signMessage(_payload) {
        throw new Error('signMessage should not be called for typed data');
      },
      async signTypedData(payload) {
        typedDataInvoked = payload.primaryType === 'Mail';
        return '0xtyped';
      },
    };

    const connector = new LocalEoaWalletConnector({ signer });

    const signature = await connector.signChallenge({
      ...baseChallenge,
      payload: { typedData: typedPayload },
    });

    expect(signature).toBe('0xtyped');
    expect(typedDataInvoked).toBe(true);
  });
});
