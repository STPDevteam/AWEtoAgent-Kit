import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  external: [
    '@aweto-agent/core',
    '@aweto-agent/payments',
    '@aweto-agent/types',
    '@aweto-agent/x402-tanstack-start',
    '@tanstack/start',
    '@tanstack/react-router',
    'viem',
    'x402',
  ],
});
