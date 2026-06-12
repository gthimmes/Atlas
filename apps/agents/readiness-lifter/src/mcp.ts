import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Spec } from './types.js';

export interface AtlasMcp {
  readSpec(specId: string): Promise<Spec>;
  proposeEdit(specId: string, section: string, patch: Record<string, unknown>): Promise<Spec>;
  close(): Promise<void>;
}

interface TextContent {
  type: string;
  text?: string;
}

function textOf(content: unknown): string {
  const blocks = (content ?? []) as TextContent[];
  return blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
}

/**
 * Connect to the Atlas workspace:// MCP endpoint with an agent bearer
 * token (atk_*). Stateless streamable HTTP — every request carries the
 * Authorization header.
 */
export async function connectAtlas(apiBase: string, token: string): Promise<AtlasMcp> {
  const client = new Client({ name: 'readiness-lifter', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL('/mcp', apiBase), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);

  return {
    async readSpec(specId) {
      const res = await client.readResource({ uri: `workspace://specs/${specId}` });
      const text = (res.contents ?? [])
        .map((c) => ('text' in c && typeof c.text === 'string' ? c.text : ''))
        .join('');
      return JSON.parse(text) as Spec;
    },

    async proposeEdit(specId, section, patch) {
      const res = await client.callTool({
        name: 'spec.propose_edit',
        arguments: { spec: specId, section, patch },
      });
      const text = textOf(res.content);
      if (res.isError) {
        throw new Error(`spec.propose_edit failed: ${text || 'unknown MCP tool error'}`);
      }
      return JSON.parse(text) as Spec;
    },

    async close() {
      await client.close();
    },
  };
}
