import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DesktopCodex, DispatchError, NativeCallNotSubmittedError, parseNativeResult, type NativeCall } from "../src/desktop.js";

function fixture(failNavigation = false) {
  const root = mkdtempSync(path.join(tmpdir(), "desktop-bridge-"));
  const workspace = path.join(root, "project"); mkdirSync(workspace);
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const call: NativeCall = async (name, args) => {
    calls.push({ name, args });
    if (name === "list_projects") return { projects: [{ projectId: "local-project", projectKind: "local", hostId: "local", path: workspace }] };
    if (name === "create_thread") return { threadId: "native-thread" };
    if (name === "navigate_to_codex_page") { if (failNavigation) throw new Error("window unavailable"); return { navigated: true }; }
    if (name === "wait_threads") return { polls: [{ thread: { status: { type: "active" } }, latestTurn: { status: "completed", completedAt: "2026-10-09T12:00:00Z" }, latestAssistantMessage: { text: "RESULT_SHA: fixed" } }] };
    throw new Error(`Unexpected native operation ${name}`);
  };
  return { root, workspace, calls, desktop: new DesktopCodex([root], 1000, call) };
}

test("dispatch creates a native task, preserves prompt and displays it without tracking", async () => {
  const { workspace, calls, desktop } = fixture();
  const prompt = "读取已有文件，自主执行。Return using Codex's existing capability; do not add a callback.";
  assert.deepEqual(await desktop.start(workspace, prompt), { job_id: "native-thread" });
  assert.deepEqual(calls.map(c => c.name), ["list_projects", "create_thread", "navigate_to_codex_page"]);
  assert.deepEqual(calls[1]?.args, { prompt, target: { type: "project", projectId: "local-project", environment: { type: "local" } } });
  assert.equal("model" in calls[1]!.args, false);
});

test("workspace denial happens before any native app call", async () => {
  const { calls, desktop } = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), "desktop-outside-"));
  await assert.rejects(desktop.start(outside, "task"), /allowed roots/);
  assert.deepEqual(calls, []);
});

test("unsaved directories are not enrolled, redirected or sent to a private server", async () => {
  const { root, calls, desktop } = fixture();
  const unsaved = path.join(root, "unsaved"); mkdirSync(unsaved);
  await assert.rejects(desktop.start(unsaved, "task"), /does not match a local project path exposed/);
  assert.deepEqual(calls.map(c=>c.name), ["list_projects"]);
});

test("navigation failure preserves the accepted task id and never creates a duplicate", async () => {
  const { workspace, calls, desktop } = fixture(true);
  const result = await desktop.start(workspace, "task");
  assert.equal(result.job_id, "native-thread");
  assert.match(result.warning!, /do not redispatch/);
  assert.equal(calls.filter(c=>c.name === "create_thread").length, 1);
});

test("explicit query reads one immediate native snapshot without waiting or polling", async () => {
  const { calls, desktop } = fixture();
  const result = await desktop.get("native-thread");
  assert.equal(result.thread_status, "active");
  assert.equal(result.status, "active");
  assert.equal(result.last_turn_status, "completed");
  assert.equal(result.last_turn_time, "2026-10-09T12:00:00Z");
  assert.equal(result.goal_status, "unknown");
  assert.equal(result.final_message, "RESULT_SHA: fixed");
  assert.equal(typeof result.observed_at, "string");
  assert.deepEqual(calls, [{ name: "wait_threads", args: { targets: [{threadId:"native-thread",hostId:"local"}],timeoutMs:0 } }]);
});

test("missing desktop context fails closed, without starting an execution server", async () => {
  const original = process.env.CODEX_APP_TOOLS_SERVER;
  delete process.env.CODEX_APP_TOOLS_SERVER;
  try { await assert.rejects(new DesktopCodex([], 1000).initialize(), /Launch Bridge from Codex desktop/); }
  finally { if (original !== undefined) process.env.CODEX_APP_TOOLS_SERVER = original; }
});

test("explicit snapshot identity mismatch is rejected instead of reporting another window", async () => {
  for (const thread of [{ id: "other-job", hostId: "local" }, { id: "requested-job", hostId: "other-host" }]) {
    const desktop = new DesktopCodex([], 1000, async name => {
      assert.equal(name, "wait_threads");
      return { polls: [{ thread, latestTurn: { status: "completed" } }] };
    });
    await assert.rejects(desktop.get("requested-job"), /different (thread identity|host)/);
  }
});

test("every dispatch refreshes desktop projects, including after a rejected lookup", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "desktop-refresh-"));
  const workspace = path.join(root, "project"); mkdirSync(workspace);
  let projects: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const desktop = new DesktopCodex([root], 1000, async (name) => {
    calls.push(name);
    if (name === "list_projects") return { projects };
    if (name === "create_thread") return { threadId: "accepted" };
    if (name === "navigate_to_codex_page") return {};
    throw new Error(`Unexpected operation ${name}`);
  });
  await assert.rejects(desktop.start(workspace, "task"), /list_projects/);
  projects = [{ projectId: "added", projectKind: "local", hostId: "local", path: workspace }];
  assert.deepEqual(await desktop.start(workspace, "task"), { job_id: "accepted" });
  projects = [];
  await assert.rejects(desktop.start(workspace, "task"), /list_projects/);
  assert.deepEqual(calls, ["list_projects", "list_projects", "create_thread", "navigate_to_codex_page", "list_projects"]);
});

test("an unexposed additional root or distinct worktree never redirects to a primary path", async () => {
  const { root, desktop, calls } = fixture();
  const additional = path.join(root, "additional-root"); mkdirSync(additional);
  await assert.rejects(desktop.start(additional, "task"), /additional roots.*create_thread cannot select a root\/cwd/);
  assert.deepEqual(calls.map(c => c.name), ["list_projects"]);
});

test("Windows saved project paths match case, separators, trailing slash and junction aliases", { skip: process.platform !== "win32" }, async () => {
  const { root, workspace, desktop, calls } = fixture();
  const { symlinkSync } = await import("node:fs");
  const alias = path.join(root, "alias");
  symlinkSync(workspace, alias, "junction");
  for (const input of [workspace.toUpperCase(), workspace.replaceAll("\\", "/") + "/", alias]) {
    assert.deepEqual(await desktop.start(input, "task"), { job_id: "native-thread" });
  }
  assert.equal(calls.filter(c => c.name === "list_projects").length, 3);
  assert.equal(calls.some(c => c.name === "wait_threads"), false);
});

test("multiple normalized saved-project matches are rejected before creation", async () => {
  const { root, workspace } = fixture();
  const { symlinkSync } = await import("node:fs");
  const alias = path.join(root, "alias");
  symlinkSync(workspace, alias, process.platform === "win32" ? "junction" : "dir");
  for (const spelling of [workspace + path.sep, alias, ...(process.platform === "win32" ? [workspace.toUpperCase().replaceAll("\\", "/")] : [])]) {
    const calls: string[] = [];
    const desktop = new DesktopCodex([root], 1000, async name => {
      calls.push(name);
      if (name === "list_projects") return { projects: [workspace, spelling].map((saved, index) => ({ projectId: `project-${index}`, projectKind: "local", hostId: "local", path: saved })) };
      throw new Error("ambiguous lookup must not create or query");
    });
    await assert.rejects(desktop.start(workspace, "task"), error => error instanceof DispatchError && error.creation_status === "not_created" && /multiple local/.test(error.message));
    assert.deepEqual(calls, ["list_projects"]);
  }
});

test("lookup failure or invalid project identity is a confirmed pre-submit rejection", async () => {
  const { root, workspace } = fixture();
  for (const response of ["disconnect", { projects: null }, { projects: [{ projectKind: "local", hostId: "local", path: workspace }] }]) {
    const calls: string[] = [];
    const desktop = new DesktopCodex([root], 1000, async name => {
      calls.push(name);
      if (response === "disconnect") throw new Error("list transport disconnected");
      return response;
    });
    await assert.rejects(desktop.start(workspace, "task"), error => error instanceof DispatchError && error.error_code === "DISPATCH_REJECTED" && error.creation_status === "not_created");
    assert.deepEqual(calls, ["list_projects"]);
  }
});

for (const fault of ["timeout", "disconnect", "invalid-json", "native-error", "array-json", "missing-id", "pending-id", "conflicting-id"] as const) test(`submitted ${fault} is unknown and never automatically retried`, async () => {
  const { root, workspace } = fixture();
  const calls: string[] = [];
  const desktop = new DesktopCodex([root], 1000, async name => {
    calls.push(name);
    if (name === "list_projects") return { projects: [{ projectId: "p", projectKind: "local", hostId: "local", path: workspace }] };
    assert.equal(name, "create_thread");
    if (fault === "timeout" || fault === "disconnect") throw new Error(fault);
    if (fault === "missing-id") return {};
    if (fault === "pending-id") return { clientThreadId: "setup-in-progress" };
    if (fault === "conflicting-id") return parseNativeResult(name, { structuredContent: { threadId: "structured-id" }, content: [{ type: "text", text: '{"threadId":"different-id"}' }] });
    return parseNativeResult(name, { isError: fault === "native-error", content: [{ type: "text", text: fault === "array-json" ? "[]" : "invalid response" }] });
  });
  await assert.rejects(desktop.start(workspace, "task"), error => error instanceof DispatchError && error.creation_status === "unknown" && error.error_code === "DISPATCH_OUTCOME_UNKNOWN" && /Do not redispatch automatically/.test(error.message));
  assert.deepEqual(calls, ["list_projects", "create_thread"]);
});

test("native disconnected-before-send marker preserves not-created classification", async () => {
  const { root, workspace } = fixture();
  const desktop = new DesktopCodex([root], 1000, async name => {
    if (name === "list_projects") return { projects: [{ projectId: "p", projectKind: "local", hostId: "local", path: workspace }] };
    throw new NativeCallNotSubmittedError("not connected before sending create_thread");
  });
  await assert.rejects(desktop.start(workspace, "task"), error => error instanceof DispatchError && error.creation_status === "not_created");
});

test("usable structured native acknowledgement preserves the confirmed identity", () => {
  assert.deepEqual(parseNativeResult("create_thread", { content: [{ type: "text", text: "Action completed." }], structuredContent: { threadId: "confirmed" } }), { threadId: "confirmed" });
  assert.deepEqual(parseNativeResult("create_thread", { content: [{ type: "text", text: '{"threadId":"legacy-confirmed"}' }] }), { threadId: "legacy-confirmed" });
  assert.deepEqual(parseNativeResult("create_thread", { structuredContent: { threadId: "confirmed" }, content: [{ type: "text", text: '{"threadId":"confirmed"}' }] }), { threadId: "confirmed" });
});
