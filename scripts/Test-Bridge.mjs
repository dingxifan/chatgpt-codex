import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { Client } from '../bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StreamableHTTPClientTransport } from '../bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';

const index = process.argv.indexOf('--url');
const base = new URL(index >= 0 ? process.argv[index + 1] : 'http://127.0.0.1:8787');
const definitionsOnly = process.argv.includes('--definitions-only');
const compareBuild = process.argv.includes('--compare-build');
assert(!compareBuild || definitionsOnly, '--compare-build requires --definitions-only (no tool calls)');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Verify your own local Bridge, not an arbitrary remote service');
const health = await fetch(new URL('/healthz', base), { signal: AbortSignal.timeout(10000) });
assert(health.ok && (await health.json()).ok === true, 'Bridge health failed');
const ready = await fetch(new URL('/readyz', base), { signal: AbortSignal.timeout(10000) });
assert(ready.ok && (await ready.json()).desktop_connected === true, 'Desktop not connected');
const discovery = await fetch(new URL('/mcp', base), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 'installation-discovery', method: 'server/discover', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }),
  signal: AbortSignal.timeout(10000),
});
assert.equal(discovery.status, 200, 'Discovery fallback must be a JSON-RPC response, not an HTTP error');
assert.equal(discovery.headers.get('mcp-session-id'), null, 'Discovery must not create a legacy session');
assert.deepEqual(await discovery.json(), { jsonrpc: '2.0', id: 'installation-discovery', error: { code: -32601, message: 'Method not found' } });
const client = new Client({ name: 'codex-from-chatgpt-verification', version: '0.1.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', base)));
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map(t => t.name).sort(), ['artifact_put', 'codex_get', 'codex_start']);
  if (definitionsOnly) {
    const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    const digest = tool => createHash('sha256').update(JSON.stringify(canonical(tool))).digest('hex');
    let built = null;
    if (compareBuild) {
      const { InMemoryTransport } = await import('../bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js');
      const { createMcpServer } = await import('../bridge/dist/src/mcp.js');
      const deny = new Proxy({}, { get() { throw new Error('Definitions check must not invoke a backend or artifact store'); } });
      const server = createMcpServer(deny, deny);
      const offline = new Client({ name: 'codex-build-definitions', version: '0.1.0' });
      const [a, b] = InMemoryTransport.createLinkedPair();
      try { await server.connect(b); await offline.connect(a); built = (await offline.listTools()).tools; }
      finally { await offline.close(); await server.close(); }
    }
    const comparison = listed.tools.map(tool => {
      const expected = built?.find(candidate => candidate.name === tool.name);
      return { name: tool.name, description: tool.description, inputSchema: tool.inputSchema, sha256: digest(tool),
        ...(built ? { build_sha256: expected ? digest(expected) : null, matches_build: !!expected && digest(expected) === digest(tool) } : {}) };
    });
    console.log(JSON.stringify({ mode: 'definitions-only', url: base.origin, server: client.getServerVersion(), tools: comparison }, null, 2));
    assert(!built || comparison.every(tool => tool.matches_build), 'TOOL_DEFINITION_MISMATCH: live tools differ from this build; no tool was invoked');
  } else {
  const content = 'Codex Dispatch installation verification: ' + randomUUID() + '\n';
  const digest = createHash('sha256').update(content).digest('hex');
  const result = await client.callTool({ name: 'artifact_put', arguments: { filename: 'installation-check-' + randomUUID() + '.txt', content, expected_sha256: digest } });
  assert(!result.isError, 'artifact_put failed');
  const data = result.structuredContent ?? JSON.parse(result.content.filter(c => c.type === 'text').map(c => c.text).join('\n'));
  assert.equal(data.sha256, digest);
  assert.equal(await readFile(data.path, 'utf8'), content);
  console.log('LOCAL_READY: health, desktop readiness, discovery fallback, legacy initialization, exact tools and real artifact readback passed.');
  console.log('Verification artifact retained at: ' + data.path);
  console.log('No task dispatched and no codex_get called. ChatGPT connection and end-to-end dispatch remain separate checks.');
  }
} finally { await client.close(); }
