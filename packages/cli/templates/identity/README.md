## {{AGENT_NAME}}

This project was scaffolded with `create-agent-kit` and includes **ERC-8004 identity registration** built on [`@awe-agents/core`](https://www.npmjs.com/package/@awe-agents/core) and [`@awe-agents/identity`](https://www.npmjs.com/package/@awe-agents/identity).

### Features

- ✅ ERC-8004 on-chain identity registration
- ✅ Automatic trust metadata in agent manifest
- ✅ x402 payment support
- ✅ Access to all three registries (Identity, Reputation, Validation)
- ✅ Domain ownership proof signing

### Quick start

1. **Review your `.env`:**

   The CLI already generated `.env` with everything you entered during scaffolding (domain, backend URL, token details, etc.). Update any values you want to change and make sure `AGENT_BACKEND_BASE_URL`, `AGENT_TOKEN_SYMBOL`, and `PAYMENTS_*` match your deployment.

   - If you supplied a private key during scaffolding, it’s stored in `AGENT_WALLET_PRIVATE_KEY`.
   - If you left it blank, the CLI generated `.agent-wallet.json` and wrote the new key into `.env` for you.
   - By default, the project targets **Base Sepolia**. Change `CHAIN_ID` + `RPC_URL` if you want a different network.

2. **Install dependencies:**

   ```sh
   bun install
   ```

3. **Run the agent:**
   ```sh
   bun run dev
   ```

The agent will:

- Check if it's registered on the ERC-8004 Identity Registry
- Auto-register if not found (when `IDENTITY_AUTO_REGISTER=true`)
- Sign a domain ownership proof
- Include trust metadata in `/.well-known/agent.json`

### Automatic onboarding

During scaffolding, the CLI already:

- Generated an agent wallet (if you didn’t supply one)
- Registered / verified your ERC-8004 identity
- Posted to your backend’s `/api/agents/init` endpoint to create the service token
- Wrote `./.well-known/agent-metadata.json`

If anything failed—or you want to rerun the flow after editing `.env`—use:

```sh
bun run agent:onboard
```

This script lives in `scripts/onboard-agent.ts` and mirrors the CLI workflow.

### Project structure

- `src/agent.ts` – Agent definition with identity bootstrap and entrypoints
- `src/index.ts` – HTTP server that serves the agent

### Default entrypoints

- `echo` – Echo input text

### ERC-8004 Registries

Your agent has access to all three registries:

```typescript
import { identityClient, reputationClient, validationClient } from "./agent";

// Give feedback to another agent
await reputationClient.giveFeedback({
  toAgentId: 42n,
  score: 90,
  tag: "helpful",
  comment: "Great service!",
});

// Create a validation request
await validationClient.createRequest({
  requestType: "inference-validation",
  dataHash: "0x...",
});
```

### Environment Variables

**Identity & backend:**

- `AGENT_DOMAIN`, `AGENT_BACKEND_BASE_URL` – Provided during scaffolding
- `AGENT_TOKEN_NAME`, `AGENT_TOKEN_SYMBOL`, `AGENT_SERVICE_TYPE` – Token + service metadata
- `AGENT_WALLET_PRIVATE_KEY` – Wallet used for ERC-8004 + signing (auto-generated if blank)
- `DEVELOPER_WALLET_PRIVATE_KEY` – Optional wallet for deployments / scripts
- `RPC_URL`, `CHAIN_ID`, `IDENTITY_AUTO_REGISTER` – Network + identity settings

**Payments:**

- `PAYMENTS_FACILITATOR_URL`, `PAYMENTS_NETWORK`, `PAYMENTS_RECEIVABLE_ADDRESS`
- `PAYMENTS_DEFAULT_PRICE` – Default micro-USDC amount when entrypoints don’t define a price

**Metadata (optional):**

- `AGENT_SHORT_DESCRIPTION`, `AGENT_ACCESS_DETAILS`, `AGENT_RESOURCE_LINK`
- `AGENT_GITHUB_LINK`, `AGENT_TWITTER_LINK`, `AGENT_DOCUMENT_LINK`
- `AGENT_METADATA_URI`, `AGENT_CARD_URI`, `AGENT_CAPABILITIES` (JSON array)

**Server:**

- `PORT` – HTTP server port (default: 3000)

> **Note:** ERC-8004 registry addresses are automatically configured using CREATE2 deterministic addresses. You don't need to specify them.

### Available scripts

- `bun run dev` – Start with hot reload
- `bun run start` – Start once
- `bun run agent` – Run agent module directly
- `bun run agent:onboard` – Re-run wallet + ERC-8004 + backend onboarding flow
- `bunx tsc --noEmit` – Type-check

### Next steps

1. **Deploy your agent** - Both well-known files are auto-served:

   - `/.well-known/agent-card.json` - Full agent manifest
   - `/.well-known/agent-metadata.json` - ERC-8004 identity metadata (only if registered)

2. **Customize your agent** in `src/agent.ts`

3. **Add more entrypoints** with different capabilities

4. **Deploy** to your favorite platform

### Learn more

- [Agent Kit Documentation](https://github.com/awe-agents/awe-agents/blob/master/packages/core/README.md)
- [Identity Kit Documentation](https://github.com/awe-agents/awe-agents/blob/master/packages/identity/README.md)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
