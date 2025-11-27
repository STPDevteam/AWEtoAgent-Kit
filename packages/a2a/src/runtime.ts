import type { AgentRuntime, FetchFunction } from '@aweto-agent/types/core';
import type {
  A2ARuntime,
  CreateA2ARuntimeOptions,
} from '@aweto-agent/types/a2a';

import { buildAgentCard, fetchAgentCard } from './card';
import {
  invokeAgent,
  streamAgent,
  fetchAndInvoke,
  sendMessage,
  getTask,
  subscribeTask,
  fetchAndSendMessage,
  listTasks,
  cancelTask,
} from './client';

/**
 * Creates A2A runtime from an AgentRuntime.
 * Always returns a runtime (A2A is always available).
 */
export function createA2ARuntime(
  runtime: AgentRuntime,
  _options?: CreateA2ARuntimeOptions
): A2ARuntime {
  const a2aRuntime: A2ARuntime = {
    buildCard(origin: string) {
      const entrypoints = runtime.entrypoints.snapshot();
      return buildAgentCard({
        meta: runtime.agent.config.meta,
        registry: entrypoints,
        origin,
      });
    },

    async fetchCard(baseUrl: string, fetchImpl?: FetchFunction) {
      return fetchAgentCard(baseUrl, fetchImpl);
    },

    client: {
      invoke: invokeAgent,
      stream: streamAgent,
      fetchAndInvoke,
      sendMessage,
      getTask,
      subscribeTask,
      fetchAndSendMessage,
      listTasks,
      cancelTask,
    },
  };

  return a2aRuntime;
}
