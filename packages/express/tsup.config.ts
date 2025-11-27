import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "./tsconfig.build.json",
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@aweto-agent/core',
    '@aweto-agent/payments',
    '@aweto-agent/types',
    'express',
    'x402-express',
    'x402',
    'zod',
  ],
});
