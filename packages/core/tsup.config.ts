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
    '@awe-agents/types',
    '@awe-agents/a2a',
    '@awe-agents/ap2',
    '@awe-agents/identity',
    '@awe-agents/payments',
    'hono',
    'viem',
    'x402',
    'x402-fetch',
    'x402-hono',
    'zod',
  ],
});
