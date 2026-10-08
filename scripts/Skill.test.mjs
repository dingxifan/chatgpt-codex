import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lintDispatchPrompt, lintDispatchWorkspace } from '../bridge/dist/src/dispatch-lint.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relative = 'plugin/codex-dispatch/skills/codex-dispatch/SKILL.md';
const skill = readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n');
const skeletonOf = text => text.match(/^MANDATORY GOAL ACTIVATION\nBefore substantive analysis,[\s\S]*?^\[Ordered safe return procedure, genuine tool constraints, focused ask behavior and permitted fallback\.\]$/m)?.[0];
const skeleton = skeletonOf(skill);

test('canonical machine envelope and frontmatter remain identical to the pre-refinement baseline', () => {
  const old = execFileSync('git', ['show', `dd5a7b6185bad75b0b42f64a415a2505d2339497:${relative}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
  assert.ok(skeleton);
  assert.equal(skeleton, skeletonOf(old));
  assert.equal(skill.match(/^---\n[\s\S]*?\n---/)?.[0], old.match(/^---\n[\s\S]*?\n---/)?.[0]);
});

test('both manifests advance together without changing plugin identity or interface contracts', () => {
  for (const relative of ['plugin/codex-dispatch/plugin.json', 'plugin/codex-dispatch/.codex-plugin/plugin.json']) {
    const current = JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
    const old = JSON.parse(execFileSync('git', ['show', `dd5a7b6185bad75b0b42f64a415a2505d2339497:${relative}`], { cwd: root, encoding: 'utf8' }));
    assert.equal(current.version, '0.1.19');
    assert.equal(old.version, '0.1.15');
    delete current.version;
    delete old.version;
    assert.deepEqual(current, old);
  }
});

function filled(workspace, mode, publication = '') {
  const combined = `example/project / ${workspace}`;
  const token = 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999';
  const values = {
    '[Concrete objective including final delivery to FINAL RETURN TARGET per RETURN ROUTING.]': 'Inspect the fixture after actual Goal activation; apply project instructions and actual-context checks, then return all results to the verified origin or use the permitted local alternative. Ask and wait for any obtainable required return decision.',
    "[this task's identity]": 'skill-fixture',
    '[fresh UUID v4 for this dispatch]': token,
    '[repository] / [absolute workspace]': combined,
    '[full 40-character SHA, or not applicable]': 'a'.repeat(40),
    '[Task Payload: exact inputs, scope, required work, validation, restrictions and deliverables as needed.]': 'Before repository commands or artifact reads report actual execution context and stop on a mismatch with the human selection. Verify both exact locators and SHA256 before using materials.\n- Path/locator: C:\\handoff\\first.txt; Filename: first.txt; SHA256: ' + '1'.repeat(64) + '; Purpose: input; Required action: read and verify.\n- Path/locator: C:\\handoff\\second.txt; Filename: second.txt; SHA256: ' + '2'.repeat(64) + '; Purpose: input; Required action: read and verify.',
    '[exact originating ChatGPT title, or unavailable]': 'unavailable',
    '[verified current-dispatch runtime binding, or unavailable]': 'unavailable',
    '[actual current-dispatch evidence, or unavailable]': 'unavailable',
    '[verified capability, or not established at dispatch]': 'not established at dispatch',
    '[Ordered safe return procedure, genuine tool constraints, focused ask behavior and permitted fallback.]': mode === 'manual' ? 'The human explicitly selected manual-only: no sends; emit the complete immutable local result, exact artifact identities and truthful pending-human-relay status.' : 'Use a proven native origin binding, otherwise bounded conversation inspection and actual sender/receiver evidence; ask once and wait when an obtainable required target or authorization decision is missing. Observe real tool permissions. Use complete local emission only under the permitted alternative, never resend ambiguous delivery.',
  };
  let prompt = skeleton;
  for (const [key, value] of Object.entries(values)) prompt = prompt.replaceAll(key, value);
  prompt = prompt.replaceAll('[identical to EXECUTION BRIEF]', token);
  // Each repeated field uses its own value, not the dispatch token.
  prompt = prompt.replace(`Task identity: ${token}`, 'Task identity: skill-fixture').replace(`Repository / workspace: ${token}`, `Repository / workspace: ${combined}`).replace(`BASE_SHA: ${token}`, `BASE_SHA: ${'a'.repeat(40)}`);
  if (publication) prompt = prompt.replace('\nFINAL RETURN TARGET\n', `\n${publication}\n\nFINAL RETURN TARGET\n`);
  return prompt.replaceAll('Return mode: auto', `Return mode: ${mode}`);
}

// Fixture reader only: production routing remains Skill-local, without a new parser/API.
function routesOf(text) {
  return text.split(/^## Route \d+\s*$/m).slice(1).map(block => Object.fromEntries(
    block.split(/\r?\n/).map(line => /^(Route ID|Repository|Workspace|Computer|Bridge namespace|Status|Publish targets|Publish order): (.*)$/.exec(line)).filter(Boolean).map(match => [match[1], match[2]])
  ));
}

test('Schema 1 optional publication fields leave every legacy routing value intact', () => {
  const relative = 'config/CODEX_WORKSPACE_ROUTING.md';
  const old = execFileSync('git', ['show', `dd5a7b6185bad75b0b42f64a415a2505d2339497:${relative}`], { cwd: root, encoding: 'utf8' });
  const current = readFileSync(path.join(root, relative), 'utf8');
  assert.match(old, /^Schema version: 1$/m);
  assert.match(current, /^Schema version: 1$/m);
  const oldRoutes = routesOf(old);
  const newRoutes = routesOf(current);
  assert.equal(newRoutes.length, oldRoutes.length);
  assert.equal(newRoutes[0]['Publish targets'], 'https://github.com/dingxifan/chatgpt-codex.git => refs/heads/main');
  assert.match(newRoutes[0]['Publish order'], /draft PR targeting main/);
  assert.match(newRoutes[0]['Publish order'], /only when the human authorizes/);
  for (const [index, route] of newRoutes.entries()) {
    const { 'Publish targets': targets, 'Publish order': order, ...legacy } = route;
    assert.deepEqual(legacy, oldRoutes[index]);
    if (index > 0) assert.deepEqual([targets, order], [undefined, undefined]);
  }
});

test('publication targets stay payload prose; specified multi-target and old-table fallback envelopes pass Bridge checks', async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'codex-skill-publish-'));
  try {
    const instructions = [
      'Publish targets: https://github.com/example/project.git => refs/heads/main | https://gitee.com/example/project.git => refs/heads/main\nPublish order: GitHub PR merge only when authorized, then fast-forward the verified merge SHA to Gitee. Verify both actual remote refs; one success is not full synchronization.',
      'Publication scope: absent in the successfully read selected route. On an authorized publish task inspect all remotes and all effective push addresses, synchronize only intended delivery branches and verify every actual remote ref. No mirror or automatic force; unresolved independent-repository scope requires clarification.',
    ];
    for (const publication of instructions) {
      for (const mode of ['auto', 'manual']) {
        const prompt = filled(workspace, mode, publication);
        assert.deepEqual(lintDispatchPrompt(prompt), []);
        assert.deepEqual((await lintDispatchWorkspace(prompt, workspace)).issues, []);
        assert.ok(prompt.indexOf(publication) < prompt.indexOf('\nFINAL RETURN TARGET\n'));
        assert.equal(prompt.match(/^Repository \/ workspace:/gm).length, 2);
      }
    }
  } finally { rmdirSync(workspace); }
});

test('filled canonical auto/manual envelopes with two artifact bullets pass existing Bridge checks', async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'codex-skill-envelope-'));
  try {
    for (const mode of ['auto', 'manual']) {
      const prompt = filled(workspace, mode);
      assert.deepEqual(lintDispatchPrompt(prompt), []);
      assert.deepEqual((await lintDispatchWorkspace(prompt, workspace)).issues, []);
      assert.equal(prompt.match(new RegExp(`^Return mode: ${mode}$`, 'gm')).length, 3);
      assert.equal(prompt.includes('[identical to EXECUTION BRIEF]'), false);
    }
  } finally { rmdirSync(workspace); }
});

test('consistent but wrong workspace and conflicting token remain rejected', async () => {
  const actual = mkdtempSync(path.join(tmpdir(), 'codex-skill-actual-'));
  const other = mkdtempSync(path.join(tmpdir(), 'codex-skill-other-'));
  try {
    const prompt = filled(other, 'auto');
    assert.deepEqual(lintDispatchPrompt(prompt), []);
    const issues = (await lintDispatchWorkspace(prompt, actual)).issues;
    assert.equal(issues.filter(issue => issue.rule === 'DL004').length, 2);
    const conflicting = filled(actual, 'auto').replace('Dispatch token: e43e1cca-d731-4ca7-b8c6-1dedc4fd7999', 'Dispatch token: 715fef50-055e-45d2-9bb5-219d8e1d8888');
    assert.ok(lintDispatchPrompt(conflicting).some(issue => issue.rule === 'DL004' && issue.field === 'Dispatch token'));
  } finally {
    rmdirSync(actual);
    rmdirSync(other);
  }
});

// These are contract guards, not an executable origin verifier or model/E2E tests.
const receiverReturn = skill.split('## 5. Receiver final return\n')[1].split('## 6. Result and truthful completion\n')[0];
const nativePath = receiverReturn.split('**Path 1 — trustworthy native binding.**')[1].split('**Path 2')[0];
const automaticPath = receiverReturn.split('**Path 2 — automatic lookup and verification.**')[1].split('**Path 3')[0];
const directPath = receiverReturn.split("**Path 3 — human directly specifies or confirms this result's destination.**")[1].split('**Insufficient readable content.**')[0];
const contentRead = receiverReturn.split('**Insufficient readable content.**')[1];

test('static return contract makes three paths independent and requires actual native binding', () => {
  assert.match(receiverReturn, /any ONE of three independent verification paths/);
  assert.match(receiverReturn, /alternatives, not cumulative requirements/);
  assert.match(receiverReturn, /already applicable direct human destination instruction can use path 3 immediately/);
  assert.match(nativePath, /documented\/runtime binding proves it reaches this dispatch's actual ChatGPT origin/);
  assert.match(nativePath, /tool name, Bridge caller thread or merely routable handle is insufficient/);
});

test('static automatic path keeps the full chain as strong evidence without making it the only form', () => {
  assert.match(receiverReturn, /records may be DIFFERENT messages, not one original human message/);
  assert.match(receiverReturn, /Do NOT require the original human request to contain an assistant-generated Dispatch token\/Task identity or a later-created job_id/);
  assert.match(automaticPath, /match the four task fields and confirmed job_id[\s\S]*message provenance and the surrounding sequence/);
  assert.match(automaticPath, /complete chain is NOT the only acceptable evidence form/);
  assert.match(automaticPath, /independently corroborated readable original task\/dispatch context or trustworthy current-dispatch runtime evidence/);
  assert.match(automaticPath, /Do not turn any single missing field, unknown handle or unreadable message class into an automatic rejection/);
  assert.match(automaticPath, /exactly ONE verified candidate[\s\S]*enough relevant coverage/);
  assert.match(automaticPath, /same-title ambiguity, task conflicts or an unproven link[\s\S]*remain unverified/);
  assert.match(automaticPath, /exact title, copied token, forwarded report[\s\S]*ALONE cannot establish automatic origin or human send permission/);
});

test('static direct human path accepts unique exact titles and terminates original-chain verification', () => {
  assert.match(directPath, /actual human instruction[\s\S]*THIS task's result[\s\S]*destination's actual ChatGPT identity/);
  assert.match(directPath, /exact title and a real link are both valid locators/);
  assert.match(directPath, /exact title uniquely locates[\s\S]*do NOT demand a link/);
  assert.match(directPath, /not whether it originally created the task/);
  assert.match(directPath, /does NOT require original assistant dispatch text, sender token records, creation acknowledgement or a sender\/receiver native-handle match/);
  assert.match(directPath, /Do not loop back to path 2's original-chain requirements/);
  assert.match(directPath, /delegated\/model-generated instruction is not an actual human confirmation/);
  assert.match(directPath, /locator alone[\s\S]*without granting send permission/);
  assert.match(directPath, /identity is still ambiguous, ask only for the unresolved distinction/);
});

test('static content-read fallback checks existing evidence and browser capability before a focused human confirmation', () => {
  assert.match(receiverReturn, /chatgpt-content-reference[\s\S]*NOT the referenced assistant body; hasMore=false does not prove body coverage/);
  assert.match(contentRead, /First decide whether other observed evidence already suffices/);
  assert.match(contentRead, /available supported full-content reader[\s\S]*SAME candidate scope/);
  assert.match(contentRead, /browser not already showing the candidate is not proof of unavailable browser capability/);
  assert.match(contentRead, /enter the observed exact candidate through a supported interface/);
  assert.match(contentRead, /Never infer content from a reference ID, fabricate a link, call private endpoints or expand the search/);
  assert.match(contentRead, /Unreadable assistant content does not automatically require a source link/);
  assert.match(contentRead, /do not request a locator already known merely because the body is unreadable/);
  assert.match(contentRead, /Apply the human's answer under path 3/);
  assert.match(receiverReturn, /ONE limit:20 listing[\s\S]*FIRST 10 pinned entries/);
  assert.match(receiverReturn, /If ambiguity remains[\s\S]*wait/);
  assert.match(receiverReturn, /Never send a test message to a candidate/);
});

test('static return contract reuses verified standing human permission without extending engineering authority', () => {
  assert.match(receiverReturn, /readable original human standing authorization[\s\S]*SAME verified origin[\s\S]*not been revoked or narrowed[\s\S]*send-tool contract admits that evidence/);
  assert.match(receiverReturn, /Do not demand that it name future tokens\/job IDs/);
  assert.match(receiverReturn, /Verify the applicable destination separately for every dispatch/);
  assert.match(receiverReturn, /Standing origin-specific permission does not transfer to another recipient merely because that recipient was identified/);
  assert.match(receiverReturn, /Unreadable authorization is authorization_unverified; absent applicable authorization is authorization_required/);
  assert.match(receiverReturn, /stricter actual tool contract remains binding/);
  assert.match(receiverReturn, /Return authorization grants no code, production or Git publication authority/);
  assert.match(receiverReturn, /ambiguous send must NOT be resent or switched automatically/);
});

test('static result contract distinguishes source-read failures from permission failures without new protocol fields', () => {
  assert.match(skill, /Distinguish insufficient readable evidence, task conflicts and multiple candidates from authorization gaps/);
  assert.match(skill, /Record the successful path and actual supporting observations in RETURN_ROUTE_EVIDENCE/);
  assert.match(skill, /These assistant messages are dispatch evidence, not human authorization or a registry/);
  assert.equal(skeleton.match(/^Bound conversation ID: unavailable$/gm).length, 1);
  assert.match(skill, /Do not add HACT state, receipts, registries\/caches[\s\S]*watchers, schedulers/);
});
