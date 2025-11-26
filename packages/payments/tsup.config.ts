import { definePackageConfig } from '../tsup.config.base';

export default definePackageConfig({
  entry: ['src/index.ts'],
  dts: false, // Disabled due to x402/x402-fetch/viem version conflicts
  external: [
    '@AWEtoAgent/core',
    '@AWEtoAgent/identity',
    '@AWEtoAgent/wallet',
    'x402-fetch',
    'x402',
    'viem',
    'zod',
  ],
});

