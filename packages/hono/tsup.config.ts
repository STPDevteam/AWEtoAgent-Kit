import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  tsconfig: "./tsconfig.build.json",
  external: [
    '@aweto-agent/core',
    '@aweto-agent/payments',
    '@aweto-agent/types',
    'hono',
    'x402-hono',
    'x402',
    'zod',
  ],
});
