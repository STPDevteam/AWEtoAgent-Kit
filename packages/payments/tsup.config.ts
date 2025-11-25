import { definePackageConfig } from '../tsup.config.base';

export default definePackageConfig({
  entry: ['src/index.ts'],
  dts: false, // Disabled due to x402/x402-fetch/viem version conflicts
  external: [
    '@awe-agents/core',
    '@awe-agents/identity',
    '@awe-agents/wallet',
    'x402-fetch',
    'x402',
    'viem',
    'zod',
  ],
});

