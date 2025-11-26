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
    '@AWEtoAgent/core',
    '@AWEtoAgent/payments',
    '@AWEtoAgent/types',
    'express',
    'x402-express',
    'x402',
    'zod',
  ],
});
