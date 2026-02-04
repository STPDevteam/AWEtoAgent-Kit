# @aweto-agent/x402-tanstack-start

## 0.1.2

### Patch Changes

- Add Ethereum mainnet support for x402 payments
  - Upgrade x402 and x402-fetch packages from 0.7.x to 1.1.0
  - Add support for `ethereum` and `sepolia` networks (including CAIP-2 formats `eip155:1` and `eip155:11155111`)
  - Extend `inferChainId()` to support additional EVM networks (polygon, avalanche)
  - Note: Using Ethereum mainnet requires a facilitator that supports it (CDP facilitator only supports Base and Solana)
