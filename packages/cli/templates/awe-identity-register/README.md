## {{AGENT_NAME}}

This project was scaffolded with `create-agent-kit` and includes **AWE backend-managed ERC-8004 identity** built on [`@AWEtoAgent/core`](https://www.npmjs.com/package/@AWEtoAgent/core).

### Features

- ✅ ERC-8004 identity registration via AWE backend (`createTokenWithIdentity`)
- ✅ x402 payment support
- ✅ Automatic token creation with identity
- ✅ Domain ownership proof signing

### 🚀 Quick Start

**1. Install dependencies (if not already installed):**

```bash
bun install
```

**2. Start the agent:**

```bash
bun run dev
```

Your agent is now running at `http://localhost:3000`!

**3. Test your agent:**

```bash
# Check health
curl http://localhost:3000/health

# Test echo entrypoint
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Hello, World!"}}'

# View agent manifest
curl http://localhost:3000/.well-known/agent.json
```

### Configuration

The CLI already generated `.env` with everything you entered during scaffolding:

- **Agent wallet**: If you left `AGENT_WALLET_PRIVATE_KEY` blank, the CLI auto-generated one and saved it in `.agent-wallet.json`
- **Payment address**: Defaults to your agent wallet address (USDC payments go directly to this address)
- **Backend URL**: `AGENT_BACKEND_BASE_URL` points to your AWE backend
- **Network**: Defaults to Base Sepolia. Change `CHAIN_ID` + `RPC_URL` for other networks

### How it works

This template uses the AWE backend to manage ERC-8004 identity registration:

1. The CLI calls the backend's `/api/agents/init` endpoint with `registerIdentity: true`
2. The backend calls `createTokenWithIdentity` on the factory contract
3. The factory contract registers the ERC-8004 identity and creates the token in one transaction
4. The identity NFT is transferred to the creator address

This approach simplifies the agent setup by delegating identity registration to the AWE backend.

### Re-run Onboarding

If the initial onboarding failed—or you want to rerun after editing `.env`:

```bash
bun run agent:onboard
```

### Project structure

- `src/agent.ts` – Agent definition with entrypoints
- `src/index.ts` – HTTP server that serves the agent

### Default entrypoints

- `echo` – Echo input text

### Environment Variables

**Identity & backend:**

- `AGENT_DOMAIN`, `AGENT_BACKEND_BASE_URL` – Provided during scaffolding
- `AGENT_TOKEN_NAME`, `AGENT_TOKEN_SYMBOL`, `AGENT_SERVICE_TYPE` – Token + service metadata
- `AGENT_WALLET_PRIVATE_KEY` – Wallet used for signing (auto-generated if blank)
- `RPC_URL`, `CHAIN_ID` – Network settings

**Payments:**

- `PAYMENTS_FACILITATOR_URL` – x402 facilitator endpoint (defaults to https://facilitator.world.fun/)
- `PAYMENTS_NETWORK` – Network identifier (base-sepolia or base)
- `PAYMENTS_RECEIVABLE_ADDRESS` – Payment address (defaults to agent wallet address)
- `PAYMENTS_DEFAULT_PRICE` – Default micro-USDC amount when entrypoints don't define a price

**Metadata (optional):**

- `AGENT_SHORT_DESCRIPTION`, `AGENT_ACCESS_DETAILS`, `AGENT_RESOURCE_LINK`
- `AGENT_GITHUB_LINK`, `AGENT_TWITTER_LINK`, `AGENT_DOCUMENT_LINK`
- `AGENT_METADATA_URI`, `AGENT_CARD_URI`, `AGENT_CAPABILITIES` (JSON array)

**Server:**

- `PORT` – HTTP server port (default: 3000)

### Available scripts

- `bun run dev` – Start with hot reload
- `bun run start` – Start once
- `bun run agent:onboard` – Re-run wallet + backend onboarding flow
- `bunx tsc --noEmit` – Type-check

### Next steps

1. **Deploy your agent** - The agent card is auto-served:

   - `/.well-known/agent-card.json` - Full agent manifest

2. **Customize your agent** in `src/agent.ts`

3. **Add more entrypoints** with different capabilities

4. **Deploy** to your favorite platform

### Learn more

- [Agent Kit Documentation](https://github.com/awe-agents/awe-agents/blob/master/packages/core/README.md)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
