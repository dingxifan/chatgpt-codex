import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scripts = path.dirname(fileURLToPath(import.meta.url));
const run = (file, args = []) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
test('build record rejects changed source, changed output and missing record', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'codex-build-info-'));
  for (const dir of ['scripts', 'bridge/src', 'bridge/dist/src']) mkdirSync(path.join(fixture, dir), { recursive: true });
  const script = path.join(fixture, 'scripts/Build-Info.mjs');
  copyFileSync(path.join(scripts, 'Build-Info.mjs'), script);
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json']) writeFileSync(path.join(fixture, 'bridge', file), '{"version":"0.3.1"}');
  const source = path.join(fixture, 'bridge/src/index.ts');
  const output = path.join(fixture, 'bridge/dist/src/index.js');
  writeFileSync(source, 'source');
  writeFileSync(output, 'output');
  assert.notEqual(run(script, ['--verify']).status, 0);
  assert.equal(run(script).status, 0);
  assert.equal(run(script, ['--verify']).status, 0);
  const record = JSON.parse(readFileSync(path.join(fixture, 'bridge/dist/build-info.json'), 'utf8'));
  assert.equal(record.commit, null);
  writeFileSync(source, 'changed source');
  assert.notEqual(run(script, ['--verify']).status, 0);
  writeFileSync(source, 'source');
  const added = path.join(fixture, 'bridge/src/added.ts');
  writeFileSync(added, 'added source');
  assert.notEqual(run(script, ['--verify']).status, 0);
  unlinkSync(added);
  unlinkSync(source);
  assert.notEqual(run(script, ['--verify']).status, 0);
  writeFileSync(source, 'source');
  assert.equal(run(script, ['--verify']).status, 0);
  const originalRecord = readFileSync(path.join(fixture, 'bridge/dist/build-info.json'));
  assert.notEqual(run(script, ['--typo']).status, 0);
  assert.deepEqual(readFileSync(path.join(fixture, 'bridge/dist/build-info.json')), originalRecord);
  writeFileSync(output, 'changed output');
  assert.notEqual(run(script, ['--verify']).status, 0);
});

test('pack reuses exact archive and refuses content or manifest drift without overwriting', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'codex-release-pack-'));
  for (const dir of ['scripts', 'plugin/codex-dispatch/.codex-plugin', 'plugin/codex-dispatch/skills']) mkdirSync(path.join(fixture, dir), { recursive: true });
  const script = path.join(fixture, 'scripts/Pack-Plugin.ps1');
  copyFileSync(path.join(scripts, 'Pack-Plugin.ps1'), script);
  const manifest = '{"name":"codex-dispatch","version":"0.1.15"}';
  const legacy = path.join(fixture, 'plugin/codex-dispatch/.codex-plugin/plugin.json');
  writeFileSync(path.join(fixture, 'plugin/codex-dispatch/plugin.json'), manifest);
  writeFileSync(legacy, manifest);
  const skill = path.join(fixture, 'plugin/codex-dispatch/skills/SKILL.md');
  writeFileSync(skill, 'fixture skill');
  const pack = args => spawnSync('pwsh', ['-NoProfile', '-File', script, ...args], { encoding: 'utf8' });
  assert.notEqual(pack(['-VerifyOnly']).status, 0);
  assert.equal(existsSync(path.join(fixture, 'out')), false);
  const first = pack([]);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const archive = path.join(fixture, 'out/codex-dispatch-v0.1.15.zip');
  const original = readFileSync(archive);
  assert.equal(pack(['-VerifyOnly']).status, 0);
  assert.equal(pack([]).status, 0);
  assert.deepEqual(readFileSync(archive), original);
  writeFileSync(skill, 'different skill');
  assert.notEqual(pack([]).status, 0);
  assert.deepEqual(readFileSync(archive), original);
  writeFileSync(skill, 'fixture skill');
  writeFileSync(legacy, manifest.replace('0.1.15', '0.1.14'));
  assert.notEqual(pack([]).status, 0);
  assert.deepEqual(readFileSync(archive), original);
});

test('definitions-only comparison reads definitions without invoking any tool', async () => {
  const { StreamableHTTPServerTransport } = await import('../bridge/node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js');
  const { createMcpServer } = await import('../bridge/dist/src/mcp.js');
  const deny = new Proxy({}, { get() { throw new Error('Unexpected backend access'); } });
  let calls = 0;
  const http = createServer(async (req, res) => {
    if (req.url === '/healthz' || req.url === '/readyz') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, desktop_connected: true }));
      return;
    }
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (body.method === 'tools/call') calls++;
    if (body.method === 'server/discover') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } }));
      return;
    }
    const server = createMcpServer(deny, deny);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('finish', () => { void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  try {
    const child = spawn(process.execPath, [path.join(scripts, 'Test-Bridge.mjs'), '--url', `http://127.0.0.1:${http.address().port}`, '--definitions-only', '--compare-build']);
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk; });
    const status = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
    assert.equal(status, 0, output);
    assert.equal(calls, 0);
    assert.equal(JSON.parse(output).tools.every(tool => tool.matches_build), true);
  } finally { await new Promise(resolve => http.close(resolve)); }
});
