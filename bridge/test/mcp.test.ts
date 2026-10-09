import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, symlinkSync, writeFileSync } from "node:fs";
import { link, realpath, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ArtifactStore } from "../src/artifacts.js";
import { DesktopCodex, NativeCallNotSubmittedError, parseNativeResult, type DispatchBackend } from "../src/desktop.js";
import { createMcpServer } from "../src/mcp.js";
import { ReceiptStore } from "../src/receipts.js";
import { InstructionStore } from "../src/instruction.js";
import { HandoffKernel } from "../src/handoff-kernel.js";
import { createHash } from "node:crypto";
import { advanceData } from "./kernel-fixture.js";
import { fixture, instructionText, TOKEN } from "./instruction-fixture.js";

async function connection(manager: DispatchBackend, artifacts: ArtifactStore, roots: string[], receipts?: ReceiptStore) {
  const server = createMcpServer(manager, artifacts, { workspaceRoots: roots, receipts });
  const client = new Client({ name: "file-handoff-test", version: "1.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
  return { client, close: async () => { await client.close(); await server.close(); } };
}
const noAccess = () => new Proxy({}, { get() { throw new Error("No native backend access permitted"); } }) as DispatchBackend;

test("only three tools; creation is file-only, query supports one Job or token, artifact does not touch backend", async () => {
  const f = await fixture();
  const c = await connection(noAccess(), f.artifacts, [f.root]);
  try {
    const { tools } = await c.client.listTools();
    assert.deepEqual(tools.map(t => t.name), ["artifact_put", "codex_start", "codex_get"]);
    const start = tools.find(t => t.name === "codex_start")!;
    const get = tools.find(t => t.name === "codex_get")!;
    assert.deepEqual(Object.keys(start.inputSchema.properties!), ["instruction_file", "expected_sha256", "dispatch_token"]);
    assert.deepEqual(start.inputSchema.required, ["instruction_file", "expected_sha256", "dispatch_token"]);
    assert.deepEqual(Object.keys(get.inputSchema.properties!), ["job_id", "dispatch_token", "detail"]);
    assert.match(start.description!, /Do not poll codex_get automatically or proactively/);
    assert.match(get.description!, /only when the user explicitly asks/);
    assert.equal(c.client.getServerCapabilities()?.resources, undefined);
    for (const removed of ["codex_continue", "codex_interrupt", "codex_respond_approval", "wake_probe", "codex_wake_wait"]) {
      assert.equal((await c.client.callTool({ name: removed, arguments: {} })).isError, true);
    }
    const result = await c.client.callTool({ name: "artifact_put", arguments: { filename: "through-mcp.md", content: "# Entire text\n" } });
    assert.equal(result.isError, undefined);
    assert.equal(readFileSync(path.join(f.root, "through-mcp.md"), "utf8"), "# Entire text\n");
    assert.equal((await c.client.callTool({ name: "codex_start", arguments: { workspace: f.workspace, prompt: "legacy" } })).isError, true);
    assert.equal((await c.client.callTool({ name: "codex_start", arguments: { ...f.input, prompt: "second business instruction" } })).isError, true);
    assert.equal((await c.client.callTool({ name: "codex_get", arguments: { job_id: "job", since_revision: 1 } })).isError, true);
  } finally { await c.close(); }
});

for (const mode of ["auto", "manual"] as const) test(`${mode} file creates once, transports derived Goal and complete file locators, persists actual Job`, async () => {
  const f = await fixture(mode);
  const expected = await new InstructionStore(f.artifacts, [f.root]).load(f.input);
  const calls: string[] = [];
  const manager: DispatchBackend = {
    async start(workspace, prompt) { calls.push("start"); assert.equal(workspace, f.workspace); assert.equal(prompt, expected.prompt); return { job_id: "actual-job" }; },
    get() { throw new Error("No automatic query"); },
  };
  const c = await connection(manager, f.artifacts, [f.root]);
  try {
    const result = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent?.creation_status, "created");
    assert.equal(result.structuredContent?.job_id, "actual-job");
    assert.equal(result.structuredContent?.receipt_saved, true);
    const receipt = await new ReceiptStore(f.artifacts).get(TOKEN);
    assert.equal(receipt?.value.job_id, "actual-job");
    assert.equal(receipt?.value.instruction_sha256, f.file.sha256);
    assert.equal(receipt?.value.origin.verification, "unverified_at_bridge");
    assert.equal(readFileSync(f.file.path, "utf8"), instructionText(f.metadata));
    assert.deepEqual(calls, ["start"]);
  } finally { await c.close(); }
});

test("invalid file/hash/token/workspace/metadata/Goal never invokes backend", async () => {
  const f = await fixture();
  const c = await connection(noAccess(), f.artifacts, [f.root]);
  try {
    for (const input of [
      { ...f.input, instruction_file: path.join(f.root, "missing.md") },
      { ...f.input, instruction_file: f.root + path.sep + ".." + path.sep + "missing.md" },
      { ...f.input, expected_sha256: "0".repeat(64) },
      { ...f.input, dispatch_token: "b3f29391-ef2c-46ed-912f-1c24d981a4d4" },
    ]) {
      const result = await c.client.callTool({ name: "codex_start", arguments: input });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent?.creation_status, "not_created");
      assert.equal(result.structuredContent?.error_code, "DISPATCH_INSTRUCTION_INVALID");
      assert.equal("job_id" in result.structuredContent!, false);
    }
    for (const change of [
      (m: typeof f.metadata) => { m.workspace = tmpdir(); },
      (m: typeof f.metadata) => { m.goal_core = "x".repeat(4000); },
      (m: typeof f.metadata) => { m.task_identity = "<actual-task>"; },
    ]) {
      const bad = await fixture("auto", change);
      const cc = await connection(noAccess(), bad.artifacts, [bad.root]);
      try { assert.equal((await cc.client.callTool({ name: "codex_start", arguments: bad.input })).structuredContent?.creation_status, "not_created"); }
      finally { await cc.close(); }
    }
  } finally { await c.close(); }
});

for (const fault of ["zero-projects", "ambiguous-projects", "lookup-disconnect", "not-submitted", "create-timeout", "create-disconnect", "invalid-json", "native-error", "missing-id", "pending-id", "conflicting-id", "navigate-disconnect", "none"] as const) test(`MCP/Desktop classifies ${fault} without retry or automatic query`, async () => {
  const f = await fixture();
  const calls: string[] = [];
  const desktop = new DesktopCodex([f.root], 1000, async name => {
    calls.push(name);
    if (name === "list_projects") {
      if (fault === "lookup-disconnect") throw new Error("lookup disconnected");
      const project = { projectId: "p", projectKind: "local", hostId: "local", path: f.workspace };
      return { projects: fault === "zero-projects" ? [] : fault === "ambiguous-projects" ? [project, { ...project, projectId: "p2", path: f.workspace + path.sep }] : [project] };
    }
    if (name === "create_thread") {
      if (fault === "not-submitted") throw new NativeCallNotSubmittedError("disconnected before send");
      if (fault === "create-timeout" || fault === "create-disconnect") throw new Error(fault);
      if (fault === "invalid-json" || fault === "native-error") return parseNativeResult(name, { isError: fault === "native-error", content: [{ type: "text", text: "no usable acknowledgement" }] });
      if (fault === "missing-id") return {};
      if (fault === "pending-id") return { clientThreadId: "not-confirmed" };
      if (fault === "conflicting-id") return parseNativeResult(name, { structuredContent: { threadId: "structured-id" }, content: [{ type: "text", text: '{"threadId":"different-id"}' }] });
      return { threadId: "confirmed-native-task" };
    }
    if (name === "navigate_to_codex_page") { if (fault === "navigate-disconnect") throw new Error("navigation disconnected"); return {}; }
    throw new Error("Unexpected native query or retry");
  });
  const c = await connection(desktop, f.artifacts, [f.root]);
  try {
    const result = await c.client.callTool({ name: "codex_start", arguments: f.input });
    const data = result.structuredContent!;
    if (fault === "none" || fault === "navigate-disconnect") {
      assert.equal(result.isError, undefined);
      assert.equal(data.creation_status, "created");
      assert.equal(data.job_id, "confirmed-native-task");
      if (fault === "navigate-disconnect") assert.match(String(data.warning), /do not redispatch/);
      assert.deepEqual(calls, ["list_projects", "create_thread", "navigate_to_codex_page"]);
    } else {
      const beforeSend = ["zero-projects", "ambiguous-projects", "lookup-disconnect", "not-submitted"].includes(fault);
      assert.equal(result.isError, true);
      assert.equal(data.creation_status, beforeSend ? "not_created" : "unknown");
      assert.equal(data.error_code, beforeSend ? "DISPATCH_REJECTED" : "DISPATCH_OUTCOME_UNKNOWN");
      assert.equal("job_id" in data, false);
      assert.deepEqual(calls, beforeSend && fault !== "not-submitted" ? ["list_projects"] : ["list_projects", "create_thread"]);
      const receipt = await new ReceiptStore(f.artifacts).get(TOKEN);
      assert.equal(receipt?.value.creation_status, data.creation_status);
      // A reserved/unknown token cannot resubmit, including through another MCP session.
      const second = await c.client.callTool({ name: "codex_start", arguments: f.input });
      assert.equal(second.structuredContent?.error_code, "DISPATCH_RECEIPT_CONFLICT");
      assert.equal(calls.filter(n => n === "create_thread").length, beforeSend && fault !== "not-submitted" ? 0 : 1);
    }
  } finally { await c.close(); }
});

test("concurrent sessions with the same token submit exactly once; conflict preserves known Job", async () => {
  const f = await fixture();
  let starts = 0;
  const manager: DispatchBackend = { async start() { starts++; return { job_id: "one-job" }; }, get() { throw new Error("No poll"); } };
  const a = await connection(manager, f.artifacts, [f.root]);
  const b = await connection(manager, f.artifacts, [f.root]);
  try {
    const results = await Promise.all([a.client.callTool({ name: "codex_start", arguments: f.input }), b.client.callTool({ name: "codex_start", arguments: f.input })]);
    assert.equal(starts, 1);
    assert.equal(results.filter(r => r.structuredContent?.error_code === "DISPATCH_RECEIPT_CONFLICT").length, 1);
    const duplicate = await b.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(duplicate.structuredContent?.job_id, "one-job");
    assert.equal(duplicate.structuredContent?.attempt_submitted, false);
    const changed = await f.artifacts.put({ filename: "changed.md", content: instructionText({ ...f.metadata, task_identity: "other-task" }) });
    assert.equal((await b.client.callTool({ name: "codex_start", arguments: { ...f.input, instruction_file: changed.path, expected_sha256: changed.sha256 } })).structuredContent?.error_code, "DISPATCH_RECEIPT_CONFLICT");
    assert.equal(starts, 1);
  } finally { await a.close(); await b.close(); }
});

test("receipt save failure preserves created and actual Job; reservation prevents resubmit", async () => {
  const f = await fixture();
  const receipts = new ReceiptStore(f.artifacts, { async rename() { throw new Error("forced receipt save failure"); } });
  let starts = 0;
  const manager: DispatchBackend = { async start() { starts++; return { job_id: "known-created-job" }; }, get() { throw new Error("No poll"); } };
  const c = await connection(manager, f.artifacts, [f.root], receipts);
  try {
    const result = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent?.creation_status, "created");
    assert.equal(result.structuredContent?.job_id, "known-created-job");
    assert.equal(result.structuredContent?.receipt_saved, false);
    assert.match(String(result.structuredContent?.receipt_error), /forced/);
    assert.equal((await receipts.get(TOKEN))?.value.creation_status, "unknown");
    assert.equal((await c.client.callTool({ name: "codex_start", arguments: f.input })).structuredContent?.attempt_submitted, false);
    assert.equal(starts, 1);
  } finally { await c.close(); }
});

test("unreadable existing receipt keeps previous creation unknown, never claims no earlier task", async () => {
  const f = await fixture();
  let starts = 0;
  const c = await connection({ async start() { starts++; return { job_id: "earlier-created-job" }; }, get() { throw new Error("No automatic query"); } }, f.artifacts, [f.root]);
  try {
    const first = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(first.structuredContent?.job_id, "earlier-created-job");
    writeFileSync(path.join(f.root, TOKEN + ".receipt.json"), "{broken-receipt");
    const second = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(second.isError, true);
    assert.equal(second.structuredContent?.attempt_submitted, false);
    assert.equal(second.structuredContent?.creation_status, "unknown");
    assert.equal(starts, 1);
  } finally { await c.close(); }
});

test("dangling receipt entry is unreadable prior evidence, not a missing unused token", async () => {
  const f = await fixture();
  const target = path.join(f.root, "deleted-receipt-target");
  mkdirSync(target);
  symlinkSync(target, path.join(f.root, TOKEN + ".receipt.json"), process.platform === "win32" ? "junction" : "dir");
  rmdirSync(target);
  const c = await connection(noAccess(), f.artifacts, [f.root]);
  try {
    const result = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent?.creation_status, "unknown");
    assert.equal(result.structuredContent?.attempt_submitted, false);
  } finally { await c.close(); }
});

test("explicit Job snapshot survives conflicting local receipts; token still requires readable exact correlation", async () => {
  const f = await fixture();
  const records = new ReceiptStore(f.artifacts);
  const reserved = await records.reserve(await new InstructionStore(f.artifacts, [f.root]).load(f.input));
  const finished = await records.finish(reserved, { creation_status: "created", job_id: "explicit-known-job", diagnostic: null });
  const secondToken = "b3f29391-ef2c-46ed-912f-1c24d981a4d4";
  writeFileSync(path.join(f.root, secondToken + ".receipt.json"), JSON.stringify({ ...finished.value, dispatch_token: secondToken }));
  let queries = 0;
  const c = await connection({
    async start() { throw new Error("No creation"); },
    get(job) { queries++; assert.equal(job, "explicit-known-job"); return { job_id: job, thread_status: "active" }; },
  }, f.artifacts, [f.root]);
  try {
    const result = await c.client.callTool({ name: "codex_get", arguments: { job_id: "explicit-known-job" } });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent?.thread_status, "active");
    assert.equal(result.structuredContent?.receipt, null);
    assert.equal(result.structuredContent?.correlation_status, "unavailable");
    assert.match(String(result.structuredContent?.lookup_errors), /Multiple receipts/);
    assert.equal(queries, 1);
    writeFileSync(path.join(f.root, TOKEN + ".receipt.json"), "{broken-receipt");
    const tokenResult = await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } });
    assert.equal(tokenResult.isError, true);
    assert.equal(queries, 1);
  } finally { await c.close(); }
});

test("alias workspace resolves physically but file metadata remains unchanged", async () => {
  const f = await fixture();
  const alias = path.join(f.root, "alias");
  symlinkSync(f.workspace, alias, process.platform === "win32" ? "junction" : "dir");
  const file = await f.artifacts.put({ filename: "alias-instruction.md", content: instructionText({ ...f.metadata, workspace: alias }) });
  let starts = 0;
  const manager: DispatchBackend = {
    async start(workspace, prompt) { starts++; assert.equal(workspace, await realpath(f.workspace)); assert(JSON.parse(prompt.split("\n")[3]!).includes(alias)); return { job_id: "canonical-job" }; },
    get() { throw new Error("No poll"); },
  };
  const c = await connection(manager, f.artifacts, [f.root]);
  try { assert.equal((await c.client.callTool({ name: "codex_start", arguments: { ...f.input, instruction_file: file.path, expected_sha256: file.sha256 } })).structuredContent?.job_id, "canonical-job"); assert.equal(starts, 1); }
  finally { await c.close(); }
});

test("query XOR rejects invalid selectors without native access", async () => {
  const f = await fixture();
  const c = await connection(noAccess(), f.artifacts, [f.root]);
  try {
    for (const args of [{}, { job_id: "job", dispatch_token: TOKEN }, { dispatch_token: TOKEN }]) {
      assert.equal((await c.client.callTool({ name: "codex_get", arguments: args })).isError, true);
    }
  } finally { await c.close(); }
});

test("a new MCP instance finds the same Job by token and Job, with timestamped receiver reports and unknown Goal", async () => {
  const f = await fixture();
  const calls: string[] = [];
  const manager: DispatchBackend = {
    async start() { calls.push("start"); return { job_id: "query-job" }; },
    get(job) { calls.push(job); return { job_id: job, thread_status: "active", last_turn_status: "completed", last_turn_time: "2026-10-09T12:00:00Z", observed_at: "2026-10-09T12:01:00Z" }; },
  };
  const first = await connection(manager, f.artifacts, [f.root]);
  await first.client.callTool({ name: "codex_start", arguments: f.input });
  await first.close();
  const loaded = await new InstructionStore(f.artifacts, [f.root]).load(f.input);
  const kernel = new HandoffKernel(f.artifacts);
  const goal = { threadId: "query-job", objective: loaded.goal, status: "active", createdAt: 1 };
  await kernel.apply(TOKEN, "query-job", "admit", 0, {
    goal, goal_activation_record: "mock:goal-call", execution_context_record: "mock:actual-context", instruction_read_record: "mock:full-read",
    execution_context: { sandbox_mode: "read-only", approval_policy: "never", network_access: false }, summary: "received", next_action: "inspect",
  });
  await kernel.apply(TOKEN, "query-job", "advance", 1, advanceData(goal));
  await kernel.apply(TOKEN, "query-job", "advance", 2, advanceData(goal, "verify"));
  const fullResult = "# Complete fixed result\n验证记录\n";
  writeFileSync(loaded.result_path, fullResult);
  await kernel.apply(TOKEN, "query-job", "finish", 3, { goal, result_sha256: createHash("sha256").update(fullResult).digest("hex"), summary: "checked result", next_action: "actual return verification", verification_records: [] });
  const next = await connection(manager, f.artifacts, [f.root]);
  try {
    for (const args of [{ dispatch_token: TOKEN }, { job_id: "query-job" }]) {
      const result = await next.client.callTool({ name: "codex_get", arguments: args });
      const d = result.structuredContent as any;
      assert.equal(result.isError, undefined);
      assert.equal(d.job_id, "query-job");
      assert.equal(d.dispatch_token, TOKEN);
      assert.equal(d.thread_status, "active");
      assert.equal(d.last_turn_status, "completed");
      assert.equal(d.goal_status, "unknown");
      assert.equal(d.receiver_status.source, "receiver_file_report");
      assert.equal(d.receiver_status.validation.status, "valid");
      assert.equal(d.receiver_status.record.current_checkpoint, null);
      assert.equal(d.receiver_status.record.revision, 4);
      assert(d.receiver_status.updated_at);
      assert.equal(d.result.text, "# Complete fixed result\n验证记录\n");
      assert.equal(d.result.read_status, "complete");
      assert.equal(d.delivery_gate.status, "passed_structural_checks");
      assert.equal(d.receipt.value.origin.verification, "unverified_at_bridge");
    }
    assert.deepEqual(calls, ["start", "query-job", "query-job"]);
  } finally { await next.close(); }
});

test("unknown creation returns its receipt without inventing a Job or querying", async () => {
  const f = await fixture();
  await new ReceiptStore(f.artifacts).reserve(await new InstructionStore(f.artifacts, [f.root]).load(f.input));
  const c = await connection(noAccess(), f.artifacts, [f.root]);
  try {
    const r = await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } });
    assert.equal(r.structuredContent?.job_id, null);
    assert.equal((r.structuredContent?.receipt as any).value.creation_status, "unknown");
    assert.equal(r.structuredContent?.goal_status, "unknown");
  } finally { await c.close(); }
});

test("native completed turn and a loose result cannot bypass missing/invalid checkpoint status", async () => {
  const f = await fixture();
  const receipts = new ReceiptStore(f.artifacts);
  const record = await receipts.reserve(await new InstructionStore(f.artifacts, [f.root]).load(f.input));
  await receipts.finish(record, { creation_status: "created", job_id: "claimed-complete-job", diagnostic: null });
  writeFileSync(path.join(f.root, TOKEN + ".result.md"), "# Claimed complete\n");
  const c = await connection({
    async start() { throw new Error("No start"); },
    get(job) { return { job_id: job, thread_status: "idle", last_turn_status: "completed", final_message: "claimed complete", native_snapshot: { thread: { id: job }, latestAssistantMessage: { text: "claimed complete" } } }; },
  }, f.artifacts, [f.root]);
  try {
    for (const content of [null, "# status\nAll done"]) {
      if (content !== null) writeFileSync(path.join(f.root, TOKEN + ".status.md"), content);
      const d = (await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } })).structuredContent as any;
      assert.equal(d.delivery_gate.status, "blocked");
      assert.equal(d.result.read_status, "refused");
      assert.equal(d.result.text, undefined);
      assert.equal(d.receiver_status.validation.status, content === null ? "missing" : "invalid");
      assert.equal(d.goal_status, "unknown");
      assert.equal(d.final_message, undefined);
      assert.equal(d.native_snapshot, undefined);
      assert.equal(d.native_message_present, true);
    }
  } finally { await c.close(); }
});

test("legacy Job has native snapshot but no invented file/origin association; native failure retains known receipt", async () => {
  const f = await fixture();
  const manager: DispatchBackend = {
    async start() { return { job_id: "known-job" }; },
    get(job) { if (job === "known-job") throw new Error("native temporarily unavailable"); return { job_id: job, thread_status: "idle", last_turn_status: "completed" }; },
  };
  const c = await connection(manager, f.artifacts, [f.root]);
  try {
    const old = await c.client.callTool({ name: "codex_get", arguments: { job_id: "legacy-job" } });
    assert.equal(old.structuredContent?.receipt, null);
    assert.equal(old.structuredContent?.dispatch_token, null);
    assert.equal(old.structuredContent?.correlation_status, "unavailable");
    await c.client.callTool({ name: "codex_start", arguments: f.input });
    const failed = await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } });
    assert.equal(failed.isError, true);
    assert.equal(failed.structuredContent?.job_id, "known-job");
    assert.match(String(failed.structuredContent?.native_error), /unavailable/);
  } finally { await c.close(); }
});

test("query refuses escaped report paths and oversized output rather than fabricating full results", async () => {
  const f = await fixture();
  const receipts = new ReceiptStore(f.artifacts);
  const record = await receipts.reserve(await new InstructionStore(f.artifacts, [f.root]).load(f.input));
  await receipts.finish(record, { creation_status: "created", job_id: "report-job", diagnostic: null });
  const outside = mkdtempSync(path.join(tmpdir(), "codex-report-outside-"));
  writeFileSync(path.join(outside, TOKEN + ".status.md"), "outside-secret");
  writeFileSync(path.join(outside, "instruction.md"), instructionText(f.metadata));
  const alias = path.join(f.root, "outside-alias");
  symlinkSync(outside, alias, process.platform === "win32" ? "junction" : "dir");
  const altered = (await receipts.get(TOKEN))!;
  altered.value.status_path = path.join(alias, TOKEN + ".status.md");
  writeFileSync(altered.path, JSON.stringify(altered.value));
  writeFileSync(path.join(f.root, TOKEN + ".result.md"), "x".repeat(257 * 1024));
  const c = await connection({ async start() { throw new Error("No start"); }, get(job) { return { job_id: job }; } }, f.artifacts, [f.root]);
  try {
    const d = (await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } })).structuredContent as any;
    assert.equal(d.receiver_status.read_status, "refused");
    assert.equal(d.receiver_status.text, undefined);
    assert.equal(d.result.read_status, "refused");
    assert.equal(d.result.text, undefined);
    // Matching registered path still cannot follow a symlink out of the handoff root.
    const original = { ...altered.value, instruction_file: path.join(alias, "instruction.md"), result_path: path.join(alias, TOKEN + ".result.md") };
    writeFileSync(altered.path, JSON.stringify(original));
    const escaped = (await c.client.callTool({ name: "codex_get", arguments: { dispatch_token: TOKEN } })).structuredContent as any;
    assert.match(escaped.receiver_status.error, /escapes/);
  } finally { await c.close(); }
});

test("unclassified backend error stays unknown despite diagnostic claiming no creation", async () => {
  const f = await fixture();
  let starts = 0;
  const c = await connection({ async start() { starts++; throw new Error("no task created"); }, get() { throw new Error("No query"); } }, f.artifacts, [f.root]);
  try {
    const r = await c.client.callTool({ name: "codex_start", arguments: f.input });
    assert.equal(r.structuredContent?.creation_status, "unknown");
    assert.match(String(r.structuredContent?.error), /^Creation outcome is unknown/);
    assert.equal(starts, 1);
  } finally { await c.close(); }
});

test("artifact cleanup error remains explicit and never accesses native backend", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "codex-artifact-error-"));
  let failed = false;
  const artifacts = new ArtifactStore(root, undefined, {
    link, async unlink(file) {
      if (!failed && file.endsWith(".tmp")) { failed = true; throw Object.assign(new Error("forced unlink failure"), { code: "EACCES" }); }
      await unlink(file);
    },
  });
  const c = await connection(noAccess(), artifacts, [root]);
  try {
    const r = await c.client.callTool({ name: "artifact_put", arguments: { filename: "error.md", content: "body" } });
    assert.equal(r.isError, true);
    assert.match(String(r.structuredContent?.error), /Rollback attempted; possible residual paths: none/);
    assert.deepEqual(readdirSync(root), []);
  } finally { await c.close(); }
});
