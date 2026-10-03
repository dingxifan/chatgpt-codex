import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DesktopCodex, type NativeCall } from "../src/desktop.js";

function fixture(failNavigation = false) {
  const root = mkdtempSync(path.join(tmpdir(), "desktop-bridge-"));
  const workspace = path.join(root, "project"); mkdirSync(workspace);
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const call: NativeCall = async (name, args) => {
    calls.push({ name, args });
    if (name === "list_projects") return { projects: [{ projectId: "local-project", projectKind: "local", hostId: "local", path: workspace }] };
    if (name === "create_thread") return { threadId: "native-thread" };
    if (name === "navigate_to_codex_page") { if (failNavigation) throw new Error("window unavailable"); return { navigated: true }; }
    if (name === "wait_threads") return { polls: [{ latestTurn: { status: "completed" }, latestAssistantMessage: { text: "RESULT_SHA: fixed" } }] };
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
  assert.deepEqual(await desktop.get("native-thread"), { job_id: "native-thread", status: "completed", final_message: "RESULT_SHA: fixed" });
  assert.deepEqual(calls, [{ name: "wait_threads", args: { targets: [{threadId:"native-thread",hostId:"local"}],timeoutMs:0 } }]);
});

test("missing desktop context fails closed, without starting an execution server", async () => {
  const original = process.env.CODEX_APP_TOOLS_SERVER;
  delete process.env.CODEX_APP_TOOLS_SERVER;
  try { await assert.rejects(new DesktopCodex([], 1000).initialize(), /Launch Bridge from Codex desktop/); }
  finally { if (original !== undefined) process.env.CODEX_APP_TOOLS_SERVER = original; }
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
