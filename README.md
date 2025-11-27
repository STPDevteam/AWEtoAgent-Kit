<div align="center">
  <h1>AWEtoAgent</h1>
  <p><strong>The Multi-Runtime Framework for Building and Monetizing AI Agents</strong></p>
  <p>Build, deploy, and monetize autonomous AI agents with typed entrypoints, on-chain identity, and built-in payment infrastructure.</p>
</div>

<div align="center">
  <a href="https://github.com/STPDevteam/AWEtoAgent-Kit/blob/master/LICENSE"><img src="https://img.shields.io/github/license/STPDevteam/AWEtoAgent-Kit?style=for-the-badge" alt="License"></a>
  <a href="https://www.npmjs.com/package/@aweto-agent/cli"><img src="https://img.shields.io/npm/v/@aweto-agent/cli?style=for-the-badge" alt="NPM Version"></a>
  <a href="https://github.com/STPDevteam/AWEtoAgent-Kit/actions"><img src="https://img.shields.io/github/actions/workflow/status/STPDevteam/AWEtoAgent-Kit/ci.yml?branch=master&style=for-the-badge" alt="CI Status"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-bun-black?style=for-the-badge&logo=bun" alt="Bun"></a>
</div>

---

## What is AWEtoAgent?

AWEtoAgent is a TypeScript-first framework for building and monetizing AI agents—an agentic commerce and payments SDK. Build AI agents that sell services, facilitate monetary transactions, and participate in agent-to-agent marketplaces.

**Core Capabilities:**

- **x402 Payment Protocol**: Accept payments in USDC on Ethereum L2s (Base) or Solana with automatic paywall middleware
- **A2A Protocol Support**: Agent-to-agent communication with task-based operations, enabling agents to buy and sell services from each other
- **ERC-8004 Identity Layer**: Register agent identities on-chain, build reputation, and prove ownership for trust in agent marketplaces
- **Multi-Adapter Architecture**: Write your agent logic once, deploy on Hono, TanStack Start, Express, or Next.js
- **Type-Safe Entrypoints**: Define inputs/outputs with Zod schemas, get automatic validation and JSON schemas
- **Streaming Support**: Server-Sent Events (SSE) for real-time agent responses
- **Task Management**: Long-running tasks with status tracking, cancellation, and SSE subscriptions
- **AgentCard Manifests**: Auto-generated A2A-compatible manifests with Open Graph tags for discoverability
- **Template System**: Scaffold new agents with `blank`, `axllm`, `axllm-flow`, `identity`, `trading-data-agent`, or `trading-recommendation-agent` templates
- **Multi-Network Support**: EVM (Base, Ethereum, Sepolia) and Solana (mainnet, devnet) payment networks
- **Developer Experience**: CLI scaffolding, hot reload, comprehensive examples, TypeScript strict mode, and ESM modules

Whether you're building paid AI services, agent marketplaces, or multi-agent systems where agents transact with each other, AWEtoAgent provides the payments and commerce infrastructure you need.

---

## Quick Start (5 Minutes)

Get your first monetized AI agent running in minutes.

### Prerequisites

- [Bun](https://bun.sh/docs/installation) >= 1.0 (recommended) or Node.js >= 20.9
- An API key from your preferred LLM provider (OpenAI, Anthropic, etc.)
- Optional: A wallet address for receiving payments
- Optional: Testnet ETH for ERC-8004 identity registration

### Create Agent with Hono (Step-by-Step Example)

```bash
# Run CLI in interactive mode
cd /path/to/AWEtoAgent-Kit
node ./packages/cli/dist/index.js
```

**Step 1: Select Runtime Adapter**
```
Select a runtime adapter:
  1. Hono
  2. Express
  3. TanStack Start (UI)
  4. TanStack Start (Headless)
  5. Next.js
Select an option [1-5]: 1
```

**Step 2: Select Template**
```
Select a template for Hono:
  1. AxLLM Bun Agent
  2. AxLLM Flow Agent
  3. Blank Bun Agent
  4. Agent with ERC-8004 Identity  ← Recommended for on-chain identity
  5. Trading Data Agent
  6. Trading Recommendation Agent
Select an option [1-6]: 4
```

**Step 3: Configure Agent**
```
Project directory name: my-agent
How would you describe your agent? My AI Agent
What version should the agent start at? 0.1.0
What domain will host your agent? agent.example.com
Short description for listings: On-chain agent with verifiable identity

Service type:
  1. AI Agent
  2. API Access
  3. MCP Service
Select an option [1-3]: 1

Token name (for backend factory): My Agent Token
Token symbol (max 10 chars): MYAGT
Backend base URL: http://localhost:3000/api
```

**Step 4: Configure Payments**
```
Facilitator URL: https://facilitator.world.fun/
Payment network:
  1. Base Sepolia (EVM testnet)  ← For testing
  2. Base (EVM mainnet)
  3. Solana Devnet
  4. Solana Mainnet
Select an option [1-4]: 1

Payment address (0x... for EVM): 0xYourWalletAddress
Default price for entrypoints (micro USDC 1000 -> 0.001 USDC): 1000
```

**Step 5: Configure Blockchain**
```
RPC URL: https://sepolia.base.org
Chain ID: 84532
Auto-register on ERC-8004 registry? Y
```

**Step 6: Configure Wallet**
```
Agent wallet private key (leave blank to auto-generate):
  - Leave blank: Auto-generates new wallet (requires funding later)
  - Enter private key: Uses existing funded wallet for immediate registration
```

**What Happens Next:**

If wallet has ETH balance:
```
[cli] Wallet 0x... balance: 0.01 ETH
[cli] Registering / checking ERC-8004 identity...
[cli] Registration tx hash: 0x...
[cli] Identity Agent ID: 1234
[cli] Calling backend /agents/init endpoint...
[cli] Backend onboarding complete. Token: 0x...
```

If wallet has no ETH (auto-generated):
```
[cli] Generated agent wallet 0x...
[cli] ⚠️  Wallet 0x... has 0 ETH balance.
[cli] Skipping ERC-8004 on-chain registration (requires gas fees).
[cli] To complete registration later:
[cli]   1. Fund the wallet with testnet ETH
[cli]      Faucets for Base Sepolia:
[cli]      - https://www.alchemy.com/faucets/base-sepolia
[cli]      - https://faucets.chain.link/base-sepolia
[cli]   2. Run: cd my-agent && bun run agent:onboard
```

### Start Your Agent

```bash
cd my-agent
bun install
bun run dev
```

Your agent is now running at `http://localhost:3000`!

**Try it out:**

```bash
# View agent manifest
curl http://localhost:3000/.well-known/agent.json

# List entrypoints
curl http://localhost:3000/entrypoints

# Invoke an entrypoint (example for echo template)
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "Hello, AWEtoAgent!"}}'
```

### Complete Registration Later (If Skipped)

If you auto-generated a wallet without ETH:

```bash
# 1. Get your wallet address from the generated project
cat my-agent/.agent-wallet.json

# 2. Fund the wallet using a faucet (Base Sepolia)
#    - https://www.alchemy.com/faucets/base-sepolia
#    - https://faucets.chain.link/base-sepolia

# 3. Run onboarding to complete ERC-8004 registration
cd my-agent
bun run agent:onboard
```

---

## Architecture Overview

AWEtoAgent is a TypeScript monorepo built for multi-runtime agent deployment with a layered architecture:

- **Layer 0: Types** - Shared type definitions (`@AWEtoAgent/types`)
- **Layer 1: Extensions** - Optional capabilities (identity, payments, wallet, a2a, ap2)
- **Layer 2: Core** - Framework-agnostic agent runtime (`@AWEtoAgent/core`)
- **Layer 3: Adapters** - Framework integrations (hono, tanstack, express, next)
- **Layer 4: Developer Tools** - CLI scaffolding and templates

> For detailed architecture documentation including dependency graphs, request flows, and extension system design, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Package Structure

```
/
├── packages/
│   ├── core/              # Core runtime and types
│   │   ├── src/core/           # Agent runtime, manifest generation
│   │   ├── src/http/           # HTTP utilities, task handlers
│   │   └── src/axllm/          # LLM integration helpers
│   │
│   ├── a2a/              # A2A Protocol client
│   │   ├── src/client.ts       # Agent-to-agent client (invoke, stream, tasks)
│   │   ├── src/card.ts         # Agent Card building and fetching
│   │   └── src/runtime.ts      # A2A runtime integration
│   │
│   ├── ap2/              # AP2 (Agent Payments Protocol) extension
│   │   ├── src/runtime.ts      # AP2 runtime
│   │   └── src/manifest.ts     # Agent Card AP2 enhancement
│   │
│   ├── wallet/           # Wallet SDK
│   │   ├── src/connectors/     # Wallet connectors (local, server)
│   │   └── src/factory.ts     # Wallet factory
│   │
│   ├── hono/         # Hono HTTP server adapter
│   │   ├── src/app.ts          # createAgentApp() for Hono
│   │   └── src/paywall.ts      # x402 payment middleware
│   │
│   ├── tanstack/     # TanStack Start adapter
│   │   ├── src/runtime.ts      # createTanStackRuntime()
│   │   └── src/paywall.ts      # TanStack payment middleware
│   │
│   ├── express/       # Express adapter
│   │   ├── src/app.ts          # createAgentApp() for Express
│   │   └── src/paywall.ts      # Express payment middleware
│   │
│   ├── next/         # Next.js adapter
│   │   ├── app/                # Next.js App Router routes
│   │   ├── components/         # Dashboard UI components
│   │   └── lib/                # Agent setup and utilities
│   │
│   ├── identity/     # ERC-8004 identity toolkit
│   │   ├── src/init.ts         # createAgentIdentity()
│   │   ├── src/registries/     # Identity/Reputation/Validation clients
│   │   └── src/utils/          # Signature helpers, CAIP-10
│   │
│   ├── payments/     # x402 payment utilities
│   │   ├── src/payments.ts     # Multi-network payment config
│   │   └── src/x402.ts         # x402 protocol helpers
│   │
│   └── cli/       # CLI scaffolding tool
│       ├── src/index.ts        # Interactive CLI
│       ├── adapters/           # Runtime frameworks (hono, tanstack, express, next)
│       └── templates/          # Project templates (blank, axllm, identity, trading-*)
```

### Key Concepts

**Entrypoints**: Typed API endpoints that define your agent's capabilities. Each entrypoint has:

- Input/output schemas (Zod)
- Optional pricing (x402)
- Handler (synchronous) or stream handler (SSE)

**Adapters**: Runtime frameworks that expose your entrypoints as HTTP routes. Choose based on your deployment needs:

- `hono` - Lightweight, edge-compatible HTTP server
- `tanstack` - Full-stack React with UI dashboard (or headless API-only)
- `express` - Traditional Node.js HTTP server
- `next` - Next.js App Router integration

**A2A Communication**: Agent-to-agent communication protocol enabling agents to call other agents:

- **Direct Invocation**: Synchronous calls via `client.invoke()` or `client.stream()`
- **Task-Based Operations**: Long-running tasks with `sendMessage()`, status tracking, and cancellation
- **Multi-Turn Conversations**: Group related tasks with `contextId` for conversational agents
- **Agent Composition**: Agents can act as both clients and servers, enabling complex supply chains

**Manifests**: Auto-generated AgentCard (`.well-known/agent-card.json`) that describes your agent's capabilities, pricing, and identity for discovery tools and A2A protocols. Built using immutable composition pattern.

**Payment Networks**: Accept payments on:

- **EVM**: Base, Ethereum, Sepolia (ERC-20 USDC)
- **Solana**: Mainnet, Devnet (SPL USDC)

**Identity**: ERC-8004 on-chain identity for reputation and trust. Register once, reference across all networks.

---

## Key Packages

### Core Packages

#### [`@AWEtoAgent/core`](packages/core/README.md)

Core agent runtime with entrypoints, manifests, and streaming support.

```typescript
import { createRuntime } from '@AWEtoAgent/core';
import { z } from 'zod';

const runtime = createRuntime({
  name: 'my-agent',
  version: '1.0.0',
  description: 'My first agent',
});

runtime.addEntrypoint({
  key: 'greet',
  input: z.object({ name: z.string() }),
  async handler({ input }) {
    return { output: { message: `Hello, ${input.name}!` } };
  },
});
```

#### [`@AWEtoAgent/hono`](packages/hono/README.md)

Hono adapter for building traditional HTTP servers.

```typescript
import { createAgentApp } from '@AWEtoAgent/hono';

const { app, addEntrypoint } = createAgentApp({
  name: 'my-agent',
  version: '1.0.0',
});

// Add entrypoints...

export default app; // Bun.serve or Hono serve
```

#### [`@AWEtoAgent/tanstack`](packages/tanstack/README.md)

TanStack Start adapter with UI and headless variants.

```typescript
import { createTanStackRuntime } from '@AWEtoAgent/tanstack';

export const { runtime, handlers } = createTanStackRuntime({
  name: 'my-agent',
  version: '1.0.0',
});
```

#### [`@AWEtoAgent/identity`](packages/identity/README.md)

ERC-8004 toolkit for on-chain identity, reputation, and validation.

```typescript
import { createAgentIdentity } from '@AWEtoAgent/identity';

const identity = await createAgentIdentity({
  domain: 'my-agent.example.com',
  autoRegister: true, // Register on-chain if not exists
});
```

#### [`@AWEtoAgent/payments`](packages/payments/README.md)

x402 payment utilities for multi-network payment handling.

```typescript
import { paymentsFromEnv } from '@AWEtoAgent/payments';

const payments = paymentsFromEnv();
// Auto-detects EVM vs Solana from PAYMENTS_RECEIVABLE_ADDRESS format
```

#### [`@AWEtoAgent/a2a`](packages/a2a/README.md)

A2A Protocol client for agent-to-agent communication.

```typescript
import { fetchAndInvoke, sendMessage, waitForTask } from '@AWEtoAgent/a2a';

// Direct invocation
const result = await fetchAndInvoke('https://other-agent.com', 'skillId', {
  input: 'data',
});

// Task-based operations
const { taskId } = await sendMessage(
  card,
  'skillId',
  { input: 'data' },
  undefined,
  {
    contextId: 'conversation-123',
  }
);
const task = await waitForTask(client, card, taskId);
```

#### [`@AWEtoAgent/ap2`](packages/ap2/README.md)

AP2 (Agent Payments Protocol) extension for Agent Cards.

```typescript
import { createAP2Runtime, createAgentCardWithAP2 } from '@AWEtoAgent/ap2';

const ap2Runtime = createAP2Runtime({ roles: ['merchant'] });
const cardWithAP2 = createAgentCardWithAP2(baseCard, ap2Runtime.config);
```

#### [`@AWEtoAgent/wallet`](packages/wallet/README.md)

Wallet SDK for agent and developer wallet management.

```typescript
import { createAgentWallet } from '@AWEtoAgent/wallet';

const wallet = await createAgentWallet({
  type: 'local',
  privateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
});
```

### CLI Tool

#### [`@AWEtoAgent/cli`](packages/cli/README.md)

CLI for scaffolding new agent projects with templates and interactive configuration.

```bash
# Interactive mode
bunx @AWEtoAgent/cli

# With options
bunx @AWEtoAgent/cli my-agent \
  --adapter=tanstack-ui \
  --template=axllm \
  --non-interactive
```

Each package contains detailed API documentation, environment variable references, and working examples.

---

## Example: Full-Featured Agent

Here's a complete example showing identity, payments, and LLM integration:

```typescript
import { z } from 'zod';
import { createAgentApp } from '@AWEtoAgent/hono';
import { createAgentIdentity, getTrustConfig } from '@AWEtoAgent/identity';
import { AI } from '@ax-llm/ax';

// 1. Create on-chain identity
const identity = await createAgentIdentity({
  domain: 'my-agent.example.com',
  autoRegister: true,
});

// 2. Initialize LLM
const ai = new AI({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

// 3. Create agent with payments and identity
const { app, addEntrypoint } = createAgentApp(
  {
    name: 'ai-assistant',
    version: '1.0.0',
    description: 'AI assistant with on-chain reputation',
    image: 'https://my-agent.example.com/og-image.png',
  },
  {
    config: {
      payments: {
        payTo: process.env.PAYMENTS_RECEIVABLE_ADDRESS!,
        network: 'base-sepolia',
        facilitatorUrl: 'https://facilitator.world.fun/',
        defaultPrice: '5000', // 0.005 USDC per request
      },
    },
    useConfigPayments: true,
    trust: getTrustConfig(identity),
  }
);

// 4. Add paid entrypoint with streaming
addEntrypoint({
  key: 'chat',
  description: 'Chat with AI assistant',
  input: z.object({
    message: z.string(),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .optional(),
  }),
  streaming: true,
  async stream(ctx, emit) {
    const messages = [
      ...(ctx.input.history || []),
      { role: 'user' as const, content: ctx.input.message },
    ];

    const stream = await ai.chat.stream({ messages });

    for await (const chunk of stream) {
      await emit({
        kind: 'delta',
        delta: chunk.delta,
        mime: 'text/plain',
      });
    }

    return {
      output: { completed: true },
      usage: { total_tokens: stream.usage.total_tokens },
    };
  },
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`agent listening on http://localhost:${port}`);
});
```

**Features demonstrated:**

- On-chain identity registration (ERC-8004)
- Automatic x402 payment verification
- Streaming LLM responses via SSE
- Type-safe input/output schemas
- Trust metadata in manifest
- Open Graph tags for discovery

---

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/STPDevteam/AWEtoAgent-Kit.git
cd AWEtoAgent-Kit

# Install dependencies
bun install

# Build all packages
bun run build:packages
```

### Package Development

```bash
# Work on a specific package
cd packages/core

# Build this package
bun run build

# Run tests
bun test

# Type check
bun run type-check

# Lint and format
bun run lint:fix
bun run format
```

---

## Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation.

### Development Setup

1. **Fork and clone** the repository

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Build all packages** (required - must run in dependency order):

   ```bash
   bun run build:packages
   ```

4. **Make your changes:**
   - Add tests for new features
   - Update documentation as needed

5. **Run checks before submitting:**

   ```bash
   bun test              # All tests
   bun run type-check    # TypeScript validation
   bun run lint          # Code linting
   ```

6. **Create a changeset:**

   ```bash
   bun run changeset
   ```

7. **Submit a pull request**

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Resources

### Documentation

- **Architecture Guide**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design, dependency graphs, and request flows
- **Package READMEs**: Each package has comprehensive documentation and `AGENTS.md` files
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow and guidelines

### Protocols & Specifications

- **ERC-8004 Specification**: [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) - On-chain agent identity standard
- **x402 Protocol**: [x402 GitHub](https://github.com/paywithx402) - HTTP-native payment protocol
- **A2A Protocol**: [Agent-to-Agent Communication](https://a2a-protocol.org/) - Agent discovery and communication protocol

### Technologies

- **Hono Framework**: [hono.dev](https://hono.dev/) - Lightweight web framework
- **TanStack Start**: [tanstack.com/start](https://tanstack.com/start) - Full-stack React framework
- **Bun Runtime**: [bun.sh](https://bun.sh/) - Fast JavaScript runtime
- **Zod**: [zod.dev](https://zod.dev/) - TypeScript-first schema validation

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Contributors

<a href="https://github.com/STPDevteam/AWEtoAgent-Kit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=STPDevteam/AWEtoAgent-Kit" alt="Contributors" />
</a>

---

## Star History

<a href="https://star-history.com/#STPDevteam/AWEtoAgent-Kit&Date">
  <img src="https://api.star-history.com/svg?repos=STPDevteam/AWEtoAgent-Kit&type=Date" alt="Star History Chart" />
</a>

---

<div align="center">
  <p>Originally forked from <a href="https://github.com/daydreamsai/lucid-agents">Daydreams</a> — grateful for their foundational work.</p>
  <p>Built with ❤️ by the AWE team</p>
  <p>
    <a href="https://github.com/STPDevteam/AWEtoAgent-Kit">GitHub</a> •
    <a href="https://www.npmjs.com/package/@aweto-agent/cli">npm</a> •
    <a href="https://x.com/awenetwork_ai">X (Twitter)</a>
  </p>
</div>
