import { describe, expect, it, mock } from 'bun:test';
import type { AgentCardWithEntrypoints, AgentMeta } from '@aweto-agent/types/core';
import type { EntrypointDef } from '@aweto-agent/types/core';
import { z } from 'zod';

import { buildAgentCard, fetchAgentCard, findSkill, parseAgentCard } from '../card';

describe('buildAgentCard', () => {
  const meta: AgentMeta = {
    name: 'test-agent',
    version: '1.0.0',
    description: 'Test agent',
  };

  const entrypoints: EntrypointDef[] = [
    {
      key: 'echo',
      description: 'Echo endpoint',
      input: z.object({ text: z.string() }),
      output: z.object({ text: z.string() }),
      handler: async () => ({ output: { text: 'echo' } }),
    },
    {
      key: 'stream',
      description: 'Stream endpoint',
      input: z.object({ text: z.string() }),
      output: z.object({ text: z.string() }),
      stream: async () => ({ output: { text: 'stream' } }),
      handler: async () => ({ output: { text: 'stream' } }),
    },
  ];

  it('builds base A2A card with skills, capabilities, and entrypoints', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.name).toBe('test-agent');
    expect(card.version).toBe('1.0.0');
    expect(card.description).toBe('Test agent');
    expect(card.url).toBe('https://agent.example.com/');
    expect(card.skills).toBeDefined();
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.skills).toHaveLength(2);
    expect(card.capabilities).toBeDefined();
    expect(card.entrypoints).toBeDefined();
  });

  it('generates skills array from entrypoints', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.skills).toHaveLength(2);
    const echoSkill = card.skills?.find(s => s.id === 'echo');
    expect(echoSkill).toBeDefined();
    expect(echoSkill?.name).toBe('echo');
    expect(echoSkill?.description).toBe('Echo endpoint');
    expect(echoSkill?.streaming).toBe(false);

    const streamSkill = card.skills?.find(s => s.id === 'stream');
    expect(streamSkill).toBeDefined();
    expect(streamSkill?.streaming).toBe(true);
  });

  it('sets capabilities.streaming when any entrypoint supports streaming', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.capabilities?.streaming).toBe(true);
  });

  it('sets capabilities.streaming to false when no entrypoints support streaming', () => {
    const noStreamEntrypoints: EntrypointDef[] = [
      {
        key: 'echo',
        input: z.object({ text: z.string() }),
        output: z.object({ text: z.string() }),
        handler: async () => ({ output: { text: 'echo' } }),
      },
    ];

    const card = buildAgentCard({
      meta,
      registry: noStreamEntrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.capabilities?.streaming).toBe(false);
  });

  it('does NOT include payments in base card', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.payments).toBeUndefined();
  });

  it('does NOT include identity/trust in base card', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.registrations).toBeUndefined();
    expect(card.trustModels).toBeUndefined();
    expect(card.ValidationRequestsURI).toBeUndefined();
  });

  it('does NOT include AP2 extensions in base card', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.capabilities?.extensions).toBeUndefined();
  });

  it('does NOT include pricing in entrypoints', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.entrypoints.echo).toBeDefined();
    expect(card.entrypoints.echo.pricing).toBeUndefined();
  });

  it('includes entrypoint schemas', () => {
    const card = buildAgentCard({
      meta,
      registry: entrypoints,
      origin: 'https://agent.example.com',
    });

    expect(card.entrypoints.echo.input_schema).toBeDefined();
    expect(card.entrypoints.echo.output_schema).toBeDefined();
  });
});

describe('fetchAgentCard', () => {
  it('fetches Agent Card from /.well-known/agent-card.json', async () => {
    const mockCard: AgentCardWithEntrypoints = {
      name: 'remote-agent',
      version: '1.0.0',
      url: 'https://remote.example.com/',
      skills: [],
      entrypoints: {},
    };

    const mockFetch = mock(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
      if (urlStr.includes('/.well-known/agent-card.json')) {
        return new Response(JSON.stringify(mockCard), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected URL: ${urlStr}`);
    });

    const card = await fetchAgentCard('https://remote.example.com', mockFetch as unknown as typeof fetch);

    expect(card).toBeDefined();
    expect(card.name).toBe('remote-agent');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles fetch errors', async () => {
    const mockFetch = mock(async () => {
      throw new Error('Network error');
    });

    await expect(fetchAgentCard('https://remote.example.com', mockFetch as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe('parseAgentCard', () => {
  it('parses valid Agent Card JSON', () => {
    const json = {
      name: 'parsed-agent',
      version: '1.0.0',
      url: 'https://parsed.example.com/',
      skills: [],
      entrypoints: {},
    };

    const card = parseAgentCard(json);

    expect(card.name).toBe('parsed-agent');
    expect(card.version).toBe('1.0.0');
  });

  it('validates required fields', () => {
    const invalidJson = {
      version: '1.0.0',
      // missing name
    };

    expect(() => parseAgentCard(invalidJson)).toThrow();
  });
});

describe('findSkill', () => {
  const card: AgentCardWithEntrypoints = {
    name: 'test',
    version: '1.0.0',
    skills: [
      { id: 'skill1', name: 'Skill 1' },
      { id: 'skill2', name: 'Skill 2' },
    ],
    entrypoints: {},
  };

  it('finds skill by ID', () => {
    const skill = findSkill(card, 'skill1');
    expect(skill).toBeDefined();
    expect(skill?.id).toBe('skill1');
  });

  it('returns undefined for non-existent skill', () => {
    const skill = findSkill(card, 'nonexistent');
    expect(skill).toBeUndefined();
  });
});

