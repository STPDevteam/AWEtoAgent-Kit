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
    '@AWEtoAgent/core',
    '@AWEtoAgent/payments',
    '@AWEtoAgent/types',
    '@AWEtoAgent/x402-tanstack-start',
    '@tanstack/start',
    '@tanstack/react-router',
    'viem',
    'x402',
  ],
});
