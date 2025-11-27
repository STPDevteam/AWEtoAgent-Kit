# Identity No-Register Agent Template - AI Coding Guide

This guide helps AI coding agents understand and extend this backend-managed identity agent project.

## Project Overview

This is a Bun HTTP agent with backend-managed ERC-8004 identity registration. Unlike the standard "identity" template, this template delegates ERC-8004 registration to the backend via `createTokenWithIdentity`.

**Key Files:**
- `src/agent.ts` - Agent definition with entrypoints
- `src/index.ts` - Bun HTTP server setup
- `.env` - Configuration (domain, RPC URLs, private key, etc.)

**Key Dependencies:**
- `@AWEtoAgent/core` - Agent app framework
- `@AWEtoAgent/identity` - ERC-8004 identity helpers
- `viem` - Ethereum client library
- `zod` - Schema validation

## Build & Development Commands

```bash
# Install dependencies
bun install

# Start in development mode (watch mode)
bun run dev

# Start once (production)
bun run start

# Type check
bunx tsc --noEmit
```

## How Identity Registration Works

Unlike the standard "identity" template which performs client-side ERC-8004 registration, this template:

1. **Skips client-side registration** - No local ERC-8004 registry calls
2. **Calls backend with `registerIdentity: true`** - The CLI posts to `/api/agents/init`
3. **Backend uses `createTokenWithIdentity`** - The factory contract handles both token creation and ERC-8004 registration in one transaction
4. **Identity NFT transferred to creator** - The factory transfers the ERC-8004 NFT to the creator address

This approach has several benefits:
- Simpler agent setup (no gas needed for registration)
- Single transaction for token + identity
- Backend manages the registration process

## Template Arguments

This template accepts the following configuration arguments:

- `AGENT_NAME` - Set automatically from project name
- `AGENT_DESCRIPTION` - Human-readable description
- `AGENT_VERSION` - Semantic version
- `AGENT_DOMAIN` - Domain that hosts your agent (e.g., "agent.example.com")
- `PAYMENTS_FACILITATOR_URL` - x402 facilitator endpoint
- `PAYMENTS_NETWORK` - Network identifier
- `PAYMENTS_RECEIVABLE_ADDRESS` - Address for receiving payments
- `RPC_URL` - Blockchain RPC endpoint (e.g., "https://sepolia.base.org")
- `CHAIN_ID` - Chain ID (e.g., "84532" for Base Sepolia)
- `AGENT_WALLET_PRIVATE_KEY` - Wallet private key (leave blank to auto-generate)

## Environment Variables Guide

Key fields in `.env`:

```bash
# Agent metadata
AGENT_NAME=my-agent
AGENT_DESCRIPTION=Agent with backend-managed identity
AGENT_VERSION=0.1.0
AGENT_DOMAIN=agent.example.com
AGENT_SHORT_DESCRIPTION=Agent with backend-managed identity

# Backend + token creation
AGENT_BACKEND_BASE_URL=http://localhost:3000/api
AGENT_SERVICE_TYPE=AI_AGENT
AGENT_TOKEN_NAME=Agent Token
AGENT_TOKEN_SYMBOL=AGENTA

# Payments
PAYMENTS_FACILITATOR_URL=https://facilitator.daydreams.systems
PAYMENTS_NETWORK=base-sepolia
PAYMENTS_RECEIVABLE_ADDRESS=0x...
PAYMENTS_DEFAULT_PRICE=1000

# Blockchain configuration
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Wallets
AGENT_WALLET_PRIVATE_KEY=0x...  # Leave blank to auto-generate
DEVELOPER_WALLET_PRIVATE_KEY=
```

## How to Add Entrypoints

```typescript
addEntrypoint({
  key: "my-entrypoint",
  description: "Description of what this entrypoint does",
  input: z.object({
    param1: z.string(),
    param2: z.number().optional(),
  }),
  output: z.object({
    result: z.string(),
  }),
  handler: async ({ input }) => {
    // Your logic here
    return {
      output: {
        result: `Processed: ${input.param1}`,
      },
    };
  },
});
```

## Testing Your Agent

```bash
# Start the agent
bun run dev

# Test the echo entrypoint
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Hello, World!"}}'
```

## Troubleshooting

### Backend onboarding failed

Ensure:
1. `AGENT_BACKEND_BASE_URL` is correctly set
2. Backend is running and accessible
3. Token symbol is unique (not already registered)

### Wallet not funded

For this template, wallet funding is only needed for:
- Signing messages (no gas required)
- Any contract interactions your entrypoints might make

The ERC-8004 registration gas is paid by the backend.

## Security Considerations

1. **Private Key Security**: Never commit `.env` to version control
2. **Domain Verification**: Ensure you control the domain you register
3. **Backend Trust**: This template trusts the backend to manage identity registration

## Next Steps

1. **Configure environment** - Set domain, backend URL, and private key
2. **Run onboarding** - CLI automatically calls backend to create token + identity
3. **Add entrypoints** - Implement features in your agent
4. **Deploy** - Use Bun-compatible hosting with secure key management

## Additional Resources

- [ERC-8004 Specification](https://github.com/ethereum/ERCs/issues/8004)
- [@AWEtoAgent/identity docs](../../../identity/README.md)
- [viem documentation](https://viem.sh/)
- [Base network docs](https://docs.base.org/)
