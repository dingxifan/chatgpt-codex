import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ArtifactStore } from '../bridge/dist/src/artifacts.js';
import { InstructionStore } from '../bridge/dist/src/instruction.js';
import { ReceiptStore } from '../bridge/dist/src/receipts.js';

test('built CLI is executable, propagates nonzero failures and does not contact native tools', async () => {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'codex-kernel-cli-')));
  const token = 'e43e1cca-d731-4ca7-b8c6-1dedc4fd7999';
  const artifacts = new ArtifactStore(root);
  const data = {
    schema: 'codex-instruction/v1', dispatch_token: token, task_identity: 'cli-fixture',
    repository: 'example/project', workspace: root, base_sha: 'not applicable', method_ref: 'not applicable',
    route: { route_id: 'fixture', computer: 'fixture', bridge_namespace: 'fixture' },
    checkpoints: [{ id: 'inspect', title: 'Read fixture', required_checks: ['inputs'] }],
    return: { mode: 'manual', conversation_id: null, title_hint: null, origin_evidence_locator: null, human_instruction_locator: null,
      authorization_evidence: { original_text: null, source_conversation_id: null, source_message_id: null, allowed_action: null, applicable_scope: null, explicit_limits: null,
        prior_verification: { record_locator: null, source_read_tool_call_id: null, checked_target_id: null } } },
    goal_core: 'Read this offline fixture only; no native dispatch or messaging. Keep same Goal and use the kernel to check declared work and result.',
  };
  const content = '# Fixture\n\n## 任务元信息\n\n```json\n' + JSON.stringify(data) + '\n```\n\n## 操作\nInspect fixture.\n';
  const file = await artifacts.put({ filename: 'cli.instruction.md', content });
  const instruction = await new InstructionStore(artifacts, [root]).load({ instruction_file: file.path, expected_sha256: file.sha256, dispatch_token: token });
  const receipts = new ReceiptStore(artifacts);
  await receipts.finish(await receipts.reserve(instruction), { creation_status: 'created', job_id: 'cli-fixture-job', diagnostic: null });
  const cli = fileURLToPath(new URL('../bridge/dist/src/handoff-kernel-cli.js', import.meta.url));
  const goal = { threadId: 'cli-fixture-job', objective: instruction.goal, status: 'active', createdAt: 1 };
  const admission = { goal, goal_activation_record: 'mock:goal', execution_context_record: 'mock:context', instruction_read_record: 'mock:read',
    execution_context: { sandbox_mode: 'read-only', approval_policy: 'never', network_access: false }, summary: 'fixture', next_action: 'inspect' };
  const invoke = (action, revision, payload, job = 'cli-fixture-job') => spawnSync(process.execPath, [cli, action, root, token, String(revision)], {
    input: JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, CODEX_THREAD_ID: job, CODEX_APP_TOOLS_PIPE_PATH: '', CODEX_APP_TOOLS_SERVER: '' },
  });
  assert.equal(invoke('admit', 0, admission, '').status, 1);
  const admitted = invoke('admit', 0, admission);
  assert.equal(admitted.status, 0, admitted.stderr);
  assert.equal(JSON.parse(admitted.stdout).revision, 1);
  assert.equal(invoke('check', 0, { goal, purpose: 'work' }).status, 1);
  assert.equal(invoke('advance', 1, { goal, checkpoint_id: 'inspect', complete: true, summary: 'done', next_action: 'freeze', blockers: [], pending_decisions: [], evidence: [], verification_records: [] }).status, 1);
  assert.equal(invoke('check', 1, { goal, purpose: 'work' }).status, 0);
  assert.equal(invoke('retry', 1, {}).status, 1);
});
