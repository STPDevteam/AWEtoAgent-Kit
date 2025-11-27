# @aweto-agent/ap2

AP2 (Agent Payments Protocol) extension for Lucid agents. Adds AP2 extension metadata to Agent Cards, enabling agents to declare payment-related capabilities and roles.

## What is AP2?

AP2 (Agent Payments Protocol) is an extension to the A2A Protocol that enables agents to declare payment-related capabilities. Agents can declare roles such as `merchant` (accepts payments) or `shopper` (makes payments), allowing other agents to discover payment-enabled capabilities.

## Installation

```bash
bun add @aweto-agent/ap2
```

## Quick Start

### Basic Usage

```typescript
import { createAgentCardWithAP2, createAP2Runtime } from '@aweto-agent/ap2';
import { buildAgentCard } from '@aweto-agent/a2a';

// Build base Agent Card
let card = buildAgentCard({
  meta: { name: 'my-agent', version: '1.0.0' },
  registry: entrypoints,
  origin: 'https://my-agent.example.com',
});

// Add AP2 extension
card = createAgentCardWithAP2(card, {
  roles: ['merchant'],
  description: 'Accepts payments for services',
});

// Create AP2 runtime
const ap2Runtime = createAP2Runtime({
  roles: ['merchant'],
});
```

### Integration with Agent Runtime

```typescript
import { createAgentApp } from '@aweto-agent/hono';
import { createAP2Runtime } from '@aweto-agent/ap2';

const { app, runtime } = createAgentApp(
  {
    name: 'my-agent',
    version: '1.0.0',
  },
  {
    // AP2 is automatically enabled when payments are configured
    payments: {
      payTo: process.env.PAYMENTS_RECEIVABLE_ADDRESS!,
      network: 'base-sepolia',
      facilitatorUrl: 'https://facilitator.example.com',
    },
  }
);

// AP2 runtime is available via runtime.ap2
if (runtime.ap2) {
  console.log('AP2 roles:', runtime.ap2.config.roles);
}
```

## API Reference

### `createAP2Runtime(config?)`

Creates an AP2 runtime from configuration. Returns `undefined` if no config provided.

```typescript
import { createAP2Runtime } from '@aweto-agent/ap2';

const ap2Runtime = createAP2Runtime({
  roles: ['merchant', 'shopper'],
  description: 'Payment-enabled agent',
  required: true,
});
```

### `createAgentCardWithAP2(card, ap2Config)`

Adds AP2 extension metadata to an Agent Card. Returns a new card (immutable).

```typescript
import { createAgentCardWithAP2 } from '@aweto-agent/ap2';

const enhancedCard = createAgentCardWithAP2(card, {
  roles: ['merchant'],
  description: 'Accepts payments',
});
```

### `AP2_EXTENSION_URI`

The canonical URI for the AP2 extension.

```typescript
import { AP2_EXTENSION_URI } from '@aweto-agent/ap2';

console.log(AP2_EXTENSION_URI);
```

## AP2 Roles

- **`merchant`**: Agent accepts payments for its services
- **`shopper`**: Agent makes payments to other agents

An agent can have multiple roles (e.g., both `merchant` and `shopper`).

## Auto-Enablement

When payments are configured in the agent runtime, the `merchant` role is automatically added to the AP2 extension. This ensures that payment-enabled agents are discoverable by other agents.

## Related Packages

- `@aweto-agent/a2a` - A2A Protocol implementation (Agent Cards)
- `@aweto-agent/payments` - x402 payment protocol utilities
- `@aweto-agent/core` - Core agent runtime

## Resources

- [A2A Protocol Specification](https://a2a-protocol.org/) - Agent-to-Agent communication protocol

