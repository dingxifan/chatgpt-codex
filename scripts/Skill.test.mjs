import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ArtifactStore } from '../bridge/dist/src/artifacts.js';
import { InstructionStore, parseInstruction } from '../bridge/dist/src/instruction.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relative = 'plugin/codex-dispatch/skills/codex-dispatch/SKILL.md';
const skill = readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n');
const format = readFileSync(path.join(root, 'plugin/codex-dispatch/skills/codex-dispatch/references/instruction-file.md'), 'utf8');
const template = format.match(/~~~~markdown\r?\n([\s\S]*?)\r?\n~~~~/)[1];
const metadataJson = template.match(/```json\r?\n([\s\S]*?)\r?\n```/)[1];
const baseline = 'dae0c1138bde9f6adbff80bbb67f5b18c127bcbe';

test('existing Skill discovery and plugin identity stay unchanged in this unreleased local candidate', () => {
  const oldSkill = execFileSync('git', ['show', `${baseline}:${relative}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
  assert.equal(skill.match(/^---\n[\s\S]*?\n---/)[0], oldSkill.match(/^---\n[\s\S]*?\n---/)[0]);
  for (const relative of ['plugin/codex-dispatch/plugin.json', 'plugin/codex-dispatch/.codex-plugin/plugin.json']) {
    const current = JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
    const old = JSON.parse(execFileSync('git', ['show', `${baseline}:${relative}`], { cwd: root, encoding: 'utf8' }));
    assert.deepEqual(current, old);
  }
  assert.match(skill, /references\/instruction-file\.md/);
});

function filled(workspace, mode, publication = '') {
  const value = JSON.parse(metadataJson);
  Object.assign(value, {
    dispatch_token: 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999', task_identity: 'skill-fixture',
    repository: 'example/project', workspace, base_sha: 'a'.repeat(40), method_ref: 'not applicable',
    required_access_profile: 'read-only', access_instruction_locator: 'fixture-human-request',
    route: { route_id: 'fixture-route', computer: 'fixture-machine', bridge_namespace: 'fixture-bridge' },
    goal_core: 'Inspect only the fixed fixture under project rules; maintain progress and read this same file for details and completion audit. Before asking for return authority read original evidence and existing same-task verification records, reuse applicable genuine authority under the actual tool contract, otherwise wait for required decisions. Freeze and deliver the complete result or the explicitly permitted local alternative; unresolved required work is not completion.',
  });
  value.return.mode = mode;
  value.return.authorization_evidence.original_text = '提前给予本窗口回传授权。\n只限本窗口；不得发布或合并。';
  value.return.authorization_evidence.source_conversation_id = 'fixture-origin';
  value.return.authorization_evidence.source_message_id = 'fixture-human-message';
  value.return.authorization_evidence.prior_verification.record_locator = 'fixture-existing-verification';
  value.return.authorization_evidence.prior_verification.source_read_tool_call_id = 'fixture-read-call';
  value.return.authorization_evidence.prior_verification.checked_target_id = 'fixture-origin';
  return template.replace(metadataJson, JSON.stringify(value, null, 2)).replace('Write the actual ordered operations, required checks and acceptance conditions here.', `Read only fixture inputs and validate both known locators and their SHA256; no sends in this offline fixture.\n${publication}`);
}

test('authored single-file template loads in auto/manual mode with unchanged original evidence and no second business prompt', async () => {
  const handoffRoot = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'codex-skill-file-')));
  const store = new ArtifactStore(handoffRoot);
  for (const mode of ['auto', 'manual']) {
    const content = filled(handoffRoot, mode);
    const file = await store.put({ filename: `${mode}.instruction.md`, content });
    const loaded = await new InstructionStore(store, [handoffRoot]).load({ instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999' });
    assert.equal(loaded.text, content);
    assert.equal(loaded.metadata.return.mode, mode);
    assert.equal(loaded.metadata.return.authorization_evidence.original_text, '提前给予本窗口回传授权。\n只限本窗口；不得发布或合并。');
    assert.equal(loaded.metadata.return.authorization_evidence.prior_verification.source_read_tool_call_id, 'fixture-read-call');
    assert(loaded.goal.startsWith(loaded.metadata.goal_core + '\n\n'));
    assert(loaded.goal.includes(file.sha256));
    assert(loaded.goal.length <= 4000);
    assert.equal(loaded.prompt.includes('Read only fixture inputs'), false);
  }
});

test('publication instructions remain complete body text; declared modes do not manufacture authorization', async () => {
  const workspace = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'codex-skill-publish-')));
  const publications = [
    'Publish targets: https://github.com/example/project.git => refs/heads/main | https://gitee.com/example/project.git => refs/heads/main\nPublish order: GitHub PR merge only when authorized, then fast-forward the verified merge SHA to Gitee. Verify both actual remote refs; one success is not full synchronization.',
    'Publication scope: absent in the successfully read selected route. On an authorized publish task inspect all remotes and all effective push addresses, synchronize only intended delivery branches and verify every actual remote ref. No mirror or automatic force; unresolved independent-repository scope requires clarification.',
  ];
  const store = new ArtifactStore(workspace);
  for (const [index, publication] of publications.entries()) for (const mode of ['auto', 'manual']) {
    const content = filled(workspace, mode, publication);
    const file = await store.put({ filename: `publish-${index}-${mode}.md`, content });
    const loaded = await new InstructionStore(store, [workspace]).load({ instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999' });
    assert(loaded.text.includes(publication));
    assert.equal('publish_targets' in loaded.metadata, false);
    assert.equal('authorized' in loaded.metadata.return, false);
  }
});

test('single metadata source rejects duplicate/missing declarations, wrong root and technical-caller origin', async () => {
  const workspace = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'codex-skill-boundary-')));
  const content = filled(workspace, 'auto');
  assert.throws(() => parseInstruction(content + '\n## 任务元信息\n\n```json\n{}\n```'), /Exactly one/);
  assert.throws(() => parseInstruction(content.replace('## 任务元信息', '## Other')), /Exactly one/);
  assert.throws(() => parseInstruction(content, 'fixture-origin'), /technical Bridge/);
  const store = new ArtifactStore(workspace);
  const file = await store.put({ filename: 'boundary.md', content });
  const input = { instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999' };
  await assert.rejects(new InstructionStore(store, [tmpdir() + '/nonexistent-denied-root']).load(input), /Configured workspace root/);
  await assert.rejects(new InstructionStore(store, [workspace]).load({ ...input, dispatch_token: '715fef50-055e-45d2-9bb5-219d8e1d8888' }), /token mismatch/);
});

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
  assert.match(skill, /Bridge receipt correlates this execution task; it does not establish a native origin binding or grant permission/);
  assert.match(skill, /Do not add HACT state, authorization tickets\/databases[\s\S]*watchers, schedulers/);
});
