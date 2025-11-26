import { definePackageConfig } from '../tsup.config.base';

const entryPoints = {
  index: 'src/index.ts',
  utils: 'src/utils/index.ts',
  'axllm/index': 'src/axllm/index.ts',
};

export default definePackageConfig({
  entry: entryPoints,
  dts: {
    entry: entryPoints,
  },
  external: [
    '@ax-llm/ax',
    '@AWEtoAgent/types',
    '@AWEtoAgent/a2a',
    '@AWEtoAgent/ap2',
    '@AWEtoAgent/identity',
    '@AWEtoAgent/payments',
    'hono',
    'viem',
    'x402',
    'x402-fetch',
    'x402-hono',
    'zod',
  ],
});
