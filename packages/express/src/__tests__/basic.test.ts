import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { createAgentApp } from '../app';

describe('@aweto-agent/express', () => {
  it('creates an Express app and registers entrypoints', () => {
    const { app, addEntrypoint } = createAgentApp({
      name: 'express-agent',
      version: '1.0.0',
      description: 'Test agent',
    });

    expect(typeof app).toBe('function');

    expect(() =>
      addEntrypoint({
        key: 'echo',
        description: 'Echo input text',
        input: z.object({
          text: z.string(),
        }),
        async handler({ input }) {
          return {
            output: { text: input.text },
          };
        },
      })
    ).not.toThrow();
  });
});
