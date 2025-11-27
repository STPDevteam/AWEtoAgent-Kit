import { z } from "zod";

import { createAgentApp } from "@AWEtoAgent/hono";

import { walletsFromEnv } from "@AWEtoAgent/wallet";

// Configure wallets for signing operations
const appOptions = {
  config: {
    wallets: walletsFromEnv(),
  },
};

const { app, runtime, addEntrypoint } = createAgentApp(
  {
    name: process.env.AGENT_NAME,
    version: process.env.AGENT_VERSION,
    description: process.env.AGENT_DESCRIPTION,
  },
  typeof appOptions !== 'undefined' ? appOptions : {}
);

addEntrypoint({
  key: "echo",
  description: "Echo input text",
  input: z.object({
    text: z.string().min(1, "Please provide some text."),
  }),
  handler: async ({ input }) => {
    return {
      output: {
        text: input.text,
      },
    };
  },
});

// Note: This template uses AWE backend-managed ERC-8004 identity registration.
// The backend calls createTokenWithIdentity which handles both token creation
// and ERC-8004 registration in a single transaction.
// No on-chain registration is needed from this agent.

const agentName = process.env.AGENT_NAME ?? "agent";
const agentDomain = process.env.AGENT_DOMAIN ?? "localhost";

console.log(`[${agentName}] Agent started successfully`);
console.log(`[${agentName}] Domain: ${agentDomain}`);
console.log(`[${agentName}] ERC-8004 identity is managed by AWE backend`);

export { app };